"""
Memory System API Endpoints

Provides endpoints for:
- Getting customer memories, preferences, relationships
- Saving new memories
- Updating preferences with confidence scoring
- Managing customer relationships
- Managing special dates
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/memory", tags=["Memory System"])


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SaveMemoryRequest(BaseModel):
    customer_id: str
    business_id: str
    memory_type: str = Field(..., description="fact, preference, note, issue, positive, conversation, relationship")
    content: str
    importance: int = Field(default=5, ge=1, le=10)
    structured_data: Optional[dict] = None
    source_type: Optional[str] = "call"
    source_id: Optional[str] = None


class SavePreferenceRequest(BaseModel):
    customer_id: str
    business_id: str
    category: str = Field(..., description="scheduling, communication, service, staff, general")
    preference_key: str
    preference_value: str
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class AddRelationshipRequest(BaseModel):
    customer_id: str
    business_id: str
    related_name: str
    relationship_type: str = Field(..., description="spouse, partner, child, parent, sibling, friend, colleague, referral, assistant, other")
    phone: Optional[str] = None
    notes: Optional[str] = None


class AddSpecialDateRequest(BaseModel):
    customer_id: str
    business_id: str
    date_type: str = Field(..., description="birthday, anniversary, membership_start, first_visit, other")
    date_value: str  # YYYY-MM-DD
    year_known: bool = True
    send_reminder: bool = False
    reminder_days_before: int = 7
    description: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def get_db():
    """Get Supabase database client"""
    from backend.database.supabase_client import get_db as get_supabase_db
    return get_supabase_db()


# ═══════════════════════════════════════════════════════════════════════════════
# GET CUSTOMER MEMORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/customer/{customer_id}")
async def get_customer_memory(
    customer_id: str,
    business_id: Optional[str] = Query(None),
    limit: int = Query(default=20, le=100)
):
    """
    Get all memory data for a customer including:
    - Memories (notes, facts, observations)
    - Preferences (structured key-value)
    - Relationships (family, contacts)
    - Special dates (birthdays, anniversaries)
    """
    db = get_db()
    
    # Build query filters
    memory_query = db.table("customer_memory").select("*").eq(
        "customer_id", customer_id
    )
    if business_id:
        memory_query = memory_query.eq("business_id", business_id)
    
    # Get memories (ordered by importance, then date)
    memories_result = memory_query.order(
        "importance", desc=True
    ).order(
        "created_at", desc=True
    ).limit(limit).execute()
    
    # Get preferences
    pref_query = db.table("customer_preferences").select("*").eq(
        "customer_id", customer_id
    )
    if business_id:
        pref_query = pref_query.eq("business_id", business_id)
    prefs_result = pref_query.execute()
    
    # Get relationships
    rel_query = db.table("customer_relationships").select("*").eq(
        "customer_id", customer_id
    )
    if business_id:
        rel_query = rel_query.eq("business_id", business_id)
    rels_result = rel_query.execute()
    
    # Get special dates
    dates_query = db.table("customer_special_dates").select("*").eq(
        "customer_id", customer_id
    )
    if business_id:
        dates_query = dates_query.eq("business_id", business_id)
    dates_result = dates_query.execute()
    
    # Organize preferences by category
    preferences = {}
    for pref in (prefs_result.data or []):
        cat = pref["category"]
        if cat not in preferences:
            preferences[cat] = {}
        preferences[cat][pref["preference_key"]] = pref["preference_value"]
    
    return {
        "memories": memories_result.data or [],
        "preferences": preferences,
        "relationships": rels_result.data or [],
        "special_dates": dates_result.data or []
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SAVE MEMORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/save")
async def save_memory(request: SaveMemoryRequest):
    """
    Save a new memory about a customer.
    
    Memory types:
    - fact: Factual information (birthday, job, etc.)
    - preference: Expressed preferences
    - note: General observations
    - issue: Problems or complaints
    - positive: Positive feedback/experiences
    - conversation: Call summary
    - relationship: Family/relationship info
    """
    db = get_db()
    
    # Validate memory type
    valid_types = ["fact", "preference", "note", "issue", "positive", "conversation", "relationship"]
    if request.memory_type not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid memory_type. Must be one of: {valid_types}"
        )
    
    memory_data = {
        "customer_id": request.customer_id,
        "business_id": request.business_id,
        "memory_type": request.memory_type,
        "content": request.content,
        "importance": request.importance,
        "source_type": request.source_type,
        "source_id": request.source_id,
        "structured_data": request.structured_data
    }
    
    result = db.table("customer_memory").insert(memory_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save memory")
    
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════════════════
# SAVE/UPDATE PREFERENCE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/preference")
async def save_preference(request: SavePreferenceRequest):
    """
    Save or update a customer preference.
    
    If preference exists, updates value and increases confidence.
    If new, creates with provided confidence.
    
    Categories:
    - scheduling: Time/day preferences
    - communication: Contact preferences
    - service: Service preferences
    - staff: Staff preferences
    - general: Other preferences
    """
    db = get_db()
    
    # Validate category
    valid_categories = ["scheduling", "communication", "service", "staff", "general"]
    if request.category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {valid_categories}"
        )
    
    # Check if preference exists
    existing = db.table("customer_preferences").select("id, observation_count, confidence").eq(
        "customer_id", request.customer_id
    ).eq(
        "category", request.category
    ).eq(
        "preference_key", request.preference_key
    ).execute()
    
    if existing.data:
        # Update existing preference
        record = existing.data[0]
        new_count = record["observation_count"] + 1
        
        # Increase confidence slightly with each observation (max 1.0)
        new_confidence = min(record["confidence"] + 0.05, 1.0)
        
        result = db.table("customer_preferences").update({
            "preference_value": request.preference_value,
            "confidence": new_confidence,
            "observation_count": new_count,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", record["id"]).execute()
    else:
        # Create new preference
        result = db.table("customer_preferences").insert({
            "customer_id": request.customer_id,
            "business_id": request.business_id,
            "category": request.category,
            "preference_key": request.preference_key,
            "preference_value": request.preference_value,
            "confidence": request.confidence
        }).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save preference")
    
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════════════════
# GET PREFERENCES
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/preferences/{customer_id}")
async def get_preferences(
    customer_id: str,
    business_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
):
    """
    Get all preferences for a customer, organized by category.
    """
    db = get_db()
    
    query = db.table("customer_preferences").select("*").eq(
        "customer_id", customer_id
    )
    
    if business_id:
        query = query.eq("business_id", business_id)
    if category:
        query = query.eq("category", category)
    
    result = query.execute()
    
    # Organize by category with confidence info
    preferences = {}
    for pref in (result.data or []):
        cat = pref["category"]
        if cat not in preferences:
            preferences[cat] = {}
        preferences[cat][pref["preference_key"]] = {
            "value": pref["preference_value"],
            "confidence": pref["confidence"],
            "observation_count": pref["observation_count"]
        }
    
    return preferences


# ═══════════════════════════════════════════════════════════════════════════════
# ADD RELATIONSHIP
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/relationship")
async def add_relationship(request: AddRelationshipRequest):
    """
    Add a family member or relationship to a customer's record.
    
    Relationship types:
    - spouse, partner, child, parent, sibling
    - friend, colleague, referral, assistant, other
    """
    db = get_db()
    
    # Validate relationship type
    valid_types = ["spouse", "partner", "child", "parent", "sibling", 
                   "friend", "colleague", "referral", "assistant", "other"]
    if request.relationship_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid relationship_type. Must be one of: {valid_types}"
        )
    
    # Check if relationship already exists
    existing = db.table("customer_relationships").select("id").eq(
        "customer_id", request.customer_id
    ).eq(
        "related_name", request.related_name
    ).execute()
    
    if existing.data:
        # Update existing
        result = db.table("customer_relationships").update({
            "relationship_type": request.relationship_type,
            "notes": request.notes
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        # Create new
        result = db.table("customer_relationships").insert({
            "customer_id": request.customer_id,
            "business_id": request.business_id,
            "related_name": request.related_name,
            "relationship_type": request.relationship_type,
            "notes": request.notes
        }).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save relationship")
    
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════════════════
# ADD SPECIAL DATE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/special-date")
async def add_special_date(request: AddSpecialDateRequest):
    """
    Add a special date (birthday, anniversary, etc.) for a customer.
    """
    db = get_db()
    
    # Validate date type
    valid_types = ["birthday", "anniversary", "membership_start", "first_visit", "other"]
    if request.date_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date_type. Must be one of: {valid_types}"
        )
    
    # Check if this date type already exists
    existing = db.table("customer_special_dates").select("id").eq(
        "customer_id", request.customer_id
    ).eq(
        "date_type", request.date_type
    ).execute()
    
    if existing.data:
        # Update existing
        result = db.table("customer_special_dates").update({
            "date_value": request.date_value,
            "year_known": request.year_known,
            "send_reminder": request.send_reminder,
            "reminder_days_before": request.reminder_days_before,
            "description": request.description
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        # Create new
        result = db.table("customer_special_dates").insert({
            "customer_id": request.customer_id,
            "business_id": request.business_id,
            "date_type": request.date_type,
            "date_value": request.date_value,
            "year_known": request.year_known,
            "send_reminder": request.send_reminder,
            "reminder_days_before": request.reminder_days_before,
            "description": request.description
        }).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save special date")
    
    return result.data[0]


# ═══════════════════════════════════════════════════════════════════════════════
# DELETE MEMORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a specific memory."""
    db = get_db()
    
    result = db.table("customer_memory").delete().eq("id", memory_id).execute()
    
    return {"success": True, "deleted": memory_id}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIRM PREFERENCE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/preference/{preference_id}/confirm")
async def confirm_preference(preference_id: str):
    """
    Mark a preference as confirmed by the customer.
    Increases confidence to maximum.
    """
    db = get_db()
    
    result = db.table("customer_preferences").update({
        "confidence": 1.0,
        "last_confirmed_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", preference_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    return result.data[0]

