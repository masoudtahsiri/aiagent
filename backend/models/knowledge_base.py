"""Knowledge base models"""

from pydantic import BaseModel

from typing import Optional, List

from datetime import datetime





class FAQBase(BaseModel):

    category: Optional[str] = None

    question: str

    answer: str

    keywords: Optional[List[str]] = None





class FAQCreate(FAQBase):

    business_id: str





class FAQUpdate(BaseModel):

    category: Optional[str] = None

    question: Optional[str] = None

    answer: Optional[str] = None

    keywords: Optional[List[str]] = None

    is_active: Optional[bool] = None





class FAQResponse(FAQBase):

    id: str

    business_id: str

    is_active: bool

    created_at: datetime

    updated_at: datetime

    

    class Config:

        from_attributes = True



































