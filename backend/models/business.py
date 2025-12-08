from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class BusinessBase(BaseModel):
    business_name: str
    industry: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    website: Optional[str] = None
    timezone: str = "America/New_York"


class BusinessCreate(BusinessBase):
    owner_email: EmailStr


class BusinessUpdate(BaseModel):
    business_name: Optional[str] = None
    industry: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = None


class BusinessResponse(BusinessBase):
    id: str
    owner_email: str
    subscription_tier: str
    subscription_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

