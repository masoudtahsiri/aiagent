"""Call log endpoints"""

from fastapi import APIRouter, Depends, Query

from typing import Optional



from backend.models.call_log import CallLogCreate, CallLogUpdate, CallLogResponse

from backend.services.call_log_service import CallLogService

from backend.middleware.auth import get_current_active_user



router = APIRouter(prefix="/api/calls", tags=["Call Logs"])





@router.post("/log", response_model=CallLogResponse)

async def create_call_log(call_data: CallLogCreate):

    """Create call log entry (no auth - for AI agent)"""

    return await CallLogService.create_call_log(call_data.model_dump())





@router.put("/log/{call_log_id}", response_model=CallLogResponse)

async def update_call_log(

    call_log_id: str,

    update_data: CallLogUpdate

):

    """Update call log (no auth - for AI agent)"""

    return await CallLogService.update_call_log(call_log_id, update_data.model_dump(exclude_unset=True))





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

    return await CallLogService.get_business_calls(

        business_id, current_user["id"], start_date, end_date, limit, offset

    )





@router.get("/{call_log_id}", response_model=CallLogResponse)

async def get_call_log(

    call_log_id: str,

    current_user: dict = Depends(get_current_active_user)

):

    """Get single call log"""

    return await CallLogService.get_call_log(call_log_id, current_user["id"])

