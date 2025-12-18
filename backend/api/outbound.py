"""
Outbound Calls API Endpoints

Provides endpoints for:
- Getting pending outbound calls
- Getting outbound call details
- Scheduling new outbound calls
- Updating call status
- Scheduling callbacks
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/outbound", tags=["Outbound Calls"])


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ScheduleOutboundRequest(BaseModel):
    business_id: str
    customer_id: str
    phone_number: str
    call_type: str = Field(..., description="appointment_reminder, callback, waitlist_notification, custom, etc.")
    scheduled_for: str  # ISO datetime
    priority: int = Field(default=5, ge=1, le=10)
    script_type: Optional[str] = None
    context_data: Optional[dict] = None


class ScheduleCallbackRequest(BaseModel):
    business_id: str
    customer_id: str
    phone: str
    callback_date: str  # YYYY-MM-DD
    callback_time: str  # HH:MM
    reason: Optional[str] = None
    notes: Optional[str] = None
    original_call_log_id: Optional[str] = None


class UpdateOutboundRequest(BaseModel):
    status: Optional[str] = None
    attempts: Optional[int] = None
    next_retry_at: Optional[str] = None
    outcome: Optional[str] = None
    call_duration: Optional[int] = None
    call_log_id: Optional[str] = None
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def get_db():
    """Get Supabase database client"""
    from backend.database.supabase_client import get_supabase_client
    return get_supabase_client()


# ═══════════════════════════════════════════════════════════════════════════════
# GET PENDING OUTBOUND CALLS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pending")
async def get_pending_outbound_calls(
    business_id: Optional[str] = Query(None),
    limit: int = Query(default=10, le=50)
):
    """
    Get pending outbound calls that are due to be made.
    
    Returns calls where:
    - status is 'pending'
    - scheduled_for is in the past or now
    - next_retry_at is null or in the past
    
    Ordered by priority (highest first) then scheduled time.
    """
    db = get_db()
    
    now = datetime.utcnow().isoformat()
    
    query = db.table("outbound_calls").select(
        "*, customers(first_name, last_name, phone, email)"
    ).eq("status", "pending").lte("scheduled_for", now)
    
    if business_id:
        query = query.eq("business_id", business_id)
    
    # Handle retry logic - either no retry scheduled or retry time has passed
    result = query.order(
        "priority", desc=True
    ).order(
        "scheduled_for"
    ).limit(limit).execute()
    
    # Filter for retry timing in Python (Supabase OR queries are complex)
    calls = []
    for call in (result.data or []):
        next_retry = call.get("next_retry_at")
        if next_retry is None or next_retry <= now:
            calls.append(call)
    
    return calls[:limit]


# ═══════════════════════════════════════════════════════════════════════════════
# GET OUTBOUND CALL DETAILS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/{outbound_id}")
async def get_outbound_call(outbound_id: str):
    """
    Get full details for an outbound call.
    Used by the agent to understand the context of the call.
    """
    db = get_db()
    
    result = db.table("outbound_calls").select(
        "*, customers(id, first_name, last_name, phone, email, language, notes, accommodations)"
    ).eq("id", outbound_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Outbound call not found")
    
    call = result.data[0]
    
    # Get customer's recent appointments for context
    customer_id = call.get("customer_id")
    if customer_id:
        appointments = db.table("appointments").select(
            "*, services(name), staff(name)"
        ).eq("customer_id", customer_id).order(
            "appointment_date", desc=True
        ).limit(5).execute()
        
        call["recent_appointments"] = appointments.data or []
    
    return call


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEDULE OUTBOUND CALL
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/schedule")
async def schedule_outbound_call(request: ScheduleOutboundRequest):
    """
    Schedule a new outbound call.
    
    Call types:
    - appointment_reminder: Remind about upcoming appointment
    - appointment_reminder_1h: 1-hour reminder
    - callback: Scheduled callback request
    - waitlist_notification: Slot opened up
    - no_show_followup: Follow up after no-show
    - payment_reminder: Payment reminder
    - birthday_greeting: Birthday call
    - reengagement: Re-engagement campaign
    - custom: Custom call with provided context
    """
    db = get_db()
    
    valid_types = [
        "appointment_reminder", "appointment_reminder_1h", "callback",
        "waitlist_notification", "no_show_followup", "payment_reminder",
        "birthday_greeting", "reengagement", "custom"
    ]
    
    if request.call_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid call_type. Must be one of: {valid_types}"
        )
    
    call_data = {
        "business_id": request.business_id,
        "customer_id": request.customer_id,
        "phone_number": request.phone_number,
        "call_type": request.call_type,
        "scheduled_for": request.scheduled_for,
        "priority": request.priority,
        "script_type": request.script_type or request.call_type,
        "context_data": request.context_data,
        "status": "pending",
        "attempts": 0,
        "max_attempts": 3
    }
    
    result = db.table("outbound_calls").insert(call_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to schedule outbound call")
    
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════════════════
# UPDATE OUTBOUND CALL
# ═══════════════════════════════════════════════════════════════════════════════

@router.put("/{outbound_id}")
async def update_outbound_call(outbound_id: str, request: UpdateOutboundRequest):
    """
    Update an outbound call's status and details.
    
    Statuses:
    - pending: Waiting to be made
    - in_progress: Currently being made
    - completed: Successfully completed
    - failed: Call failed
    - no_answer: No answer
    - busy: Line busy
    - cancelled: Cancelled
    - max_attempts: Maximum retry attempts reached
    """
    db = get_db()
    
    update_data = {"updated_at": datetime.utcnow().isoformat()}
    
    if request.status:
        valid_statuses = [
            "pending", "in_progress", "completed", "failed",
            "no_answer", "busy", "cancelled", "max_attempts"
        ]
        if request.status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )
        update_data["status"] = request.status
        
        # Update last_attempt_at when status changes to in_progress
        if request.status == "in_progress":
            update_data["last_attempt_at"] = datetime.utcnow().isoformat()
    
    if request.attempts is not None:
        update_data["attempts"] = request.attempts
    if request.next_retry_at:
        update_data["next_retry_at"] = request.next_retry_at
    if request.outcome:
        update_data["outcome"] = request.outcome
    if request.call_duration is not None:
        update_data["call_duration"] = request.call_duration
    if request.call_log_id:
        update_data["call_log_id"] = request.call_log_id
    if request.notes:
        update_data["notes"] = request.notes
    
    result = db.table("outbound_calls").update(update_data).eq("id", outbound_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Outbound call not found")
    
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEDULE CALLBACK
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/callback")
async def schedule_callback(request: ScheduleCallbackRequest):
    """
    Schedule a callback to a customer.
    Creates both a callback record and an outbound call entry.
    """
    db = get_db()
    
    # Create callback record
    callback_data = {
        "business_id": request.business_id,
        "customer_id": request.customer_id,
        "phone_number": request.phone,
        "callback_date": request.callback_date,
        "callback_time": request.callback_time,
        "reason": request.reason,
        "notes": request.notes,
        "original_call_log_id": request.original_call_log_id,
        "status": "pending"
    }
    
    callback_result = db.table("scheduled_callbacks").insert(callback_data).execute()
    
    if not callback_result.data:
        raise HTTPException(status_code=500, detail="Failed to schedule callback")
    
    callback = callback_result.data[0]
    
    # Create outbound call entry
    scheduled_datetime = f"{request.callback_date}T{request.callback_time}:00"
    
    outbound_data = {
        "business_id": request.business_id,
        "customer_id": request.customer_id,
        "phone_number": request.phone,
        "call_type": "callback",
        "scheduled_for": scheduled_datetime,
        "priority": 7,  # Callbacks are higher priority
        "script_type": "callback",
        "context_data": {
            "reason": request.reason,
            "notes": request.notes,
            "original_call_log_id": request.original_call_log_id
        },
        "status": "pending",
        "attempts": 0,
        "max_attempts": 3
    }
    
    outbound_result = db.table("outbound_calls").insert(outbound_data).execute()
    
    # Link callback to outbound call
    if outbound_result.data:
        db.table("scheduled_callbacks").update({
            "outbound_call_id": outbound_result.data[0]["id"]
        }).eq("id", callback["id"]).execute()
    
    return {
        "success": True,
        "callback": callback,
        "outbound_call": outbound_result.data[0] if outbound_result.data else None
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CANCEL OUTBOUND CALL
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{outbound_id}/cancel")
async def cancel_outbound_call(outbound_id: str, reason: Optional[str] = None):
    """Cancel a pending outbound call."""
    db = get_db()
    
    result = db.table("outbound_calls").update({
        "status": "cancelled",
        "notes": reason,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", outbound_id).eq("status", "pending").execute()
    
    if not result.data:
        raise HTTPException(
            status_code=404, 
            detail="Outbound call not found or not in pending status"
        )
    
    return {"success": True, "outbound_call": result.data[0]}


# ═══════════════════════════════════════════════════════════════════════════════
# RETRY OUTBOUND CALL
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{outbound_id}/retry")
async def retry_outbound_call(
    outbound_id: str,
    delay_minutes: int = Query(default=120, ge=5, le=1440)
):
    """
    Schedule a retry for a failed outbound call.
    
    Args:
        delay_minutes: Minutes to wait before retry (default 2 hours)
    """
    db = get_db()
    
    # Get current call
    current = db.table("outbound_calls").select("attempts, max_attempts").eq(
        "id", outbound_id
    ).execute()
    
    if not current.data:
        raise HTTPException(status_code=404, detail="Outbound call not found")
    
    call = current.data[0]
    new_attempts = call["attempts"] + 1
    
    if new_attempts >= call["max_attempts"]:
        # Max attempts reached
        result = db.table("outbound_calls").update({
            "status": "max_attempts",
            "attempts": new_attempts,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", outbound_id).execute()
        
        return {
            "success": False,
            "message": "Maximum attempts reached",
            "outbound_call": result.data[0] if result.data else None
        }
    
    # Schedule retry
    next_retry = datetime.utcnow() + timedelta(minutes=delay_minutes)
    
    result = db.table("outbound_calls").update({
        "status": "pending",
        "attempts": new_attempts,
        "next_retry_at": next_retry.isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", outbound_id).execute()
    
    return {
        "success": True,
        "next_retry_at": next_retry.isoformat(),
        "attempts": new_attempts,
        "outbound_call": result.data[0] if result.data else None
    }


# ═══════════════════════════════════════════════════════════════════════════════
# GET CALL HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/history/{customer_id}")
async def get_outbound_call_history(
    customer_id: str,
    business_id: Optional[str] = Query(None),
    limit: int = Query(default=20, le=100)
):
    """Get outbound call history for a customer."""
    db = get_db()
    
    query = db.table("outbound_calls").select("*").eq("customer_id", customer_id)
    
    if business_id:
        query = query.eq("business_id", business_id)
    
    result = query.order("created_at", desc=True).limit(limit).execute()
    
    return result.data or []

