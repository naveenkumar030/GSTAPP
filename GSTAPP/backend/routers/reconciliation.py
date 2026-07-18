"""
Reconciliation Router
Handles:
  - POST /api/reconciliation/upload  — upload Purchase Register (xlsx/csv) and/or GSTR-2B (json)
  - POST /api/reconciliation/run     — run matching engine on uploaded files
  - GET  /api/reconciliation/results — paginated reconciliation results
  - GET  /api/reconciliation/summary — aggregate counts
  - GET  /api/reconciliation/uploads — recent upload history
"""

import os
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import JSONResponse

import openpyxl
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from utils import upload_file_to_s3_async, get_user_email

# ── Environment ───────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set")

client = AsyncIOMotorClient(
    MONGODB_URI,
    tlsAllowInvalidCertificates=True,
    tlsAllowInvalidHostnames=True,
    serverSelectionTimeoutMS=30000,
)
try:
    db = client.get_default_database()
except Exception:
    db = client.get_database("gstrecounciliation_user")

recon_results_col = db.reconciliation_results
recon_runs_col    = db.reconciliation_runs
uploads_col       = db.uploads

router = APIRouter()
logger = logging.getLogger(__name__)


def utcnow():
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
# Parsing helpers
# ─────────────────────────────────────────────────────────────────────────────

def parse_purchase_register_xlsx(file_bytes: bytes) -> list[dict]:
    """Parse an Excel Purchase Register file into a list of invoice dicts."""
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    # Normalise header names
    raw_headers = [str(h).strip().lower() if h else "" for h in rows[0]]

    FIELD_MAP = {
        "supplier name":   "supplier",
        "supplier":        "supplier",
        "gstin":           "gstin",
        "gstin of supplier": "gstin",
        "invoice no":      "invoice_no",
        "invoice no.":     "invoice_no",
        "invoice number":  "invoice_no",
        "date":            "date",
        "invoice date":    "date",
        "taxable value":   "taxable_value",
        "taxable amount":  "taxable_value",
        "tax amount":      "tax_amount",
        "tax":             "tax_amount",
        "igst":            "igst",
        "cgst":            "cgst",
        "sgst":            "sgst",
    }

    headers = [FIELD_MAP.get(h, h) for h in raw_headers]

    invoices = []
    for row in rows[1:]:
        if all(v is None for v in row):
            continue
        record = {}
        for i, val in enumerate(row):
            if i < len(headers):
                record[headers[i]] = val
        # Build a unified tax_amount if not present
        if "tax_amount" not in record or record.get("tax_amount") is None:
            igst  = float(record.get("igst") or 0)
            cgst  = float(record.get("cgst") or 0)
            sgst  = float(record.get("sgst") or 0)
            record["tax_amount"] = igst + cgst + sgst
        try:
            record["tax_amount"] = float(record.get("tax_amount") or 0)
        except (ValueError, TypeError):
            record["tax_amount"] = 0.0
        try:
            record["taxable_value"] = float(record.get("taxable_value") or 0)
        except (ValueError, TypeError):
            record["taxable_value"] = 0.0

        # Convert date to string
        date_val = record.get("date")
        if hasattr(date_val, "strftime"):
            record["date"] = date_val.strftime("%d %b %Y")
        elif date_val:
            record["date"] = str(date_val)
        else:
            record["date"] = ""

        if record.get("gstin") and record.get("invoice_no"):
            invoices.append(record)

    return invoices


def parse_purchase_register_csv(file_bytes: bytes) -> list[dict]:
    """Parse a CSV Purchase Register."""
    import csv
    content = file_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(content))
    invoices = []
    FIELD_MAP = {
        "supplier name":   "supplier",
        "gstin":           "gstin",
        "invoice no":      "invoice_no",
        "invoice no.":     "invoice_no",
        "date":            "date",
        "taxable value":   "taxable_value",
        "tax amount":      "tax_amount",
    }
    for row in reader:
        rec = {}
        for k, v in row.items():
            mapped = FIELD_MAP.get(k.strip().lower(), k.strip().lower())
            rec[mapped] = v.strip() if v else ""
        try:
            rec["tax_amount"] = float(rec.get("tax_amount") or 0)
        except (ValueError, TypeError):
            rec["tax_amount"] = 0.0
        try:
            rec["taxable_value"] = float(rec.get("taxable_value") or 0)
        except (ValueError, TypeError):
            rec["taxable_value"] = 0.0
        if rec.get("gstin") and rec.get("invoice_no"):
            invoices.append(rec)
    return invoices


