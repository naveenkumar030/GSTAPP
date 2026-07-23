import os
from fastapi import APIRouter, Request
from utils import get_user_email
from database import recon_results_col

router = APIRouter()

# Map reconciliation status → graph link type & fraud label shown in UI
STATUS_TO_LINK = {
    "Duplicate": "DUPLICATE",
    "Missing":   "MISSING_GSTR2B",
    "Partial":   "MISMATCH",
    "Exact":     "CONNECTED_TO",
}

STATUS_TO_FRAUD_TYPE = {
    "Duplicate": "Duplicate Invoice",
    "Missing":   "Missing GSTR2B",
    "Partial":   "Tax Mismatch",
    "Exact":     "",
}


STATE_MAP = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
    "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
    "97": "Other Territory"
}


@router.get("/data")
async def get_graph_data(request: Request):
    """
    Build a fraud-focused graph from the user's reconciliation results.

    Nodes  : Supplier (Supplier / HighRisk), Invoice, central Buyer company
    Links  : DUPLICATE | MISMATCH | MISSING_GSTR2B | CONNECTED_TO
             — types that FraudGraph.jsx can colour and filter on
    """
    user_email = get_user_email(request)
    nodes: dict[str, dict] = {}
    links: list[dict] = []

    cursor = recon_results_col.find({"user_email": user_email})
    results = await cursor.to_list(length=2000)

    if not results:
        return {"nodes": [], "links": []}

    # ── Pre-aggregate metrics per supplier and buyer ───────────────────────────
    supplier_metrics = {}
    total_invoices_count = 0
    total_tax_amount = 0.0

    for r in results:
        supplier_id  = str(r.get("gstin") or "UNKNOWN_GSTIN").strip()
        pr_tax       = float(r.get("prTax", 0) or 0)
        
        # Buyer totals
        total_invoices_count += 1
        total_tax_amount += pr_tax

        # Supplier metrics
        if supplier_id not in supplier_metrics:
            supplier_metrics[supplier_id] = {
                "invoice_count": 0,
                "tax_amount": 0.0,
                "latest_date": ""
            }
        
        metrics = supplier_metrics[supplier_id]
        metrics["invoice_count"] += 1
        metrics["tax_amount"] += pr_tax
        
        date_str = str(r.get("date", "") or "").strip()
        if date_str:
            if not metrics["latest_date"] or date_str > metrics["latest_date"]:
                metrics["latest_date"] = date_str

    # ── Central buyer node ───────────────────────────────────────────────────
    main_id = "USER_COMPANY"
    nodes[main_id] = {
        "id":           main_id,
        "label":        "Taxpayer", # maps to Company labelType
        "name":         "My Company (Buyer)",
        "gstin":        "27MYCOMP1234A1Z1",
        "state":        "Maharashtra",
        "invoiceCount": total_invoices_count,
        "taxAmount":    f"₹{total_tax_amount:,.2f}",
        "itcClaimed":   f"₹{total_tax_amount:,.2f}",
        "riskScore":    0,
    }

    # Track GSTINs that appear as invoice numbers (circular-trading heuristic)
    all_invoice_nos: set[str] = set()
    all_supplier_ids: set[str] = set()

    for r in results:
        invoice_no = str(r.get("id") or r.get("invoice_no") or "").strip()
        if invoice_no:
            all_invoice_nos.add(invoice_no.upper())

    for r in results:
        supplier_id  = str(r.get("gstin") or "UNKNOWN_GSTIN").strip()
        invoice_no   = str(r.get("id") or r.get("invoice_no") or "UNKNOWN_INV").strip()
        score        = int(r.get("score", 0))
        status       = r.get("status", "Exact")
        supplier     = r.get("supplier", supplier_id)
        diff         = float(r.get("diff", 0) or 0)
        ai_conf      = int(r.get("conf", 0) or 0)
        date         = str(r.get("date", "") or "")
        pr_tax       = float(r.get("prTax", 0) or 0)

        fraud_type   = r.get("fraudType") or STATUS_TO_FRAUD_TYPE.get(status, "")
        link_type    = STATUS_TO_LINK.get(status, "CONNECTED_TO")
        if r.get("fraudType") and status == "Exact":
            link_type = "SUSPICIOUS"

        all_supplier_ids.add(supplier_id.upper())

        metrics = supplier_metrics.get(supplier_id, {"invoice_count": 1, "tax_amount": pr_tax, "latest_date": date})
        state_code = supplier_id[:2] if len(supplier_id) >= 2 and supplier_id[:2].isdigit() else ""
        state_name = STATE_MAP.get(state_code, f"State Code {state_code}" if state_code else "Unknown")
        tax_amount_formatted = f"₹{metrics['tax_amount']:,.2f}"

        # ── Supplier node ────────────────────────────────────────────────────
        if supplier_id not in nodes:
            nodes[supplier_id] = {
                "id":           supplier_id,
                "label":        "HighRisk" if (score >= 70 or r.get("fraudType")) else "Supplier",
                "name":         supplier,
                "gstin":        supplier_id,
                "riskScore":    score,
                "aiConf":       ai_conf,
                "fraudType":    fraud_type,
                "amount":       tax_amount_formatted,
                "date":         metrics["latest_date"] or date,
                "state":        state_name,
                "invoiceCount": metrics["invoice_count"],
                "taxAmount":    tax_amount_formatted,
                "itcClaimed":   tax_amount_formatted,
                "taxDiff":      f"₹{diff:,.2f}" if diff else None,
            }
        else:
            existing = nodes[supplier_id]
            # Keep the worst (highest) risk score across multiple invoices
            if score > existing.get("riskScore", 0):
                existing["riskScore"] = score
                existing["aiConf"]    = ai_conf
                existing["fraudType"] = fraud_type
                existing["taxDiff"]   = f"₹{diff:,.2f}" if diff else existing.get("taxDiff")
            if score >= 70 or r.get("fraudType"):
                existing["label"] = "HighRisk"

        # ── Invoice node (only for flagged statuses or fraud checked) ─────────
        inv_node_id = f"INV_{supplier_id}_{invoice_no}"

        if status in ("Duplicate", "Partial", "Missing") or r.get("fraudType"):
            if inv_node_id not in nodes:
                nodes[inv_node_id] = {
                    "id":        inv_node_id,
                    "label":     "Invoice",
                    "name":      invoice_no,
                    "gstin":     supplier_id,
                    "riskScore": score,
                    "fraudType": fraud_type,
                    "amount":    f"₹{pr_tax:,.2f}",
                    "gstAmount": f"₹{diff:,.2f}" if diff else "₹0.00",
                    "date":      date,
                    "aiConf":    ai_conf,
                    "taxDiff":   f"₹{diff:,.2f}" if diff else None,
                    "status":    status,
                }

            # Supplier ──[DUPLICATE/MISMATCH/MISSING_GSTR2B]──► Invoice
            links.append({"source": supplier_id, "target": inv_node_id, "type": link_type})
            # Invoice ──[CONNECTED_TO]──► Buyer
            links.append({"source": inv_node_id, "target": main_id,      "type": "CONNECTED_TO"})

        else:
            # Exact match — just connect supplier → buyer
            links.append({"source": supplier_id, "target": main_id, "type": "CONNECTED_TO"})

    # ── Circular trading heuristic ───────────────────────────────────────────
    # If a supplier's GSTIN matches another supplier's invoice number, it's
    # a potential circular chain.
    for supplier_id in list(nodes.keys()):
        if supplier_id in (main_id,):
            continue
        if supplier_id.upper() in all_invoice_nos and supplier_id.upper() in all_supplier_ids:
            # Find the other supplier whose invoice_no equals this GSTIN
            for other_id in list(nodes.keys()):
                if other_id != supplier_id and other_id != main_id:
                    links.append({
                        "source": supplier_id,
                        "target": other_id,
                        "type":   "CIRCULAR_TRADING",
                    })
                    for nid in (supplier_id, other_id):
                        if nid in nodes:
                            nodes[nid]["label"]     = "HighRisk"
                            nodes[nid]["fraudType"] = "Circular Trading"
                            nodes[nid]["riskScore"]  = max(nodes[nid].get("riskScore", 0), 85)
                    break   # one circular link per supplier is enough

    return {
        "nodes": list(nodes.values()),
        "links": links,
    }
