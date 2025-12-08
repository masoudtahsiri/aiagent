from fastapi import APIRouter, Depends, Query
import sys
from pathlib import Path
from typing import List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from models.staff import (
    StaffCreate, StaffUpdate, StaffResponse,
    AvailabilityTemplateCreate, AvailabilityTemplateUpdate, AvailabilityTemplateResponse,
    AvailabilityExceptionCreate, AvailabilityExceptionResponse,
    BulkAvailabilityCreate
)
from services.staff_service import StaffService
from middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/staff", tags=["Staff Management"])


# Staff CRUD

@router.post("", response_model=StaffResponse)
async def create_staff(
    staff_data: StaffCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create a new staff member
    
    - **name**: Staff member's name
    - **title**: Job title (Doctor, Stylist, Attorney, etc.)
    - **specialty**: Specialty or area of expertise (optional)
    """
    staff_dict = staff_data.model_dump()
    return await StaffService.create_staff(staff_dict, current_user["id"])


@router.get("/business/{business_id}", response_model=List[StaffResponse])
async def get_business_staff(
    business_id: str,
    include_inactive: bool = Query(False),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all staff for a business
    """
    return await StaffService.get_business_staff(business_id, current_user["id"], include_inactive)


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get staff member by ID
    """
    return await StaffService.get_staff(staff_id, current_user["id"])


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    staff_data: StaffUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update staff member
    """
    update_dict = staff_data.model_dump(exclude_unset=True)
    return await StaffService.update_staff(staff_id, update_dict, current_user["id"])


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete/deactivate staff member
    """
    return await StaffService.delete_staff(staff_id, current_user["id"])


# Availability Management

@router.post("/availability", response_model=AvailabilityTemplateResponse)
async def create_availability(
    availability_data: AvailabilityTemplateCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create availability template for staff
    
    - **day_of_week**: 0=Sunday, 1=Monday, ..., 6=Saturday
    - **start_time**: Start time in HH:MM format (e.g., "09:00")
    - **end_time**: End time in HH:MM format (e.g., "17:00")
    - **slot_duration_minutes**: Duration of each appointment slot
    """
    availability_dict = availability_data.model_dump()
    return await StaffService.create_availability_template(availability_dict, current_user["id"])


@router.post("/availability/bulk", response_model=List[AvailabilityTemplateResponse])
async def bulk_create_availability(
    bulk_data: BulkAvailabilityCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create multiple availability templates at once
    
    Example: Set Monday-Friday 9AM-5PM availability
    """
    templates = [template.model_dump() for template in bulk_data.templates]
    return await StaffService.bulk_create_availability(bulk_data.staff_id, templates, current_user["id"])


@router.get("/{staff_id}/availability", response_model=List[AvailabilityTemplateResponse])
async def get_staff_availability(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get availability templates for staff
    """
    return await StaffService.get_staff_availability(staff_id, current_user["id"])


@router.put("/availability/{template_id}", response_model=AvailabilityTemplateResponse)
async def update_availability(
    template_id: str,
    availability_data: AvailabilityTemplateUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update availability template
    """
    update_dict = availability_data.model_dump(exclude_unset=True)
    return await StaffService.update_availability_template(template_id, update_dict, current_user["id"])


@router.delete("/availability/{template_id}")
async def delete_availability(
    template_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete availability template
    """
    return await StaffService.delete_availability_template(template_id, current_user["id"])


# Availability Exceptions (Time Off, Holidays)

@router.post("/exceptions", response_model=AvailabilityExceptionResponse)
async def create_exception(
    exception_data: AvailabilityExceptionCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create availability exception (time off, holiday, etc.)
    
    - **exception_type**: "closed", "custom_hours", "lunch_break"
    - **exception_date**: Date in YYYY-MM-DD format
    """
    exception_dict = exception_data.model_dump()
    return await StaffService.create_availability_exception(exception_dict, current_user["id"])


@router.get("/{staff_id}/exceptions", response_model=List[AvailabilityExceptionResponse])
async def get_staff_exceptions(
    staff_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get availability exceptions for staff
    """
    return await StaffService.get_staff_exceptions(staff_id, current_user["id"], start_date, end_date)


@router.post("/{staff_id}/generate-slots")
async def generate_time_slots(
    staff_id: str,
    days_ahead: int = Query(30, le=90),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Generate time slots from availability templates
    (Run this once after setting up availability)
    """
    from datetime import date, timedelta
    from fastapi import HTTPException, status
    
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from database.supabase_client import get_db
    
    db = get_db()
    
    # Verify staff ownership
    await StaffService.get_staff(staff_id, current_user["id"])
    
    # Get staff info
    staff_result = db.table("staff").select("business_id").eq("id", staff_id).execute()
    business_id = staff_result.data[0]["business_id"]
    
    # Get availability templates
    templates = await StaffService.get_staff_availability(staff_id, current_user["id"])
    
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No availability templates found. Please create availability first."
        )
    
    # Generate slots for next N days
    start_date = date.today()
    slots_created = 0
    
    for i in range(days_ahead):
        current_date = start_date + timedelta(days=i)
        day_of_week = current_date.weekday()
        day_of_week = (day_of_week + 1) % 7  # Convert to our format (0=Sunday)
        
        # Find templates for this day
        day_templates = [t for t in templates if t["day_of_week"] == day_of_week]
        
        for template in day_templates:
            # Generate slots for this template
            from datetime import datetime, time as dt_time
            
            start_time_str = template["start_time"]
            if len(start_time_str) == 5:  # "09:00"
                start_time = datetime.strptime(start_time_str, "%H:%M").time()
            else:  # "09:00:00"
                start_time = datetime.strptime(start_time_str, "%H:%M:%S").time()
            
            end_time_str = template["end_time"]
            if len(end_time_str) == 5:  # "17:00"
                end_time = datetime.strptime(end_time_str, "%H:%M").time()
            else:  # "17:00:00"
                end_time = datetime.strptime(end_time_str, "%H:%M:%S").time()
            
            duration = timedelta(minutes=template["slot_duration_minutes"])
            
            current_time = datetime.combine(current_date, start_time)
            end_datetime = datetime.combine(current_date, end_time)
            
            while current_time < end_datetime:
                # Check if slot already exists
                # Store time in HH:MM:SS format to match database
                time_str = current_time.strftime("%H:%M:%S")
                existing = db.table("time_slots").select("id").eq("staff_id", staff_id).eq("date", str(current_date)).eq("time", time_str).execute()
                
                if not existing.data:
                    # Create slot
                    db.table("time_slots").insert({
                        "staff_id": staff_id,
                        "business_id": business_id,
                        "date": str(current_date),
                        "time": time_str,
                        "duration_minutes": template["slot_duration_minutes"],
                        "is_booked": False,
                        "is_blocked": False
                    }).execute()
                    slots_created += 1
                
                current_time += duration
    
    return {
        "message": f"Successfully generated {slots_created} time slots",
        "staff_id": staff_id,
        "days_ahead": days_ahead
    }

