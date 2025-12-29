"""Business hours endpoints"""

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from pydantic import BaseModel

from backend.models.business_hours import BusinessHoursSet, BusinessClosureCreate, BusinessClosureResponse, BusinessHourEntry
from backend.services.business_hours_service import BusinessHoursService
from backend.middleware.auth import get_current_active_user

router = APIRouter(prefix="/api/business-hours", tags=["Business Hours"])


class SyncHolidaysRequest(BaseModel):
    country_code: str


# =============================================================================
# CLOSURES - Static paths must come BEFORE dynamic /{business_id} paths
# =============================================================================

@router.post("/sync-holidays")
async def sync_holidays(
    request: SyncHolidaysRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Sync holidays for a country - deletes existing and adds new holidays"""
    return await BusinessHoursService.sync_holidays_for_country(
        request.country_code,
        current_user["id"]
    )


@router.post("/closures", response_model=BusinessClosureResponse)
async def add_closure(
    closure_data: BusinessClosureCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Add a business closure"""
    return await BusinessHoursService.add_closure(closure_data.model_dump(), current_user["id"])


@router.delete("/closures/{closure_id}")
async def delete_closure(
    closure_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a business closure"""
    return await BusinessHoursService.delete_closure(closure_id, current_user["id"])


# =============================================================================
# BUSINESS HOURS - Dynamic paths come after static paths
# =============================================================================

@router.get("/{business_id}", response_model=List[BusinessHourEntry])
async def get_business_hours(business_id: str):
    """Get business hours (no auth - for AI agent)"""
    return await BusinessHoursService.get_business_hours(business_id)


@router.post("/{business_id}")
async def set_business_hours(
    business_id: str,
    hours_data: BusinessHoursSet,
    current_user: dict = Depends(get_current_active_user)
):
    """Set business hours (replaces all existing)"""
    return await BusinessHoursService.set_business_hours(
        business_id,
        [h.model_dump() for h in hours_data.hours],
        current_user["id"]
    )


@router.get("/{business_id}/closures", response_model=List[BusinessClosureResponse])
async def get_business_closures(
    business_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get business closures (no auth - for AI agent)"""
    return await BusinessHoursService.get_business_closures(business_id, start_date, end_date)
