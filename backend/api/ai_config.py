"""
AI Configuration Endpoints - Optimized Version

Key Optimizations:
1. Batch database queries where possible
2. In-memory caching for business configs (60 second TTL)
3. Selective field loading (don't fetch unnecessary data)
4. Parallel async operations for independent queries
5. Early termination for not-found cases

All endpoints maintain backward compatibility.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import asyncio
from datetime import date as date_type, datetime
from functools import lru_cache
import time
import logging

from backend.models.ai_config import AIRoleCreate, AIRoleUpdate, AIRoleResponse
from backend.models.business import PhoneNumberLookup
from backend.database.supabase_client import get_db
from backend.middleware.auth import get_current_active_user

router = APIRouter(prefix="/api/ai", tags=["AI Configuration"])
logger = logging.getLogger(__name__)

# =============================================================================
# SIMPLE IN-MEMORY CACHE
# =============================================================================

class BusinessConfigCache:
    """Simple TTL cache for business configs"""
    
    def __init__(self, ttl_seconds: int = 60):
        self._cache = {}
        self._timestamps = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str):
        """Get cached value if not expired"""
        if key in self._cache:
            if time.time() - self._timestamps[key] < self.ttl:
                return self._cache[key]
            # Expired - remove
            del self._cache[key]
            del self._timestamps[key]
        return None
    
    def set(self, key: str, value):
        """Cache a value"""
        self._cache[key] = value
        self._timestamps[key] = time.time()
    
    def invalidate(self, key: str):
        """Remove from cache"""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)


# Global cache instance
_config_cache = BusinessConfigCache(ttl_seconds=60)


# =============================================================================
# OPTIMIZED LOOKUP ENDPOINT
# =============================================================================

@router.post("/lookup-by-phone")
async def lookup_business_by_phone(lookup: PhoneNumberLookup):
    """
    Lookup business by AI phone number (for agent routing - no auth)

    Optimizations:
    - Caches result for 60 seconds
    - Batches related queries
    - Only fetches active/upcoming data
    
    Returns complete business configuration including:
    - Business details
    - AI roles
    - Staff with services and availability
    - Services
    - Business hours
    - Business closures (holidays, special closures)
    - Knowledge base / FAQs
    """
    start = time.perf_counter()
    cache_hit = False
    
    # Check cache first
    cache_key = f"biz_phone:{lookup.phone_number}"
    cached = _config_cache.get(cache_key)
    if cached:
        cache_hit = True
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(f"lookup_business_by_phone: {elapsed:.1f}ms (cache: {cache_hit})")
        return cached
    
    db = get_db()
    
    # Step 1: Get business (required)
    result = db.table("businesses").select(
        "id, business_name, industry, phone_number, ai_phone_number, "
        "address, city, state, zip_code, website, timezone"
    ).eq("ai_phone_number", lookup.phone_number).eq("is_active", True).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found for this phone number"
        )
    
    business = result.data[0]
    business_id = business["id"]
    today = date_type.today().isoformat()
    
    # Step 2: Batch fetch all related data in parallel
    # These queries are independent and can run concurrently
    # Note: Supabase operations are synchronous, so we use to_thread to parallelize
    
    def fetch_ai_roles():
        return db.table("ai_roles").select(
            "id, business_id, role_type, ai_personality_name, voice_style, "
            "system_prompt, greeting_message, is_enabled, priority"
        ).eq("business_id", business_id).eq("is_enabled", True).order("priority").execute()
    
    def fetch_staff():
        return db.table("staff").select(
            "id, name, title, specialty, bio, email, phone"
        ).eq("business_id", business_id).eq("is_active", True).execute()
    
    def fetch_services():
        return db.table("services").select(
            "id, name, description, duration_minutes, price, category"
        ).eq("business_id", business_id).eq("is_active", True).order("category").order("name").execute()
    
    def fetch_hours():
        return db.table("business_hours").select(
            "day_of_week, is_open, open_time, close_time"
        ).eq("business_id", business_id).order("day_of_week").execute()
    
    def fetch_closures():
        return db.table("business_closures").select(
            "closure_date, reason"
        ).eq("business_id", business_id).gte("closure_date", today).order("closure_date").limit(10).execute()
    
    def fetch_knowledge():
        return db.table("knowledge_base").select(
            "id, category, question, answer"
        ).eq("business_id", business_id).eq("is_active", True).limit(20).execute()
    
    # Run all queries in parallel using thread pool
    (
        roles_result,
        staff_result,
        services_result,
        hours_result,
        closures_result,
        kb_result
    ) = await asyncio.gather(
        asyncio.to_thread(fetch_ai_roles),
        asyncio.to_thread(fetch_staff),
        asyncio.to_thread(fetch_services),
        asyncio.to_thread(fetch_hours),
        asyncio.to_thread(fetch_closures),
        asyncio.to_thread(fetch_knowledge),
    )
    
    # Process AI roles
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
    
    # Process services
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
    
    # Build service ID set for staff lookup
    service_ids_set = {s["id"] for s in services}
    
    # Process staff with their services and availability
    staff_list = []
    staff_ids = [s["id"] for s in (staff_result.data or [])]
    
    if staff_ids:
        # Batch fetch staff services and availability
        staff_services_result = db.table("staff_services").select(
            "staff_id, service_id"
        ).in_("staff_id", staff_ids).execute()
        
        availability_result = db.table("availability_templates").select(
            "staff_id, day_of_week, start_time, end_time, slot_duration_minutes"
        ).in_("staff_id", staff_ids).eq("is_active", True).order("day_of_week").execute()
        
        exceptions_result = db.table("availability_exceptions").select(
            "staff_id, exception_date, exception_type, reason, start_time, end_time"
        ).in_("staff_id", staff_ids).gte("exception_date", today).order("exception_date").execute()
        
        # Build lookup maps
        staff_services_map = {}
        for ss in (staff_services_result.data or []):
            sid = ss["staff_id"]
            if sid not in staff_services_map:
                staff_services_map[sid] = []
            staff_services_map[sid].append(ss["service_id"])
        
        availability_map = {}
        for avail in (availability_result.data or []):
            sid = avail["staff_id"]
            if sid not in availability_map:
                availability_map[sid] = []
            availability_map[sid].append({
                "day_of_week": avail["day_of_week"],
                "start_time": avail["start_time"],
                "end_time": avail["end_time"],
                "slot_duration_minutes": avail.get("slot_duration_minutes", 30)
            })
        
        exceptions_map = {}
        for exc in (exceptions_result.data or []):
            sid = exc["staff_id"]
            if sid not in exceptions_map:
                exceptions_map[sid] = []
            exceptions_map[sid].append({
                "date": exc["exception_date"],
                "type": exc["exception_type"],
                "reason": exc.get("reason"),
                "start_time": exc.get("start_time"),
                "end_time": exc.get("end_time")
            })
        
        # Build staff list
        for staff in (staff_result.data or []):
            staff_id = staff["id"]
        staff_list.append({
            "id": staff_id,
            "name": staff["name"],
            "title": staff["title"],
            "specialty": staff.get("specialty"),
            "bio": staff.get("bio"),
            "email": staff.get("email"),
            "phone": staff.get("phone"),
                "service_ids": staff_services_map.get(staff_id, []),
                "availability_schedule": availability_map.get(staff_id, []),
                "availability_exceptions": exceptions_map.get(staff_id, [])
        })
    
    # Process business hours
    business_hours = []
    for h in (hours_result.data if hours_result.data else []):
        business_hours.append({
            "day_of_week": h["day_of_week"],
            "is_open": h["is_open"],
            "open_time": h.get("open_time"),
            "close_time": h.get("close_time")
        })
    
    # Process closures
    business_closures = []
    for closure in (closures_result.data or []):
        business_closures.append({
            "date": closure["closure_date"],
            "reason": closure.get("reason")
        })
    
    # Process knowledge base
    knowledge_base = []
    for kb in (kb_result.data if kb_result.data else []):
        knowledge_base.append({
            "id": kb["id"],
            "category": kb.get("category"),
            "question": kb["question"],
            "answer": kb["answer"]
        })
    
    # Build response
    response = {
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

    # Cache the result
    _config_cache.set(cache_key, response)
    
    # Log timing
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(f"lookup_business_by_phone: {elapsed:.1f}ms (cache: {cache_hit})")
    
    return response


# =============================================================================
# OTHER ENDPOINTS (unchanged but with cache invalidation)
# =============================================================================

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
    
    # Invalidate cache for this business
    biz_result = db.table("businesses").select("ai_phone_number").eq("id", role_data.business_id).execute()
    if biz_result.data and biz_result.data[0].get("ai_phone_number"):
        _config_cache.invalidate(f"biz_phone:{biz_result.data[0]['ai_phone_number']}")
    
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
    
    # Invalidate cache
    biz_result = db.table("businesses").select("ai_phone_number").eq("id", role["business_id"]).execute()
    if biz_result.data and biz_result.data[0].get("ai_phone_number"):
        _config_cache.invalidate(f"biz_phone:{biz_result.data[0]['ai_phone_number']}")
    
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
