from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date


class CustomerBase(BaseModel):
    phone: str
    email: Optional[EmailStr] = None
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    business_id: str


class CustomerUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: str
    business_id: str
    total_appointments: int
    total_spent: float
    last_visit_date: Optional[date]
    customer_since: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class CustomerLookup(BaseModel):
    """For AI agent to check if customer exists"""
    phone: str
    business_id: str


class CustomerLookupResponse(BaseModel):
    exists: bool
    customer: Optional[CustomerResponse] = None


