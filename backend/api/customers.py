from fastapi import APIRouter, Depends, Query
from typing import Optional
import asyncio
import time
import logging

from backend.models.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    CustomerLookup, CustomerLookupResponse
)
from backend.services.customer_service import CustomerService
from backend.middleware.auth import get_current_active_user
from backend.database.supabase_client import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/customers", tags=["Customer Management"])


@router.post("/lookup", response_model=CustomerLookupResponse)
async def lookup_customer(lookup_data: CustomerLookup):
    """Lookup customer by phone number (for AI agent - no auth required)"""
    return await CustomerService.lookup_customer(lookup_data.phone, lookup_data.business_id)


@router.post("/lookup-with-memory")
async def lookup_customer_with_memory(lookup_data: CustomerLookup):
    """
    Lookup customer by phone AND return consolidated memory in one call.
    
    OPTIMIZED: Combines lookup + memory fetch to eliminate one API round-trip.
    This saves ~230ms per call compared to making two separate requests.
    
    Returns:
    - exists: bool
    - customer: customer data if exists
    - long_term_memory: preferences, facts, relationships, notes
    - short_term_memory: active_deals, open_issues, recent_context, follow_ups
    """
    start_time = time.perf_counter()
    db = get_db()
    
    # Single query that returns customer + memory fields
    result = db.table("customers").select(
        "*, long_term_memory, short_term_memory"
    ).eq("phone", lookup_data.phone).eq(
        "business_id", lookup_data.business_id
    ).eq("is_active", True).execute()
    
    elapsed = (time.perf_counter() - start_time) * 1000
    
    if not result.data:
        logger.info(f"⏱️ lookup_customer_with_memory: {elapsed:.0f}ms (not found)")
        return {
            "exists": False,
            "customer": None,
            "long_term_memory": None,
            "short_term_memory": None
        }
    
    customer = result.data[0]
    
    # Extract memory fields
    long_term = customer.pop("long_term_memory", None) or {
        "preferences": {},
        "facts": [],
        "relationships": {},
        "notes": []
    }
    short_term = customer.pop("short_term_memory", None) or {
        "active_deals": [],
        "open_issues": [],
        "recent_context": [],
        "follow_ups": []
    }
    
    logger.info(f"⏱️ lookup_customer_with_memory: {elapsed:.0f}ms (found: {customer.get('first_name', 'Unknown')})")
    
    return {
        "exists": True,
        "customer": customer,
        "long_term_memory": long_term,
        "short_term_memory": short_term
    }


@router.post("/create", response_model=CustomerResponse)
async def create_customer_for_agent(customer_data: CustomerCreate):
    """Create a new customer (for AI agent - no auth required)"""
    customer_dict = customer_data.model_dump()
    return await CustomerService.create_customer_for_agent(customer_dict)


@router.put("/update/{customer_id}", response_model=CustomerResponse)
async def update_customer_for_agent(customer_id: str, customer_data: CustomerUpdate):
    """Update customer (for AI agent - no auth required)"""
    update_dict = customer_data.model_dump(exclude_unset=True)
    return await CustomerService.update_customer_for_agent(customer_id, update_dict)


@router.post("", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new customer"""
    customer_dict = customer_data.model_dump()
    return await CustomerService.create_customer(customer_dict, current_user["id"])


@router.get("/business/{business_id}")
async def get_business_customers(
    business_id: str,
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all customers for business with pagination and search"""
    return await CustomerService.get_business_customers(
        business_id, current_user["id"], search, limit, offset
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get customer by ID"""
    return await CustomerService.get_customer(customer_id, current_user["id"])


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update customer"""
    update_dict = customer_data.model_dump(exclude_unset=True)
    return await CustomerService.update_customer(customer_id, update_dict, current_user["id"])


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete/deactivate customer"""
    return await CustomerService.delete_customer(customer_id, current_user["id"])