def parse_gstr2b_json(file_bytes: bytes) -> list[dict]:
    """
    Parse GSTR-2B JSON (GST Portal standard format).
    Handles both the full portal format and simplified formats.
    """
    data = json.loads(file_bytes.decode("utf-8", errors="replace"))
    invoices = []

    # Standard GST portal GSTR-2B format
    try:
        b2b_sections = (
            data.get("data", {})
                .get("docdata", {})
                .get("b2b", [])
        )
    except Exception:
        b2b_sections = []

    if b2b_sections:
        for supplier in b2b_sections:
            gstin   = supplier.get("ctin", "")
            sup_name = supplier.get("trdnm", "")
            for inv in supplier.get("inv", []):
                inv_no  = inv.get("inum", "")
                inv_date = inv.get("idt", "")
                taxable = float(inv.get("val", 0) or 0)
                tax_amount = 0.0
                for item in inv.get("items", []):
                    tax_amount += float(item.get("igst", 0) or 0)
                    tax_amount += float(item.get("cgst", 0) or 0)
                    tax_amount += float(item.get("sgst", 0) or 0)
                if gstin and inv_no:
                    invoices.append({
                        "supplier": sup_name,
                        "gstin":    gstin,
                        "invoice_no": inv_no,
                        "date":     inv_date,
                        "taxable_value": taxable,
                        "tax_amount": tax_amount,
                    })
        return invoices

    # Simplified / flat format: list of invoice objects at root or under a key
    if isinstance(data, list):
        raw_list = data
    elif isinstance(data, dict):
        # Try common wrapper keys
        for key in ("invoices", "b2b", "data", "records"):
            if isinstance(data.get(key), list):
                raw_list = data[key]
                break
        else:
            raw_list = [data]
    else:
        return []

    FIELD_MAP = {
        "gstin":       "gstin",
        "ctin":        "gstin",
        "supplier":    "supplier",
        "trdnm":       "supplier",
        "invoice_no":  "invoice_no",
        "inum":        "invoice_no",
        "date":        "date",
        "idt":         "date",
        "tax_amount":  "tax_amount",
        "igst":        "tax_amount",
        "taxable_value": "taxable_value",
        "val":         "taxable_value",
    }

    for item in raw_list:
        rec = {}
        for k, v in item.items():
            mapped = FIELD_MAP.get(k.strip().lower() if isinstance(k, str) else k, k)
            rec[mapped] = v
        try:
            rec["tax_amount"] = float(rec.get("tax_amount") or 0)
        except (ValueError, TypeError):
            rec["tax_amount"] = 0.0
        try:
            rec["taxable_value"] = float(rec.get("taxable_value") or 0)
        except (ValueError, TypeError):
            rec["taxable_value"] = 0.0
        if rec.get("gstin") and rec.get("invoice_no"):
            invoices.append(rec)

    return invoices


# ─────────────────────────────────────────────────────────────────────────────
# Reconciliation engine
# ─────────────────────────────────────────────────────────────────────────────

def run_matching_engine(pr_invoices: list[dict], g2b_invoices: list[dict]) -> list[dict]:
    """
    Match Purchase Register invoices against GSTR-2B records.

    Match key: (GSTIN, Invoice No.) — case-insensitive, stripped.
    Status:
      - Exact:      diff == 0
      - Partial:    diff > 0 but GSTIN+invoice_no matched
      - Missing:    invoice present in PR but absent in G2B
      - Duplicate:  same invoice_no+gstin appears more than once in PR
    """
    # Build G2B lookup
    g2b_lookup: dict[tuple, dict] = {}
    for inv in g2b_invoices:
        key = (str(inv.get("gstin", "")).strip().upper(),
               str(inv.get("invoice_no", "")).strip().upper())
        g2b_lookup[key] = inv

    # Detect duplicates in PR
    pr_key_count: dict[tuple, int] = {}
    for inv in pr_invoices:
        key = (str(inv.get("gstin", "")).strip().upper(),
               str(inv.get("invoice_no", "")).strip().upper())
        pr_key_count[key] = pr_key_count.get(key, 0) + 1

    results = []
    seen_keys: dict[tuple, int] = {}

    for inv in pr_invoices:
        key = (str(inv.get("gstin", "")).strip().upper(),
               str(inv.get("invoice_no", "")).strip().upper())
        seen_keys[key] = seen_keys.get(key, 0) + 1

        pr_tax = float(inv.get("tax_amount") or 0)
        g2b_match = g2b_lookup.get(key)
        g2b_tax   = float(g2b_match.get("tax_amount") or 0) if g2b_match else 0.0
        diff      = round(abs(pr_tax - g2b_tax), 2)

        # Fraud risk score heuristic
        score = 5  # default low risk
        if pr_key_count[key] > 1:
            status = "Duplicate"
            score  = min(50 + pr_key_count[key] * 10, 90)
        elif g2b_match is None:
            status = "Missing"
            score  = min(40 + int(pr_tax / 10000), 85)
        elif diff == 0:
            status = "Exact"
            score  = 5
        else:
            status = "Partial"
            pct_diff = (diff / pr_tax * 100) if pr_tax else 0
            score = min(int(pct_diff * 1.5) + 20, 95)

        conf = 100 if status == "Exact" else (0 if status == "Missing" else max(0, 100 - int(diff / max(pr_tax, 1) * 100)))

        results.append({
            "id":        f"{inv.get('invoice_no', '')}",
            "supplier":  inv.get("supplier", "Unknown"),
            "gstin":     str(inv.get("gstin", "")),
            "date":      str(inv.get("date", "")),
            "prTax":     pr_tax,
            "g2bTax":    g2b_tax,
            "diff":      diff,
            "conf":      conf,
            "score":     score,
            "status":    status,
        })

    return results


