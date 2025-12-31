from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List, Optional
from datetime import date, timedelta, datetime

from backend.models.staff import (
    StaffCreate, StaffUpdate, StaffResponse,
    AvailabilityTemplateCreate, AvailabilityTemplateUpdate, AvailabilityTemplateResponse,
    AvailabilityExceptionCreate, AvailabilityExceptionResponse,
    BulkAvailabilityCreate,
    StaffTimeOffCreate, StaffTimeOffUpdate, StaffTimeOffResponse,
    BulkStaffAvailabilityUpdate, StaffAvailabilityValidationResponse
)
from backend.services.staff_service import StaffService
from backend.database.supabase_client import get_db
from backend.middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/staff", tags=["Staff Management"])


@router.post("", response_model=StaffResponse)
async def create_staff(
    staff_data: StaffCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new staff member"""
    staff_dict = staff_data.model_dump()
    return await StaffService.create_staff(staff_dict, current_user["id"])


@router.get("/business/{business_id}", response_model=List[StaffResponse])
async def get_business_staff(
    business_id: str,
    include_inactive: bool = Query(False),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all staff for a business"""
    return await StaffService.get_business_staff(business_id, current_user["id"], include_inactive)


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get staff member by ID"""
    return await StaffService.get_staff(staff_id, current_user["id"])


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    staff_data: StaffUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update staff member"""
    update_dict = staff_data.model_dump(exclude_unset=True)
    return await StaffService.update_staff(staff_id, update_dict, current_user["id"])


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete/deactivate staff member"""
    return await StaffService.delete_staff(staff_id, current_user["id"])


# Availability Management

@router.post("/availability", response_model=AvailabilityTemplateResponse)
async def create_availability(
    availability_data: AvailabilityTemplateCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create availability template for staff"""
    availability_dict = availability_data.model_dump()
    return await StaffService.create_availability_template(availability_dict, current_user["id"])


@router.post("/availability/bulk", response_model=List[AvailabilityTemplateResponse])
async def bulk_create_availability(
    bulk_data: BulkAvailabilityCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create multiple availability templates at once"""
    templates = [template.model_dump() for template in bulk_data.templates]
    return await StaffService.bulk_create_availability(bulk_data.staff_id, templates, current_user["id"])


@router.get("/{staff_id}/availability", response_model=List[AvailabilityTemplateResponse])
async def get_staff_availability(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get availability templates for staff"""
    return await StaffService.get_staff_availability(staff_id, current_user["id"])


@router.put("/availability/{template_id}", response_model=AvailabilityTemplateResponse)
async def update_availability(
    template_id: str,
    availability_data: AvailabilityTemplateUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update availability template"""
    update_dict = availability_data.model_dump(exclude_unset=True)
    return await StaffService.update_availability_template(template_id, update_dict, current_user["id"])


@router.delete("/availability/{template_id}")
async def delete_availability(
    template_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete availability template"""
    return await StaffService.delete_availability_template(template_id, current_user["id"])


# Availability Exceptions

@router.post("/exceptions", response_model=AvailabilityExceptionResponse)
async def create_exception(
    exception_data: AvailabilityExceptionCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create availability exception (time off, holiday, etc.)"""
    exception_dict = exception_data.model_dump()
    return await StaffService.create_availability_exception(exception_dict, current_user["id"])


@router.get("/{staff_id}/exceptions", response_model=List[AvailabilityExceptionResponse])
async def get_staff_exceptions(
    staff_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get availability exceptions for staff"""
    return await StaffService.get_staff_exceptions(staff_id, current_user["id"], start_date, end_date)


# Staff-Services Management

@router.get("/{staff_id}/services")
async def get_staff_services(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get services that a staff member can perform"""
    return await StaffService.get_staff_services(staff_id, current_user["id"])


@router.put("/{staff_id}/services")
async def update_staff_services(
    staff_id: str,
    service_ids: List[str],
    current_user: dict = Depends(get_current_active_user)
):
    """Update services that a staff member can perform"""
    return await StaffService.update_staff_services(staff_id, service_ids, current_user["id"])


@router.post("/{staff_id}/generate-slots")
async def generate_time_slots(
    staff_id: str,
    days_ahead: int = Query(30, le=90),
    current_user: dict = Depends(get_current_active_user)
):
    """Generate time slots from availability templates"""
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
            start_time_str = template["start_time"]
            if len(start_time_str) == 5:
                start_time = datetime.strptime(start_time_str, "%H:%M").time()
            else:
                start_time = datetime.strptime(start_time_str, "%H:%M:%S").time()

            end_time_str = template["end_time"]
            if len(end_time_str) == 5:
                end_time = datetime.strptime(end_time_str, "%H:%M").time()
            else:
                end_time = datetime.strptime(end_time_str, "%H:%M:%S").time()

            duration = timedelta(minutes=template["slot_duration_minutes"])

            current_time = datetime.combine(current_date, start_time)
            end_datetime = datetime.combine(current_date, end_time)

            while current_time < end_datetime:
                time_str = current_time.strftime("%H:%M:%S")
                existing = db.table("time_slots").select("id").eq("staff_id", staff_id).eq("date", str(current_date)).eq("time", time_str).execute()

                if not existing.data:
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


# Time Off Management

@router.post("/time-offs")
async def create_time_off(
    time_off_data: StaffTimeOffCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a time off entry for staff member"""
    data = time_off_data.model_dump()
    return await StaffService.create_time_off(data, current_user["id"])


@router.get("/{staff_id}/time-offs")
async def get_staff_time_offs(
    staff_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get time off entries for a staff member"""
    return await StaffService.get_staff_time_offs(staff_id, current_user["id"], start_date, end_date)


@router.delete("/time-offs/{time_off_id}")
async def delete_time_off(
    time_off_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a time off entry"""
    return await StaffService.delete_time_off(time_off_id, current_user["id"])


@router.delete("/{staff_id}/time-offs/range")
async def delete_time_off_range(
    staff_id: str,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete all time off entries in a date range"""
    return await StaffService.delete_time_off_range(staff_id, start_date, end_date, current_user["id"])


# Availability with Business Hours Validation

@router.get("/{staff_id}/business-hours")
async def get_business_hours_for_staff(
    staff_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get business hours for the staff's business (for validation)"""
    return await StaffService.get_business_hours_for_staff(staff_id, current_user["id"])


@router.post("/{staff_id}/availability/validate")
async def validate_staff_availability(
    staff_id: str,
    schedule_data: BulkStaffAvailabilityUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Validate staff availability against business hours"""
    schedule = [entry.model_dump() for entry in schedule_data.schedule]
    is_valid, errors, warnings = await StaffService.validate_availability_against_business_hours(
        staff_id, schedule, current_user["id"]
    )
    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
    }


@router.put("/{staff_id}/availability/schedule")
async def update_staff_availability_schedule(
    staff_id: str,
    schedule_data: BulkStaffAvailabilityUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update staff availability with business hours validation"""
    schedule = [entry.model_dump() for entry in schedule_data.schedule]
    return await StaffService.update_staff_availability_with_validation(
        staff_id, schedule, current_user["id"]
    )
