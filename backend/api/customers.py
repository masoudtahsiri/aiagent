from fastapi import APIRouter, Depends, Query
import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from models.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    CustomerLookup, CustomerLookupResponse
)
from services.customer_service import CustomerService
from middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/customers", tags=["Customer Management"])


@router.post("/lookup", response_model=CustomerLookupResponse)
async def lookup_customer(lookup_data: CustomerLookup):
    """
    Lookup customer by phone number (for AI agent)
    
    This endpoint does NOT require authentication - used by AI agent
    """
    return await CustomerService.lookup_customer(lookup_data.phone, lookup_data.business_id)


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

