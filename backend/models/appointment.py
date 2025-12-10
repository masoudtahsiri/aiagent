from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class AppointmentBase(BaseModel):
    appointment_date: date
    appointment_time: str  # "09:00"
    duration_minutes: int = 30
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    business_id: str
    customer_id: str
    staff_id: str
    service_id: Optional[str] = None


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    staff_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: str
    business_id: str
    customer_id: str
    staff_id: str
    service_id: Optional[str]
    status: str
    reminder_sent_email: bool
    reminder_sent_call: bool
    reminder_sent_sms: bool
    created_via: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AppointmentWithDetails(AppointmentResponse):
    """Appointment with customer and staff details"""
    customer_name: str
    customer_phone: str
    customer_email: Optional[str]
    staff_name: str
    staff_title: str


class TimeSlot(BaseModel):
    """Available time slot"""
    id: str
    staff_id: str
    date: date
    time: str
    duration_minutes: int
    is_booked: bool