def compute_summary(results: list[dict]) -> dict:
    exact = partial = missing = duplicate = 0
    for r in results:
        s = r.get("status", "")
        if s == "Exact":
            exact += 1
        elif s == "Partial":
            partial += 1
        elif s == "Missing":
            missing += 1
        elif s == "Duplicate":
            duplicate += 1
    return {
        "exact":     exact,
        "partial":   partial,
        "missing":   missing,
        "duplicate": duplicate,
        "total":     len(results),
    }


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_files(
    request: Request,
    purchase_register: Optional[UploadFile] = File(None),
    gstr2b: Optional[UploadFile] = File(None),
):
    """
    Accept multipart upload of Purchase Register and/or GSTR-2B files.
    Parses, validates, and stores in MongoDB.
    Returns file metadata and record counts.
    """
    if purchase_register is None and gstr2b is None:
        raise HTTPException(status_code=400, detail="At least one file must be uploaded.")

    user_email = get_user_email(request)
    response = {"uploads": []}

    if purchase_register:
        content = await purchase_register.read()
        filename = purchase_register.filename or ""
        ext = filename.rsplit(".", 1)[-1].lower()

        if ext in ("xlsx", "xls"):
            invoices = parse_purchase_register_xlsx(content)
        elif ext == "csv":
            invoices = parse_purchase_register_csv(content)
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Purchase Register must be .xlsx, .xls, or .csv (got .{ext})"
            )

        if not invoices:
            raise HTTPException(status_code=422, detail="Purchase Register file appears empty or has incorrect column headers.")

        # Upload to S3
        s3_url = await upload_file_to_s3_async(content, filename, purchase_register.content_type, user_email)

        # Store in MongoDB (upsert by run so we keep latest)
        db_set = {
            "user_email": user_email,
            "type":      "purchase_register",
            "filename":  filename,
            "records":   invoices,
            "count":     len(invoices),
            "size":      len(content),
            "uploaded_at": utcnow(),
        }
        if s3_url:
            db_set["s3_url"] = s3_url

        await uploads_col.update_one(
            {"type": "purchase_register", "user_email": user_email},
            {"$set": db_set},
            upsert=True,
        )

        response_item = {
            "type":     "purchase_register",
            "filename": filename,
            "records":  len(invoices),
            "size":     len(content),
            "status":   "success",
        }
        if s3_url:
            response_item["s3_url"] = s3_url
        response["uploads"].append(response_item)

    if gstr2b:
        content = await gstr2b.read()
        filename = gstr2b.filename or ""
        ext = filename.rsplit(".", 1)[-1].lower()

        if ext != "json":
            raise HTTPException(status_code=422, detail="GSTR-2B must be a .json file.")

        invoices = parse_gstr2b_json(content)
        if not invoices:
            raise HTTPException(status_code=422, detail="GSTR-2B file appears empty or has an unrecognised format.")

        # Upload to S3
        s3_url = await upload_file_to_s3_async(content, filename, gstr2b.content_type, user_email)

        db_set = {
            "user_email": user_email,
            "type":      "gstr2b",
            "filename":  filename,
            "records":   invoices,
            "count":     len(invoices),
            "size":      len(content),
            "uploaded_at": utcnow(),
        }
        if s3_url:
            db_set["s3_url"] = s3_url

        await uploads_col.update_one(
            {"type": "gstr2b", "user_email": user_email},
            {"$set": db_set},
            upsert=True,
        )

        response_item = {
            "type":     "gstr2b",
            "filename": filename,
            "records":  len(invoices),
            "size":     len(content),
            "status":   "success",
        }
        if s3_url:
            response_item["s3_url"] = s3_url
        response["uploads"].append(response_item)

    return response


