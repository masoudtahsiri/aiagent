from pydantic import BaseModel
from typing import Optional, List


class AIRoleConfig(BaseModel):
    """AI personality configuration per business"""
    role_type: str  # "receptionist", "sales", "support"
    ai_name: str  # "Sarah", "Mike", etc.
    voice_style: str  # "Kore", "Puck", "Charon", "Fenrir", "Aoede"
    system_prompt: str
    greeting_message: str
    is_enabled: bool = True


class AIRoleCreate(AIRoleConfig):
    business_id: str


class AIRoleUpdate(BaseModel):
    ai_name: Optional[str] = None
    voice_style: Optional[str] = None
    system_prompt: Optional[str] = None
    greeting_message: Optional[str] = None
    is_enabled: Optional[bool] = None


class AIRoleResponse(AIRoleConfig):
    id: str
    business_id: str
    priority: int
    
    class Config:
        from_attributes = True













