from fastapi import HTTPException, status
from typing import List, Optional
from datetime import date, datetime

from backend.database.supabase_client import get_db


def serialize_dates(data: dict) -> dict:
    """Convert date objects to ISO format strings for JSON serialization"""
    if not data:
        return data
    
    result = {}
    for key, value in data.items():
        if isinstance(value, date):
            result[key] = value.isoformat()
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


class CustomerService:
    
    @staticmethod
    async def lookup_customer(phone: str, business_id: str) -> dict:
        """
        Lookup customer by phone (for AI agent)
        Returns exists flag and customer data if found
        """
        db = get_db()
        
        result = db.table("customers").select("*").eq("phone", phone).eq("business_id", business_id).eq("is_active", True).execute()
        
        if result.data:
            return {
                "exists": True,
                "customer": serialize_dates(result.data[0])
            }
        
        return {
            "exists": False,
            "customer": None
        }
    
    @staticmethod
    async def create_customer_for_agent(customer_data: dict) -> dict:
        """
        Create a new customer (for AI agent - no authentication required)
        The AI agent already knows the business_id from phone lookup
        """
        db = get_db()
        business_id = customer_data["business_id"]
        
        # Verify business exists and is active
        business_result = db.table("businesses").select("id").eq("id", business_id).eq("is_active", True).execute()
        
        if not business_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business not found or inactive"
            )
        
        # Check if customer already exists
        existing = await CustomerService.lookup_customer(customer_data["phone"], business_id)
        
        if existing["exists"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer with this phone number already exists"
            )
        
        # Convert date objects to strings for Supabase insertion
        insert_data = {}
        for key, value in customer_data.items():
            if isinstance(value, date):
                insert_data[key] = value.isoformat()
            elif isinstance(value, datetime):
                insert_data[key] = value.isoformat()
            else:
                insert_data[key] = value
        
        # Create customer
        result = db.table("customers").insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create customer"
            )
        
        return serialize_dates(result.data[0])
    
    @staticmethod
    async def update_customer_for_agent(customer_id: str, update_data: dict) -> dict:
        """
        Update customer (for AI agent - no authentication required)
        """
        db = get_db()
        
        # Get customer to verify it exists
        customer_result = db.table("customers").select("*").eq("id", customer_id).execute()
        
        if not customer_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # Remove None values and convert dates
        cleaned_data = {}
        for key, value in update_data.items():
            if value is not None:
                if isinstance(value, date):
                    cleaned_data[key] = value.isoformat()
                elif isinstance(value, datetime):
                    cleaned_data[key] = value.isoformat()
                else:
                    cleaned_data[key] = value
        
        if not cleaned_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data to update"
            )
        
        # Update customer
        result = db.table("customers").update(cleaned_data).eq("id", customer_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return serialize_dates(result.data[0])
    
    @staticmethod
    async def create_customer(customer_data: dict, user_id: str) -> dict:
        """Create a new customer"""
        db = get_db()
        
        # Verify user owns this business
        business_id = customer_data["business_id"]
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add customers to this business"
            )
        
        # Check if customer already exists
        existing = await CustomerService.lookup_customer(customer_data["phone"], business_id)
        
        if existing["exists"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer with this phone number already exists"
            )
        
        # Convert date objects to strings for Supabase insertion
        insert_data = {}
        for key, value in customer_data.items():
            if isinstance(value, date):
                insert_data[key] = value.isoformat()
            elif isinstance(value, datetime):
                insert_data[key] = value.isoformat()
            else:
                insert_data[key] = value
        
        # Create customer
        result = db.table("customers").insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create customer"
            )
        
        return serialize_dates(result.data[0])
    
    @staticmethod
    async def get_business_customers(
        business_id: str,
        user_id: str,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """Get all customers for a business with pagination and search"""
        db = get_db()
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this business"
            )
        
        # Build query
        query = db.table("customers").select("*", count="exact").eq("business_id", business_id).eq("is_active", True)
        
        # Add search filter
        if search:
            # Search in first_name, last_name, phone, email
            query = query.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%,phone.ilike.%{search}%,email.ilike.%{search}%")
        
        # Add pagination
        result = query.order("last_name").range(offset, offset + limit - 1).execute()
        
        # Serialize dates for all customers
        customers = [serialize_dates(c) for c in (result.data if result.data else [])]
        
        return {
            "customers": customers,
            "total": result.count if result.count else 0,
            "limit": limit,
            "offset": offset
        }
    
    @staticmethod
    async def get_customer(customer_id: str, user_id: str) -> dict:
        """Get customer by ID"""
        db = get_db()
        
        # Get customer
        customer_result = db.table("customers").select("*").eq("id", customer_id).execute()
        
        if not customer_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        customer = customer_result.data[0]
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != customer["business_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this customer"
            )
        
        return serialize_dates(customer)
    
    @staticmethod
    async def update_customer(customer_id: str, update_data: dict, user_id: str) -> dict:
        """Update customer"""
        db = get_db()
        
        # Get customer to verify ownership
        customer = await CustomerService.get_customer(customer_id, user_id)
        
        # Remove None values and convert dates
        cleaned_data = {}
        for key, value in update_data.items():
            if value is not None:
                if isinstance(value, date):
                    cleaned_data[key] = value.isoformat()
                elif isinstance(value, datetime):
                    cleaned_data[key] = value.isoformat()
                else:
                    cleaned_data[key] = value
        
        if not cleaned_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data to update"
            )
        
        # Update customer
        result = db.table("customers").update(cleaned_data).eq("id", customer_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return serialize_dates(result.data[0])
    
    @staticmethod
    async def delete_customer(customer_id: str, user_id: str) -> dict:
        """Delete/deactivate customer"""
        db = get_db()
        
        # Get customer to verify ownership
        await CustomerService.get_customer(customer_id, user_id)
        
        # Soft delete
        result = db.table("customers").update({
            "is_active": False
        }).eq("id", customer_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return {"message": "Customer deactivated successfully"}