@router.post("/run")
async def run_reconciliation(request: Request):
    """
    Run the reconciliation engine on previously uploaded files.
    Stores results in MongoDB.
    Returns aggregate summary.
    """
    user_email = get_user_email(request)
    pr_doc  = await uploads_col.find_one({"type": "purchase_register", "user_email": user_email})
    g2b_doc = await uploads_col.find_one({"type": "gstr2b", "user_email": user_email})

    if not pr_doc:
        raise HTTPException(status_code=400, detail="Purchase Register not uploaded. Please upload it first.")
    if not g2b_doc:
        raise HTTPException(status_code=400, detail="GSTR-2B data not uploaded. Please upload it first.")

    pr_invoices  = pr_doc.get("records", [])
    g2b_invoices = g2b_doc.get("records", [])

    results = run_matching_engine(pr_invoices, g2b_invoices)
    for r in results:
        r["user_email"] = user_email

    summary = compute_summary(results)

    # Persist results
    await recon_results_col.delete_many({"user_email": user_email})
    if results:
        await recon_results_col.insert_many(results)

    # Store run metadata
    await recon_runs_col.insert_one({
        "user_email": user_email,
        "run_at":  utcnow(),
        "summary": summary,
    })

    return {
        "message": "Reconciliation completed successfully.",
        "summary": summary,
    }


@router.get("/results")
async def get_results(
    request: Request,
    page:   int = Query(1, ge=1),
    limit:  int = Query(50, ge=1, le=500),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Return paginated reconciliation results.
    Supports filtering by status and searching by supplier/GSTIN/invoice.
    """
    user_email = get_user_email(request)
    query: dict = {"user_email": user_email}
    if status and status.lower() != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"supplier": {"$regex": search, "$options": "i"}},
            {"gstin":    {"$regex": search, "$options": "i"}},
            {"id":       {"$regex": search, "$options": "i"}},
        ]

    total  = await recon_results_col.count_documents(query)
    skip   = (page - 1) * limit
    cursor = recon_results_col.find(query, {"_id": 0}).skip(skip).limit(limit)
    items  = await cursor.to_list(length=limit)

    return {
        "total":   total,
        "page":    page,
        "limit":   limit,
        "results": items,
    }


@router.get("/summary")
async def get_summary(request: Request):
    """
    Return aggregate reconciliation counts from the last run.
    """
    user_email = get_user_email(request)
    last_run = await recon_runs_col.find_one({"user_email": user_email}, {"_id": 0}, sort=[("run_at", -1)])
    if last_run:
        return last_run.get("summary", {
            "exact": 0, "partial": 0, "missing": 0, "duplicate": 0, "total": 0
        })

    # Fall back to counting the live results collection
    pipeline = [
        {"$match": {"user_email": user_email}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    cursor = recon_results_col.aggregate(pipeline)
    rows = await cursor.to_list(length=100)
    counts = {"exact": 0, "partial": 0, "missing": 0, "duplicate": 0, "total": 0}
    status_map = {"Exact": "exact", "Partial": "partial", "Missing": "missing", "Duplicate": "duplicate"}
    for row in rows:
        key = status_map.get(row["_id"], "")
        if key:
            counts[key] = row["count"]
    counts["total"] = sum(counts[k] for k in ("exact", "partial", "missing", "duplicate"))
    return counts


@router.get("/uploads")
async def get_uploads(request: Request):
    """Return the list of recently uploaded files."""
    user_email = get_user_email(request)
    cursor = uploads_col.find({"user_email": user_email}, {"_id": 0, "records": 0}).sort("uploaded_at", -1)
    items  = await cursor.to_list(length=20)
    # Convert datetimes to ISO strings for JSON
    for item in items:
        if hasattr(item.get("uploaded_at"), "isoformat"):
            item["uploaded_at"] = item["uploaded_at"].isoformat()
    return {"uploads": items}
