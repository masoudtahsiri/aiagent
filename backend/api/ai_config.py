from fastapi import APIRouter, Depends, HTTPException, status
import sys
from pathlib import Path
from typing import List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.ai_config import AIRoleCreate, AIRoleUpdate, AIRoleResponse
from models.business import PhoneNumberLookup
from database.supabase_client import get_db
from middleware.auth import get_current_active_user

router = APIRouter(prefix="/api/ai", tags=["AI Configuration"])


@router.post("/lookup-by-phone")
async def lookup_business_by_phone(lookup: PhoneNumberLookup):
    """
    Lookup business by AI phone number (for agent routing)
    NO AUTHENTICATION - used by AI agent
    """
    db = get_db()
    
    # Find business by AI phone number
    result = db.table("businesses").select("*").eq("ai_phone_number", lookup.phone_number).eq("is_active", True).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found for this phone number"
        )
    
    business = result.data[0]
    
    # Get AI roles for this business
    roles_result = db.table("ai_roles").select("*").eq("business_id", business["id"]).eq("is_enabled", True).order("priority").execute()
    
    # Get active staff
    staff_result = db.table("staff").select("*").eq("business_id", business["id"]).eq("is_active", True).execute()
    
    # Map AI roles from database format to API format
    ai_roles = []
    for role in (roles_result.data if roles_result.data else []):
        ai_roles.append({
            "id": role["id"],
            "business_id": role["business_id"],
            "role_type": role["role_type"],
            "ai_name": role.get("ai_personality_name", role.get("role_name", "Assistant")),
            "voice_style": role["voice_style"],
            "system_prompt": role["system_prompt"],
            "greeting_message": role.get("greeting_message", ""),
            "is_enabled": role["is_enabled"],
            "priority": role.get("priority", 0)
        })
    
    return {
        "business": business,
        "ai_roles": ai_roles,
        "staff": staff_result.data if staff_result.data else []
    }


@router.post("/roles", response_model=AIRoleResponse)
async def create_ai_role(
    role_data: AIRoleCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create AI role configuration"""
    db = get_db()
    
    # Verify user owns this business
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    
    if not user_result.data or user_result.data[0].get("business_id") != role_data.business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Map model fields to database fields
    role_dict = {
        "business_id": role_data.business_id,
        "role_type": role_data.role_type,
        "ai_personality_name": role_data.ai_name,
        "voice_style": role_data.voice_style,
        "system_prompt": role_data.system_prompt,
        "greeting_message": role_data.greeting_message,
        "is_enabled": role_data.is_enabled,
        "priority": 0  # Default priority
    }
    
    result = db.table("ai_roles").insert(role_dict).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create AI role"
        )
    
    # Map response back to model format
    role = result.data[0]
    return {
        "id": role["id"],
        "business_id": role["business_id"],
        "role_type": role["role_type"],
        "ai_name": role["ai_personality_name"],
        "voice_style": role["voice_style"],
        "system_prompt": role["system_prompt"],
        "greeting_message": role["greeting_message"],
        "is_enabled": role["is_enabled"],
        "priority": role.get("priority", 0)
    }


@router.get("/roles/{business_id}", response_model=List[AIRoleResponse])
async def get_business_ai_roles(
    business_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all AI roles for a business"""
    db = get_db()
    
    # Verify user owns this business
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    
    if not user_result.data or user_result.data[0].get("business_id") != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    result = db.table("ai_roles").select("*").eq("business_id", business_id).order("priority").execute()
    
    # Map database fields to model format
    roles = []
    for role in (result.data if result.data else []):
        roles.append({
            "id": role["id"],
            "business_id": role["business_id"],
            "role_type": role["role_type"],
            "ai_name": role["ai_personality_name"],
            "voice_style": role["voice_style"],
            "system_prompt": role["system_prompt"],
            "greeting_message": role["greeting_message"],
            "is_enabled": role["is_enabled"],
            "priority": role.get("priority", 0)
        })
    
    return roles


@router.put("/roles/{role_id}", response_model=AIRoleResponse)
async def update_ai_role(
    role_id: str,
    role_data: AIRoleUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update AI role configuration"""
    db = get_db()
    
    # Get role to verify ownership
    role_result = db.table("ai_roles").select("*").eq("id", role_id).execute()
    
    if not role_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI role not found"
        )
    
    role = role_result.data[0]
    
    # Verify user owns this business
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    
    if not user_result.data or user_result.data[0].get("business_id") != role["business_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Map model fields to database fields
    update_dict = {}
    if role_data.ai_name is not None:
        update_dict["ai_personality_name"] = role_data.ai_name
    if role_data.voice_style is not None:
        update_dict["voice_style"] = role_data.voice_style
    if role_data.system_prompt is not None:
        update_dict["system_prompt"] = role_data.system_prompt
    if role_data.greeting_message is not None:
        update_dict["greeting_message"] = role_data.greeting_message
    if role_data.is_enabled is not None:
        update_dict["is_enabled"] = role_data.is_enabled
    
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    result = db.table("ai_roles").update(update_dict).eq("id", role_id).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI role not found"
        )
    
    # Map response back to model format
    updated_role = result.data[0]
    return {
        "id": updated_role["id"],
        "business_id": updated_role["business_id"],
        "role_type": updated_role["role_type"],
        "ai_name": updated_role["ai_personality_name"],
        "voice_style": updated_role["voice_style"],
        "system_prompt": updated_role["system_prompt"],
        "greeting_message": updated_role["greeting_message"],
        "is_enabled": updated_role["is_enabled"],
        "priority": updated_role.get("priority", 0)
    }

