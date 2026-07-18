"""
Fraud Router
Provides fraud detection data:
  - GET /api/fraud/summary — High/Medium/Safe entity counts
  - GET /api/fraud/cases   — Detailed list of flagged entities
"""

import os
import logging

from fastapi import APIRouter, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from utils import get_user_email

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

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/summary")
async def get_fraud_summary(request: Request):
    """
    Return counts of high-risk, medium-risk, and safe entities.
    Derived from reconciliation results risk scores.
    """
    user_email = get_user_email(request)
    # Count unique suppliers by risk tier using aggregation
    pipeline = [
        {"$match": {"user_email": user_email}},
        {
            "$group": {
                "_id": "$gstin",
                "supplier": {"$first": "$supplier"},
                "max_score": {"$max": "$score"},
            }
        },
        {
            "$group": {
                "_id": None,
                "high_risk": {
                    "$sum": {"$cond": [{"$gte": ["$max_score", 70]}, 1, 0]}
                },
                "medium_risk": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$gte": ["$max_score", 40]},
                                    {"$lt":  ["$max_score", 70]},
                                ]
                            },
                            1,
                            0,
                        ]
                    }
                },
                "safe": {
                    "$sum": {"$cond": [{"$lt": ["$max_score", 40]}, 1, 0]}
                },
                "total": {"$sum": 1},
            }
        },
    ]

    cursor = recon_results_col.aggregate(pipeline)
    rows   = await cursor.to_list(length=1)

    if rows:
        row = rows[0]
        return {
            "high_risk":   row.get("high_risk",   0),
            "medium_risk": row.get("medium_risk", 0),
            "safe":        row.get("safe",        0),
            "total":       row.get("total",       0),
            "hasData":     True,
        }

    # No reconciliation data yet
    return {
        "high_risk":   0,
        "medium_risk": 0,
        "safe":        0,
        "total":       0,
        "hasData":     False,
    }


@router.get("/cases")
async def get_fraud_cases(
    request: Request,
    page:  int = Query(1,  ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Return flagged fraud cases sorted by risk score descending.
    Each case represents a unique supplier GSTIN with their worst invoice.
    """
    user_email = get_user_email(request)
    # Aggregate per-supplier worst invoice
    pipeline = [
        {"$match": {"user_email": user_email, "score": {"$gt": 0}}},
        {
            "$group": {
                "_id":      "$gstin",
                "supplier": {"$first": "$supplier"},
                "gstin":    {"$first": "$gstin"},
                "max_score": {"$max": "$score"},
                "invoice_count": {"$sum": 1},
                "total_diff":    {"$sum": "$diff"},
                "statuses":      {"$addToSet": "$status"},
            }
        },
        {"$sort": {"max_score": -1}},
        {"$skip": (page - 1) * limit},
        {"$limit": limit},
    ]

    cursor = recon_results_col.aggregate(pipeline)
    rows   = await cursor.to_list(length=limit)

    # Count total unique suppliers with score > 0
    count_pipeline = [
        {"$match": {"user_email": user_email, "score": {"$gt": 0}}},
        {"$group": {"_id": "$gstin"}},
        {"$count": "total"},
    ]
    count_cursor = recon_results_col.aggregate(count_pipeline)
    count_rows   = await count_cursor.to_list(length=1)
    total = count_rows[0]["total"] if count_rows else 0

    cases = []
    for row in rows:
        score = row.get("max_score", 0)
        if score >= 85:
            severity = "Critical"
        elif score >= 70:
            severity = "High"
        elif score >= 40:
            severity = "Medium"
        else:
            severity = "Low"

        statuses = row.get("statuses", [])
        reasons  = []
        if "Missing" in statuses:
            reasons.append("Invoice absent in GSTR-2B")
        if "Duplicate" in statuses:
            reasons.append("Duplicate invoice detected")
        if "Partial" in statuses:
            reasons.append(f"Tax mismatch ₹{row.get('total_diff', 0):,.2f}")
        reason = "; ".join(reasons) if reasons else "Anomalous risk pattern"

        cases.append({
            "gstin":         row.get("gstin", ""),
            "supplier":      row.get("supplier", "Unknown"),
            "score":         score,
            "severity":      severity,
            "invoice_count": row.get("invoice_count", 0),
            "total_diff":    round(row.get("total_diff", 0), 2),
            "reason":        reason,
            "statuses":      statuses,
        })

    return {
        "cases":   cases,
        "total":   total,
        "page":    page,
        "limit":   limit,
        "hasData": total > 0,
    }
