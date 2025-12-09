from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import date

from backend.models.appointment import (
    AppointmentCreate, AppointmentUpdate, AppointmentResponse,
    AppointmentWithDetails, TimeSlot
)
from backend.services.appointment_service import AppointmentService
from backend.middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/appointments", tags=["Appointment Management"])


@router.get("/staff/{staff_id}/slots", response_model=List[TimeSlot])
async def get_available_slots(
    staff_id: str,
    start_date: date = Query(...),
    end_date: Optional[date] = None
):
    """Get available time slots for staff (no auth required - for AI agent)"""
    return await AppointmentService.get_available_slots(staff_id, start_date, end_date)


@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new appointment"""
    appointment_dict = appointment_data.model_dump()
    return await AppointmentService.create_appointment(appointment_dict, current_user["id"])


@router.get("/business/{business_id}", response_model=List[AppointmentWithDetails])
async def get_business_appointments(
    business_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    staff_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get appointments for business with filters"""
    return await AppointmentService.get_business_appointments(
        business_id, current_user["id"], start_date, end_date, status, staff_id
    )


@router.get("/{appointment_id}", response_model=AppointmentWithDetails)
async def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get appointment by ID"""
    return await AppointmentService.get_appointment(appointment_id, current_user["id"])


@router.put("/{appointment_id}", response_model=AppointmentWithDetails)
async def update_appointment(
    appointment_id: str,
    appointment_data: AppointmentUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update/reschedule appointment"""
    update_dict = appointment_data.model_dump(exclude_unset=True)
    return await AppointmentService.update_appointment(appointment_id, update_dict, current_user["id"])


@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: str,
    cancellation_reason: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user)
):
    """Cancel appointment"""
    return await AppointmentService.cancel_appointment(appointment_id, current_user["id"], cancellation_reason)
