"""
Dashboard API endpoints - Aggregated stats and analytics for the frontend dashboard.

Provides:
- Summary statistics (calls today, appointments, customers, etc.)
- Call analytics over time
- Call outcome distribution
"""

from fastapi import APIRouter, Depends, Query
from datetime import datetime, date, timedelta
from typing import Optional

from backend.middleware.auth import get_current_active_user
from backend.database.supabase_client import get_db


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats/{business_id}")
async def get_dashboard_stats(
    business_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get aggregated dashboard statistics for a business.
    
    Returns:
    - calls_today: Number of calls today
    - calls_yesterday: Number of calls yesterday
    - calls_change: Percentage change from yesterday
    - appointments_today: Total appointments today
    - appointments_completed: Completed appointments today
    - total_customers: Total customer count
    - customers_this_month: New customers this month
    - average_rating: Average rating (placeholder for now)
    - ratings_count: Number of ratings
    """
    db = get_db()
    today = date.today()
    yesterday = today - timedelta(days=1)
    month_start = today.replace(day=1)
    
    # Verify user has access to this business
    if current_user.get("business_id") != business_id:
        return {"error": "Unauthorized"}, 403
    
    # Get calls today
    calls_today_result = db.table("call_logs").select(
        "id", count="exact"
    ).eq("business_id", business_id).gte(
        "started_at", today.isoformat()
    ).execute()
    calls_today = calls_today_result.count or 0
    
    # Get calls yesterday
    calls_yesterday_result = db.table("call_logs").select(
        "id", count="exact"
    ).eq("business_id", business_id).gte(
        "started_at", yesterday.isoformat()
    ).lt(
        "started_at", today.isoformat()
    ).execute()
    calls_yesterday = calls_yesterday_result.count or 0
    
    # Calculate change percentage
    if calls_yesterday > 0:
        calls_change = round(((calls_today - calls_yesterday) / calls_yesterday) * 100)
    else:
        calls_change = 100 if calls_today > 0 else 0
    
    # Get appointments today
    appointments_today_result = db.table("appointments").select(
        "id, status"
    ).eq("business_id", business_id).eq(
        "appointment_date", today.isoformat()
    ).execute()
    
    appointments_today = len(appointments_today_result.data) if appointments_today_result.data else 0
    appointments_completed = len([
        a for a in (appointments_today_result.data or []) 
        if a.get("status") == "completed"
    ])
    
    # Get total customers
    customers_result = db.table("customers").select(
        "id", count="exact"
    ).eq("business_id", business_id).eq("is_active", True).execute()
    total_customers = customers_result.count or 0
    
    # Get new customers this month
    customers_month_result = db.table("customers").select(
        "id", count="exact"
    ).eq("business_id", business_id).eq("is_active", True).gte(
        "created_at", month_start.isoformat()
    ).execute()
    customers_this_month = customers_month_result.count or 0
    
    # Placeholder for ratings (can be implemented later)
    average_rating = 4.8
    ratings_count = 0
    
    return {
        "calls_today": calls_today,
        "calls_yesterday": calls_yesterday,
        "calls_change": calls_change,
        "appointments_today": appointments_today,
        "appointments_completed": appointments_completed,
        "total_customers": total_customers,
        "customers_this_month": customers_this_month,
        "average_rating": average_rating,
        "ratings_count": ratings_count,
    }


@router.get("/analytics/{business_id}")
async def get_call_analytics(
    business_id: str,
    days: int = Query(default=7, le=30),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get call and appointment analytics for the specified number of days.
    
    Returns an array of daily statistics:
    - date: The date
    - calls: Number of calls that day
    - appointments: Number of appointments booked that day
    """
    db = get_db()
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    
    # Verify user has access to this business
    if current_user.get("business_id") != business_id:
        return {"error": "Unauthorized"}, 403
    
    # Get all calls in date range
    calls_result = db.table("call_logs").select(
        "started_at"
    ).eq("business_id", business_id).gte(
        "started_at", start_date.isoformat()
    ).execute()
    
    # Get all appointments in date range
    appointments_result = db.table("appointments").select(
        "appointment_date"
    ).eq("business_id", business_id).gte(
        "appointment_date", start_date.isoformat()
    ).lte(
        "appointment_date", today.isoformat()
    ).execute()
    
    # Count by date
    calls_by_date = {}
    for call in (calls_result.data or []):
        call_date = call["started_at"][:10]  # Extract YYYY-MM-DD
        calls_by_date[call_date] = calls_by_date.get(call_date, 0) + 1
    
    appointments_by_date = {}
    for apt in (appointments_result.data or []):
        apt_date = apt["appointment_date"]
        appointments_by_date[apt_date] = appointments_by_date.get(apt_date, 0) + 1
    
    # Build response array
    analytics = []
    for i in range(days):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.isoformat()
        analytics.append({
            "date": current_date.strftime("%a"),  # Mon, Tue, etc.
            "full_date": date_str,
            "calls": calls_by_date.get(date_str, 0),
            "appointments": appointments_by_date.get(date_str, 0),
        })
    
    return analytics


@router.get("/call-outcomes/{business_id}")
async def get_call_outcomes(
    business_id: str,
    days: int = Query(default=30, le=90),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get call outcome distribution for the specified number of days.
    
    Returns an array of outcome statistics:
    - name: Outcome name (formatted)
    - value: Count
    - percentage: Percentage of total
    """
    db = get_db()
    start_date = date.today() - timedelta(days=days)
    
    # Verify user has access to this business
    if current_user.get("business_id") != business_id:
        return {"error": "Unauthorized"}, 403
    
    # Get all calls with outcomes
    calls_result = db.table("call_logs").select(
        "outcome"
    ).eq("business_id", business_id).gte(
        "started_at", start_date.isoformat()
    ).not_.is_("outcome", "null").execute()
    
    # Count by outcome
    outcome_counts = {}
    total = 0
    for call in (calls_result.data or []):
        outcome = call.get("outcome", "other")
        outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1
        total += 1
    
    # Format outcome names
    outcome_labels = {
        "appointment_booked": "Appointment Booked",
        "appointment_rescheduled": "Rescheduled",
        "appointment_cancelled": "Cancelled",
        "question_answered": "Question Answered",
        "callback_scheduled": "Callback Scheduled",
        "transferred_human": "Transferred",
        "voicemail": "Voicemail",
        "other": "Other",
    }
    
    # Outcome colors for charts
    outcome_colors = {
        "appointment_booked": "#22C55E",
        "appointment_rescheduled": "#8B5CF6",
        "appointment_cancelled": "#F59E0B",
        "question_answered": "#3B82F6",
        "callback_scheduled": "#06B6D4",
        "transferred_human": "#EC4899",
        "voicemail": "#64748B",
        "other": "#94A3B8",
    }
    
    # Build response
    outcomes = []
    for outcome, count in outcome_counts.items():
        percentage = round((count / total) * 100) if total > 0 else 0
        outcomes.append({
            "name": outcome_labels.get(outcome, outcome.replace("_", " ").title()),
            "value": count,
            "percentage": percentage,
            "color": outcome_colors.get(outcome, "#94A3B8"),
        })
    
    # Sort by count descending
    outcomes.sort(key=lambda x: x["value"], reverse=True)
    
    return outcomes

