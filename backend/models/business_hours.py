"""Business hours models"""

from pydantic import BaseModel

from typing import Optional, List

from datetime import datetime





class BusinessHourEntry(BaseModel):

    day_of_week: int  # 0=Sunday, 6=Saturday

    is_open: bool = True

    open_time: Optional[str] = None  # "09:00"

    close_time: Optional[str] = None  # "17:00"





class BusinessHoursSet(BaseModel):

    business_id: str

    hours: List[BusinessHourEntry]





class BusinessClosureCreate(BaseModel):

    business_id: str

    closure_date: str  # "2025-12-25"

    reason: Optional[str] = None





class BusinessClosureResponse(BaseModel):

    id: str

    business_id: str

    closure_date: str

    reason: Optional[str]

    created_at: datetime

    

    class Config:

        from_attributes = True


















