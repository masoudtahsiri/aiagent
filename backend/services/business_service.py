from fastapi import HTTPException, status
import sys
from pathlib import Path
from typing import List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from database.supabase_client import get_db


class BusinessService:
    
    @staticmethod
    async def create_business(business_data: dict, user_id: str) -> dict:
        """Create a new business"""
        db = get_db()
        
        # Check if user already has a business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        if user_result.data and user_result.data[0].get("business_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has a business"
            )
        
        # Create business
        result = db.table("businesses").insert(business_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create business"
            )
        
        business = result.data[0]
        
        # Link business to user
        db.table("users").update({
            "business_id": business["id"]
        }).eq("id", user_id).execute()
        
        return business
    
    @staticmethod
    async def get_business(business_id: str) -> dict:
        """Get business by ID"""
        db = get_db()
        
        result = db.table("businesses").select("*").eq("id", business_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business not found"
            )
        
        return result.data[0]
    
    @staticmethod
    async def get_user_business(user_id: str) -> Optional[dict]:
        """Get business for current user"""
        db = get_db()
        
        # Get user's business_id
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or not user_result.data[0].get("business_id"):
            return None
        
        business_id = user_result.data[0]["business_id"]
        
        # Get business details
        business_result = db.table("businesses").select("*").eq("id", business_id).execute()
        
        if not business_result.data:
            return None
        
        return business_result.data[0]
    
    @staticmethod
    async def update_business(business_id: str, update_data: dict, user_id: str) -> dict:
        """Update business"""
        db = get_db()
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this business"
            )
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data to update"
            )
        
        # Update business
        result = db.table("businesses").update(update_data).eq("id", business_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business not found"
            )
        
        return result.data[0]
    
    @staticmethod
    async def delete_business(business_id: str, user_id: str) -> dict:
        """Delete/deactivate business"""
        db = get_db()
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this business"
            )
        
        # Soft delete - set is_active to false
        result = db.table("businesses").update({
            "is_active": False
        }).eq("id", business_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business not found"
            )
        
        return {"message": "Business deactivated successfully"}
    
    @staticmethod
    async def get_business_stats(business_id: str, user_id: str) -> dict:
        """Get business statistics"""
        db = get_db()
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this business"
            )
        
        # Get counts
        staff_count = db.table("staff").select("id", count="exact").eq("business_id", business_id).eq("is_active", True).execute()
        customer_count = db.table("customers").select("id", count="exact").eq("business_id", business_id).eq("is_active", True).execute()
        appointment_count = db.table("appointments").select("id", count="exact").eq("business_id", business_id).execute()
        
        return {
            "total_staff": staff_count.count if staff_count else 0,
            "total_customers": customer_count.count if customer_count else 0,
            "total_appointments": appointment_count.count if appointment_count else 0
        }

