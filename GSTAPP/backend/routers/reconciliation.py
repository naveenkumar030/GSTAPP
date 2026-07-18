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
from utils import upload_file_to_s3_async, download_file_from_s3_async, delete_file_from_s3_async, get_user_email
from neo4j import GraphDatabase

# ── Environment ───────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE")

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
        # Combine IGST, CGST, SGST if tax_amount is not set or is 0
        if not rec.get("tax_amount"):
            try:
                igst = float(rec.get("igst") or 0)
                cgst = float(rec.get("cgst") or 0)
                sgst = float(rec.get("sgst") or 0)
                rec["tax_amount"] = igst + cgst + sgst
            except (ValueError, TypeError):
                pass
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
                items = inv.get("items") or inv.get("itms") or []
                for item in items:
                    # Try direct tax_amount first
                    item_tax = float(item.get("tax_amount") or item.get("tax_amt") or item.get("tax") or 0)
                    if item_tax > 0:
                        tax_amount += item_tax
                    else:
                        tax_amount += float(item.get("igst") or item.get("iamt") or 0)
                        tax_amount += float(item.get("cgst") or item.get("camt") or 0)
                        tax_amount += float(item.get("sgst") or item.get("samt") or 0)
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
        # Combine IGST, CGST, SGST if tax_amount is not set or is 0
        if not rec.get("tax_amount"):
            try:
                igst = float(rec.get("igst") or 0)
                cgst = float(rec.get("cgst") or 0)
                sgst = float(rec.get("sgst") or 0)
                rec["tax_amount"] = igst + cgst + sgst
            except (ValueError, TypeError):
                pass
        try:
            rec["taxable_value"] = float(rec.get("taxable_value") or 0)
        except (ValueError, TypeError):
            rec["taxable_value"] = 0.0
        if rec.get("gstin") and rec.get("invoice_no"):
            invoices.append(rec)

    return invoices


def check_gstins_in_neo4j(gstins: list[str]) -> dict:
    """
    Query Neo4j for a list of GSTINs and return their risk profiles.
    Supports robust naming conventions (riskScore/risk_score/score, fraudType/fraud_type/reason).
    """
    if not NEO4J_URI or not NEO4J_USERNAME or not NEO4J_PASSWORD:
        logger.warning("Neo4j is not configured in environment variables.")
        return {}

    risk_profiles = {}
    try:
        # Use a short connection timeout to prevent hanging the request if offline
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
            connection_timeout=5.0,
            max_connection_lifetime=30.0
        )
        driver.verify_connectivity()

        # Normalize GSTIN list for query
        gstin_list = [g.strip().upper() for g in gstins if g]
        if not gstin_list:
            driver.close()
            return {}

        db_name = NEO4J_DATABASE or "neo4j"
        with driver.session(database=db_name) as session:
            # Query matching nodes by gstin, id, or name case-insensitively, coalescing naming conventions
            query = """
            UNWIND $gstins AS gstin_val
            MATCH (n)
            WHERE toUpper(n.gstin) = toUpper(gstin_val) 
               OR toUpper(n.id) = toUpper(gstin_val) 
               OR toUpper(n.name) = toUpper(gstin_val) 
               OR toUpper(n.GSTIN) = toUpper(gstin_val)
            RETURN gstin_val AS input_gstin, labels(n) as labels, 
                   coalesce(n.riskScore, n.risk_score, n.score) as riskScore, 
                   coalesce(n.fraudType, n.fraud_type, n.reason) as fraudType, 
                   n.name as name
            LIMIT 1000
            """
            result = session.run(query, gstins=gstin_list)
            for record in result:
                input_g = record["input_gstin"]
                risk_val = record["riskScore"]
                try:
                    risk_score_int = int(float(risk_val)) if risk_val is not None else 75
                except (ValueError, TypeError):
                    risk_score_int = 75

                risk_profiles[input_g] = {
                    "labels": record["labels"] or [],
                    "riskScore": risk_score_int,
                    "fraudType": record["fraudType"] or "Flagged in Neo4j",
                    "name": record["name"] or input_g
                }
        driver.close()
    except Exception as e:
        logger.error(f"Error querying Neo4j: {e}")
        print(f"Neo4j Query Error: {e}")
    return risk_profiles


