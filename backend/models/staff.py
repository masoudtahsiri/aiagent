from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, time


class StaffBase(BaseModel):
    name: str
    title: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    color_code: Optional[str] = "#3b82f6"  # Default blue color


class StaffCreate(StaffBase):
    business_id: str


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    color_code: Optional[str] = None
    is_active: Optional[bool] = None


class StaffResponse(StaffBase):
    id: str
    business_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Availability Models

class AvailabilityTemplateBase(BaseModel):
    day_of_week: int  # 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time: str   # "09:00"
    end_time: str     # "17:00"
    slot_duration_minutes: int = 30


class AvailabilityTemplateCreate(AvailabilityTemplateBase):
    staff_id: str


class AvailabilityTemplateUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class AvailabilityTemplateResponse(AvailabilityTemplateBase):
    id: str
    staff_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Exception Models (time off, holidays)

class AvailabilityExceptionBase(BaseModel):
    exception_date: str  # "2025-12-25"
    exception_type: str  # "closed", "custom_hours", "lunch_break"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: Optional[str] = None


class AvailabilityExceptionCreate(AvailabilityExceptionBase):
    staff_id: str


class AvailabilityExceptionResponse(AvailabilityExceptionBase):
    id: str
    staff_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Bulk availability creation

class BulkAvailabilityCreate(BaseModel):
    staff_id: str
    templates: List[AvailabilityTemplateBase]































