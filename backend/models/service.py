"""Service models"""

from pydantic import BaseModel

from typing import Optional

from datetime import datetime





class ServiceBase(BaseModel):

    name: str

    description: Optional[str] = None

    duration_minutes: int

    price: Optional[float] = None

    category: Optional[str] = None





class ServiceCreate(ServiceBase):

    business_id: str





class ServiceUpdate(BaseModel):

    name: Optional[str] = None

    description: Optional[str] = None

    duration_minutes: Optional[int] = None

    price: Optional[float] = None

    category: Optional[str] = None

    is_active: Optional[bool] = None





class ServiceResponse(ServiceBase):

    id: str

    business_id: str

    is_active: bool

    requires_staff: bool

    created_at: datetime

    updated_at: datetime

    

    class Config:

        from_attributes = True


