async def check_gstins_in_s3_reference(gstins: list[str], user_email: str) -> dict:
    """
    Check the GSTINs against reference dataset files stored in the S3 bucket or local fallback.
    """
    risk_profiles = {}
    s3_reference_data = []

    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET:
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION
            )
            # List objects in bucket
            response = s3.list_objects_v2(Bucket=AWS_S3_BUCKET)
            if "Contents" in response:
                for obj in response["Contents"]:
                    key = obj["Key"]
                    # If filename contains 'fake_gstin' or 'reference' or 'fraud' and is CSV/JSON
                    if any(term in key.lower() for term in ["fake_gstin", "fraud_ref", "reference"]) and key.endswith((".json", ".csv")):
                        print(f"Found reference file in S3: {key}")
                        file_response = s3.get_object(Bucket=AWS_S3_BUCKET, Key=key)
                        content = file_response["Body"].read()

                        if key.endswith(".json"):
                            try:
                                data = json.loads(content.decode("utf-8", errors="replace"))
                                if isinstance(data, list):
                                    s3_reference_data.extend(data)
                            except Exception as json_err:
                                print(f"Error parsing S3 JSON reference: {json_err}")
                        elif key.endswith(".csv"):
                            try:
                                import csv
                                csv_text = content.decode("utf-8", errors="replace")
                                reader = csv.DictReader(io.StringIO(csv_text))
                                for row in reader:
                                    s3_reference_data.append(row)
                            except Exception as csv_err:
                                print(f"Error parsing S3 CSV reference: {csv_err}")
        except Exception as s3_err:
            print(f"Error listing/reading S3 reference files: {s3_err}")

    # Local Fallback
    local_reference_data = []
    local_path = os.path.join(os.path.dirname(__file__), "..", "..", "fake_gstin_dataset.json")
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                local_reference_data = json.load(f)
                print(f"Loaded {len(local_reference_data)} records from local reference dataset")
        except Exception as local_err:
            print(f"Error loading local reference dataset: {local_err}")

    all_refs = s3_reference_data if s3_reference_data else local_reference_data

    ref_lookup = {}
    for ref in all_refs:
        gstin_val = (ref.get("gstin") or ref.get("GSTIN") or "").strip().upper()
        if gstin_val:
            ref_lookup[gstin_val] = {
                "supplier": ref.get("supplier") or ref.get("supplier name") or ref.get("name") or "Unknown Entity",
                "riskScore": int(ref.get("riskScore") or ref.get("score") or 90),
                "fraudType": ref.get("fraudType") or ref.get("reason") or "Flagged in reference dataset",
                "source": "S3 Reference" if s3_reference_data else "Local Reference"
            }

    for g in gstins:
        g_norm = g.strip().upper()
        if g_norm in ref_lookup:
            risk_profiles[g_norm] = ref_lookup[g_norm]

    return risk_profiles


# ─────────────────────────────────────────────────────────────────────────────
# Reconciliation engine
# ─────────────────────────────────────────────────────────────────────────────

