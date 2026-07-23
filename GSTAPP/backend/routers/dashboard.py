"""
Dashboard Router
Provides aggregated data for the Overview/Dashboard page:
  - GET /api/dashboard/stats   — KPI counts from latest reconciliation run
  - GET /api/dashboard/alerts  — Top fraud alerts (from S3 + MongoDB)
  - GET /api/dashboard/trend   — Monthly risk trend data
"""

import os
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Request
from utils import get_user_email
from database import recon_results_col, recon_runs_col, uploads_col

router = APIRouter()
logger = logging.getLogger(__name__)

CALENDAR_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@router.get("/stats")
async def get_stats(request: Request):
    """
    Return KPI statistics for the dashboard.
    Sources from the latest reconciliation run stored in MongoDB.
    Falls back to scanning live results if no run record exists.
    """
    user_email = get_user_email(request)
    # Try latest run record first
    last_run = await recon_runs_col.find_one({"user_email": user_email}, {"_id": 0}, sort=[("run_at", -1)])
    if last_run and last_run.get("summary"):
        s = last_run["summary"]
        exact     = s.get("exact",     0)
        partial   = s.get("partial",   0)
        missing   = s.get("missing",   0)
        fraud     = s.get("fraud",     0)
        total     = s.get("total",     exact + partial + missing + fraud)
    else:
        # Count live results
        pipeline = [
            {"$match": {"user_email": user_email}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        cursor   = recon_results_col.aggregate(pipeline)
        rows     = await cursor.to_list(length=100)
        counts   = {"Exact": 0, "Partial": 0, "Missing": 0, "Fraud": 0, "Duplicate": 0}
        for row in rows:
            if row["_id"] in counts:
                counts[row["_id"]] = row["count"]
        exact     = counts["Exact"]
        partial   = counts["Partial"]
        missing   = counts["Missing"]
        # Merge duplicate status into fraud for backwards compatibility
        fraud     = counts["Fraud"] + counts["Duplicate"]
        total     = exact + partial + missing + fraud

    # Compute tax risk amounts from reconciliation results
    partial_diff_pipeline = [
        {"$match": {"user_email": user_email, "status": {"$in": ["Partial", "Missing"]}}},
        {"$group": {"_id": None, "total_diff": {"$sum": "$diff"}, "total_pr_tax": {"$sum": "$prTax"}}},
    ]
    cursor = recon_results_col.aggregate(partial_diff_pipeline)
    diff_rows = await cursor.to_list(length=1)
    total_diff  = diff_rows[0]["total_diff"]  if diff_rows else 0.0
    total_pr    = diff_rows[0]["total_pr_tax"] if diff_rows else 0.0

    return {
        "exact":     {"count": exact,     "tax": round(total_pr * 0.85, 2)},
        "partial":   {"count": partial,   "tax": round(total_diff * 0.6, 2)},
        "missing":   {"count": missing,   "tax": round(total_diff * 0.4, 2)},
        "fraud":     {"count": fraud,     "tax": 0},
        "total":     total,
        "hasData":   total > 0,
    }


@router.get("/alerts")
async def get_alerts(request: Request):
    """
    Return top high-risk invoices/suppliers as fraud alerts.
    Sourced from reconciliation results (high risk score) in MongoDB.
    """
    user_email = get_user_email(request)
    cursor = (
        recon_results_col
        .find(
            {"user_email": user_email, "score": {"$gt": 50}},
            {"_id": 0, "supplier": 1, "gstin": 1, "score": 1, "status": 1, "diff": 1, "id": 1}
        )
        .sort("score", -1)
        .limit(10)
    )
    items = await cursor.to_list(length=10)

    alerts = []
    for item in items:
        score = item.get("score", 0)
        diff  = item.get("diff", 0)
        status = item.get("status", "")

        if score >= 85:
            severity = "Critical"
        elif score >= 70:
            severity = "High"
        elif score >= 55:
            severity = "Medium"
        else:
            severity = "Low"

        if status == "Missing":
            reason = f"Invoice not found in GSTR-2B (tax: ₹{diff:,.2f})"
        elif status == "Duplicate":
            reason = "Duplicate invoice number detected across records"
        elif status == "Partial":
            reason = f"Tax amount mismatch of ₹{diff:,.2f}"
        else:
            reason = "Flagged by risk scoring engine"

        alerts.append({
            "id":       item.get("id", ""),
            "supplier": item.get("supplier", "Unknown Supplier"),
            "gstin":    item.get("gstin", ""),
            "severity": severity,
            "score":    score,
            "reason":   reason,
            "time":     "Just now",
        })

    return {"alerts": alerts, "hasData": len(alerts) > 0}


@router.get("/trend")
async def get_trend(request: Request):
    """
    Return monthly risk trend for the last 10 months.
    Computes from run history in MongoDB; returns placeholder data if no runs.
    """
    user_email = get_user_email(request)
    # Aggregate run history by month
    pipeline = [
        {"$match": {"user_email": user_email}},
        {"$sort": {"run_at": -1}},
        {"$limit": 100},
        {
            "$group": {
                "_id": {
                    "year":  {"$year": "$run_at"},
                    "month": {"$month": "$run_at"},
                },
                "partial":   {"$sum": "$summary.partial"},
                "missing":   {"$sum": "$summary.missing"},
                "fraud":     {"$sum": {"$ifNull": ["$summary.fraud", 0]}},
                "duplicate": {"$sum": {"$ifNull": ["$summary.duplicate", 0]}},
                "total":     {"$sum": "$summary.total"},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 10},
    ]

    cursor = recon_runs_col.aggregate(pipeline)
    rows   = await cursor.to_list(length=10)

    if rows:
        trend = []
        for row in rows:
            month_idx = row["_id"]["month"] - 1
            total     = row.get("total", 1) or 1
            risk_pct  = round(
                (row.get("partial", 0) + row.get("missing", 0) + row.get("fraud", 0) + row.get("duplicate", 0))
                / total * 100,
                1
            )
            trend.append({
                "month": CALENDAR_MONTHS[month_idx],
                "risk":  min(risk_pct, 100),
            })
        return {"trend": trend, "hasData": True}

    # No real data — return empty array so frontend shows proper empty state
    return {
        "trend":   [],
        "hasData": False,
    }
