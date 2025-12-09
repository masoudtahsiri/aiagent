"""Call log models"""

from pydantic import BaseModel

from typing import Optional

from datetime import datetime





class CallLogCreate(BaseModel):

    business_id: str

    customer_id: Optional[str] = None

    caller_phone: str

    call_direction: str = "inbound"

    current_role_id: Optional[str] = None





class CallLogUpdate(BaseModel):

    customer_id: Optional[str] = None

    call_status: Optional[str] = None

    call_duration: Optional[int] = None

    transcript: Optional[str] = None

    outcome: Optional[str] = None

    ended_at: Optional[datetime] = None





class CallLogResponse(BaseModel):

    id: str

    business_id: str

    customer_id: Optional[str]

    caller_phone: str

    call_direction: str

    call_status: Optional[str]

    call_duration: Optional[int]

    transcript: Optional[str]

    outcome: Optional[str]

    started_at: Optional[datetime]

    ended_at: Optional[datetime]

    created_at: datetime

    

    class Config:

        from_attributes = True

