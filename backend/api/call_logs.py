"""
Call log endpoints - WITH DATETIME SERIALIZATION FIX

Changes from original:
1. Added sanitize_datetime_fields() helper function
2. Wrapped service responses with sanitization
3. This fixes "Object of type datetime is not JSON serializable" error
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from datetime import datetime

from backend.models.call_log import CallLogCreate, CallLogUpdate, CallLogResponse
from backend.services.call_log_service import CallLogService
from backend.middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/calls", tags=["Call Logs"])


# =============================================================================
# FIX: DateTime Serialization Helper
# =============================================================================

def sanitize_datetime_fields(data: Any) -> Any:
    """
    Recursively convert datetime objects to ISO format strings.
    
    This fixes the "Object of type datetime is not JSON serializable" error
    that occurs when Supabase returns datetime objects.
    """
    if data is None:
        return None
    
    if isinstance(data, datetime):
        return data.isoformat()
    
    if isinstance(data, dict):
        return {key: sanitize_datetime_fields(value) for key, value in data.items()}
    
    if isinstance(data, list):
        return [sanitize_datetime_fields(item) for item in data]
    
    return data


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/log", response_model=CallLogResponse)
async def create_call_log(call_data: CallLogCreate):
    """Create call log entry (no auth - for AI agent)"""
    result = await CallLogService.create_call_log(call_data.model_dump())
    # FIX: Sanitize datetime fields before returning
    return sanitize_datetime_fields(result)


@router.put("/log/{call_log_id}", response_model=CallLogResponse)
async def update_call_log(
    call_log_id: str,
    update_data: CallLogUpdate
):
    """
    Update call log (no auth - for AI agent)
    
    This endpoint is called when a call ends to record:
    - call_duration: Duration in seconds
    - outcome: What happened (appointment_booked, general_inquiry, etc.)
    - transcript: Full conversation transcript
    - ended_at: When the call ended
    """
    result = await CallLogService.update_call_log(
        call_log_id, 
        update_data.model_dump(exclude_unset=True)
    )
    # FIX: Sanitize datetime fields before returning
    return sanitize_datetime_fields(result)


@router.get("/business/{business_id}")
async def get_business_calls(
    business_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user)
):
    """Get call logs for business"""
    result = await CallLogService.get_business_calls(
        business_id, current_user["id"], start_date, end_date, limit, offset
    )
    # FIX: Sanitize datetime fields before returning
    return sanitize_datetime_fields(result)


@router.get("/{call_log_id}", response_model=CallLogResponse)
async def get_call_log(
    call_log_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get single call log"""
    result = await CallLogService.get_call_log(call_log_id, current_user["id"])
    # FIX: Sanitize datetime fields before returning
    return sanitize_datetime_fields(result)