def run_matching_engine(pr_invoices: list[dict], g2b_invoices: list[dict], combined_profiles: dict = None) -> list[dict]:
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

        # Cross-reference with Neo4j / S3 profiles
        gstin_key = str(inv.get("gstin", "")).strip().upper()
        fraud_type = ""
        if combined_profiles and gstin_key in combined_profiles:
            prof = combined_profiles[gstin_key]
            score = max(score, prof.get("riskScore", 0))
            fraud_type = prof.get("fraudType", "")
            # Reduce confidence slightly due to risk flag
            conf = max(0, conf - 25)

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
            "fraudType": fraud_type,
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

        # Upload new file to S3
        s3_url = await upload_file_to_s3_async(content, filename, purchase_register.content_type, user_email)

        # Retrieve existing document to get its old s3_url before overwriting it
        existing = await uploads_col.find_one({"type": "purchase_register", "user_email": user_email})

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

        # Delete the previous file from S3 to prevent leaks
        if existing and existing.get("s3_url") and existing.get("s3_url") != s3_url:
            await delete_file_from_s3_async(existing["s3_url"])

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

        # Upload new file to S3
        s3_url = await upload_file_to_s3_async(content, filename, gstr2b.content_type, user_email)

        # Retrieve existing document to get its old s3_url before overwriting it
        existing = await uploads_col.find_one({"type": "gstr2b", "user_email": user_email})

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

        # Delete the previous file from S3 to prevent leaks
        if existing and existing.get("s3_url") and existing.get("s3_url") != s3_url:
            await delete_file_from_s3_async(existing["s3_url"])

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

    # Download and parse Purchase Register on-the-fly from S3 if available, falling back to DB records
    pr_invoices = None
    pr_s3_url = pr_doc.get("s3_url")
    if pr_s3_url:
        try:
            file_bytes = await download_file_from_s3_async(pr_s3_url)
            if file_bytes:
                filename = pr_doc.get("filename", "")
                ext = filename.rsplit(".", 1)[-1].lower()
                if ext in ("xlsx", "xls"):
                    pr_invoices = parse_purchase_register_xlsx(file_bytes)
                elif ext == "csv":
                    pr_invoices = parse_purchase_register_csv(file_bytes)
                
                if pr_invoices:
                    print("Successfully downloaded and parsed PR from S3")
                else:
                    print("S3 download succeeded but parsing PR returned no records. Falling back to DB.")
            else:
                print("S3 download failed for PR. Falling back to DB.")
        except Exception as e:
            print(f"Error downloading or parsing PR from S3: {e}. Falling back to DB.")
            
    if pr_invoices is None:
        pr_invoices = pr_doc.get("records", [])

    # Download and parse GSTR-2B on-the-fly from S3 if available, falling back to DB records
    g2b_invoices = None
    g2b_s3_url = g2b_doc.get("s3_url")
    if g2b_s3_url:
        try:
            file_bytes = await download_file_from_s3_async(g2b_s3_url)
            if file_bytes:
                g2b_invoices = parse_gstr2b_json(file_bytes)
                if g2b_invoices:
                    print("Successfully downloaded and parsed G2B from S3")
                else:
                    print("S3 download succeeded but parsing G2B returned no records. Falling back to DB.")
            else:
                print("S3 download failed for G2B. Falling back to DB.")
        except Exception as e:
            print(f"Error downloading or parsing G2B from S3: {e}. Falling back to DB.")
            
    if g2b_invoices is None:
        g2b_invoices = g2b_doc.get("records", [])

    # ── Gather unique GSTINs for Neo4j & S3 Checking ───────────────────────────
    gstins = set()
    for inv in pr_invoices:
        g = inv.get("gstin")
        if g:
            gstins.add(str(g).strip().upper())
    for inv in g2b_invoices:
        g = inv.get("gstin")
        if g:
            gstins.add(str(g).strip().upper())

    # Check S3 reference datasets
    s3_connected = True
    s3_profiles = {}
    try:
        s3_profiles = await check_gstins_in_s3_reference(list(gstins), user_email)
    except Exception as s3_err:
        print(f"S3 Reference check error: {s3_err}")
        s3_connected = False

    # Check Neo4j database
    neo4j_connected = True
    neo4j_profiles = {}
    neo4j_warning = None
    if NEO4J_URI:
        try:
            # Quick connect check
            driver = GraphDatabase.driver(
                NEO4J_URI,
                auth=(NEO4J_USERNAME, NEO4J_PASSWORD),
                connection_timeout=3.0
            )
            driver.verify_connectivity()
            driver.close()
            # If connected, fetch the profiles
            neo4j_profiles = check_gstins_in_neo4j(list(gstins))
        except Exception as neo_err:
            print(f"Neo4j connection failed: {neo_err}")
            neo4j_connected = False
            neo4j_warning = f"Could not connect to Neo4j database: {neo_err}"
    else:
        neo4j_connected = False
        neo4j_warning = "Neo4j connection credentials not configured in backend .env."

    # Merge profiles (S3 reference overrides or merges with Neo4j)
    combined_profiles = {}
    for gstin, prof in neo4j_profiles.items():
        combined_profiles[gstin] = {
            "riskScore": prof.get("riskScore") or 70,
            "fraudType": prof.get("fraudType") or "Flagged in Neo4j",
            "labels": prof.get("labels") or ["Supplier"],
            "source": "Neo4j"
        }
    for gstin, prof in s3_profiles.items():
        # S3 reference overrides or maxes the score
        prev_score = combined_profiles.get(gstin, {}).get("riskScore", 0)
        combined_profiles[gstin] = {
            "riskScore": max(prof.get("riskScore") or 90, prev_score),
            "fraudType": prof.get("fraudType") or "Flagged in S3/Local reference",
            "labels": ["HighRisk", "Supplier"],
            "source": prof.get("source") or "S3/Local Reference"
        }

    results = run_matching_engine(pr_invoices, g2b_invoices, combined_profiles)
    for r in results:
        r["user_email"] = user_email

    summary = compute_summary(results)

    # Persist results
    await recon_results_col.delete_many({"user_email": user_email})
    if results:
        await recon_results_col.insert_many(results)

    # Store run metadata including Neo4j status
    await recon_runs_col.insert_one({
        "user_email": user_email,
        "run_at":  utcnow(),
        "summary": summary,
        "neo4j_connected": neo4j_connected,
        "neo4j_warning": neo4j_warning,
        "s3_checked": len(s3_profiles) > 0,
    })

    return {
        "message": "Reconciliation completed successfully.",
        "summary": summary,
        "neo4j_connected": neo4j_connected,
        "neo4j_warning": neo4j_warning,
        "s3_checked": len(s3_profiles) > 0,
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


@router.delete("/upload/{upload_type}")
async def delete_upload(request: Request, upload_type: str):
    """
    Delete an uploaded file from MongoDB and AWS S3, and clear reconciliation results.
    """
    if upload_type not in ("purchase_register", "gstr2b"):
        raise HTTPException(status_code=400, detail="Invalid upload type. Must be purchase_register or gstr2b.")

    user_email = get_user_email(request)
    doc = await uploads_col.find_one({"type": upload_type, "user_email": user_email})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No upload of type {upload_type} found.")

    # 1. Delete from AWS S3 if s3_url exists
    s3_url = doc.get("s3_url")
    deleted_from_s3 = False
    if s3_url:
        deleted_from_s3 = await delete_file_from_s3_async(s3_url)

    # 2. Delete from MongoDB uploads collection
    await uploads_col.delete_one({"type": upload_type, "user_email": user_email})

    # 3. Clear reconciliation results & runs since one of the inputs is deleted
    await recon_results_col.delete_many({"user_email": user_email})
    await recon_runs_col.delete_many({"user_email": user_email})

    return {
        "status": "success",
        "message": f"Successfully deleted {upload_type} from S3 and MongoDB project data.",
        "deleted_from_s3": deleted_from_s3
    }
