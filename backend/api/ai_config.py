from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from backend.models.ai_config import AIRoleCreate, AIRoleUpdate, AIRoleResponse
from backend.models.business import PhoneNumberLookup
from backend.database.supabase_client import get_db
from backend.middleware.auth import get_current_active_user

router = APIRouter(prefix="/api/ai", tags=["AI Configuration"])


@router.post("/lookup-by-phone")
async def lookup_business_by_phone(lookup: PhoneNumberLookup):
    """Lookup business by AI phone number (for agent routing - no auth)

    
    Returns complete business configuration including:
    - Business details
    - AI roles
    - Staff with services and availability
    - Services
    - Business hours
    - Business closures (holidays, special closures)
    - Knowledge base / FAQs
    """
    db = get_db()
    
    result = db.table("businesses").select("*").eq("ai_phone_number", lookup.phone_number).eq("is_active", True).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found for this phone number"
        )
    
    business = result.data[0]
    business_id = business["id"]
    
    # Get AI roles
    roles_result = db.table("ai_roles").select("*").eq("business_id", business_id).eq("is_enabled", True).order("priority").execute()
    
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
    
    # Get staff with full details
    staff_result = db.table("staff").select("*").eq("business_id", business_id).eq("is_active", True).execute()
    
    staff_list = []
    for staff in (staff_result.data if staff_result.data else []):
        staff_id = staff["id"]
        
        # Get services this staff can perform
        staff_services_result = db.table("staff_services").select("service_id").eq("staff_id", staff_id).execute()
        service_ids = [ss["service_id"] for ss in (staff_services_result.data or [])]
        
        # Get staff availability templates (regular schedule)
        availability_result = db.table("availability_templates").select("*").eq("staff_id", staff_id).eq("is_active", True).order("day_of_week").execute()
        
        availability_schedule = []
        for avail in (availability_result.data or []):
            availability_schedule.append({
                "day_of_week": avail["day_of_week"],
                "start_time": avail["start_time"],
                "end_time": avail["end_time"],
                "slot_duration_minutes": avail.get("slot_duration_minutes", 30)
            })
        
        # Get staff exceptions (vacation, sick days, etc.) - upcoming only
        from datetime import date as date_type
        today = date_type.today().isoformat()
        
        exceptions_result = db.table("availability_exceptions").select("*").eq("staff_id", staff_id).gte("exception_date", today).order("exception_date").execute()
        
        availability_exceptions = []
        for exc in (exceptions_result.data or []):
            availability_exceptions.append({
                "date": exc["exception_date"],
                "type": exc["exception_type"],  # 'closed', 'custom_hours', etc.
                "reason": exc.get("reason"),
                "start_time": exc.get("start_time"),
                "end_time": exc.get("end_time")
            })
        
        staff_list.append({
            "id": staff_id,
            "name": staff["name"],
            "title": staff["title"],
            "specialty": staff.get("specialty"),
            "bio": staff.get("bio"),
            "email": staff.get("email"),
            "phone": staff.get("phone"),
            "service_ids": service_ids,
            "availability_schedule": availability_schedule,
            "availability_exceptions": availability_exceptions
        })
    
    # Get services
    services_result = db.table("services").select("*").eq("business_id", business_id).eq("is_active", True).order("category").order("name").execute()
    
    services = []
    for svc in (services_result.data if services_result.data else []):
        services.append({
            "id": svc["id"],
            "name": svc["name"],
            "description": svc.get("description"),
            "duration_minutes": svc["duration_minutes"],
            "price": float(svc["price"]) if svc.get("price") else None,
            "category": svc.get("category")
        })
    
    # Get business hours
    hours_result = db.table("business_hours").select("*").eq("business_id", business_id).order("day_of_week").execute()
    
    business_hours = []
    for h in (hours_result.data if hours_result.data else []):
        business_hours.append({
            "day_of_week": h["day_of_week"],
            "is_open": h["is_open"],
            "open_time": h.get("open_time"),
            "close_time": h.get("close_time")
        })
    
    # Get business closures (holidays, special closures) - upcoming only
    closures_result = db.table("business_closures").select("*").eq("business_id", business_id).gte("closure_date", today).order("closure_date").execute()
    
    business_closures = []
    for closure in (closures_result.data or []):
        business_closures.append({
            "date": closure["closure_date"],
            "reason": closure.get("reason")
        })
    
    # Get knowledge base / FAQs
    kb_result = db.table("knowledge_base").select("*").eq("business_id", business_id).eq("is_active", True).execute()
    
    knowledge_base = []
    for kb in (kb_result.data if kb_result.data else []):
        knowledge_base.append({
            "id": kb["id"],
            "category": kb.get("category"),
            "question": kb["question"],
            "answer": kb["answer"]
        })
    
    return {
        "business": {
            "id": business["id"],
            "business_name": business["business_name"],
            "industry": business.get("industry"),
            "phone_number": business.get("phone_number"),
            "ai_phone_number": business.get("ai_phone_number"),
            "address": business.get("address"),
            "city": business.get("city"),
            "state": business.get("state"),
            "zip_code": business.get("zip_code"),
            "website": business.get("website"),
            "timezone": business.get("timezone", "America/New_York")
        },
        "ai_roles": ai_roles,
        "staff": staff_list,
        "services": services,
        "business_hours": business_hours,
        "business_closures": business_closures,
        "knowledge_base": knowledge_base
    }


@router.post("/roles", response_model=AIRoleResponse)
async def create_ai_role(
    role_data: AIRoleCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create AI role configuration"""
    db = get_db()
    
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    
    if not user_result.data or user_result.data[0].get("business_id") != role_data.business_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    role_dict = {
        "business_id": role_data.business_id,
        "role_type": role_data.role_type,
        "ai_personality_name": role_data.ai_name,
        "voice_style": role_data.voice_style,
        "system_prompt": role_data.system_prompt,
        "greeting_message": role_data.greeting_message,
        "is_enabled": role_data.is_enabled,
        "priority": 0
    }
    
    result = db.table("ai_roles").insert(role_dict).execute()
    
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create AI role")
    
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
    
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    
    if not user_result.data or user_result.data[0].get("business_id") != business_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    result = db.table("ai_roles").select("*").eq("business_id", business_id).order("priority").execute()
    
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
    
    role_result = db.table("ai_roles").select("*").eq("id", role_id).execute()
    
    if not role_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI role not found")
    
    role = role_result.data[0]
    
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    
    if not user_result.data or user_result.data[0].get("business_id") != role["business_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")
    
    result = db.table("ai_roles").update(update_dict).eq("id", role_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI role not found")
    
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
