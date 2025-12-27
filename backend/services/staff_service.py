from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime, date, timedelta

from backend.database.supabase_client import get_db


class StaffService:
    
    @staticmethod
    async def create_staff(staff_data: dict, user_id: str) -> dict:
        """Create a new staff member"""
        db = get_db()
        
        # Verify user owns this business
        business_id = staff_data["business_id"]
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add staff to this business"
            )
        
        # Create staff
        result = db.table("staff").insert(staff_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create staff member"
            )
        
        return result.data[0]
    
    @staticmethod
    async def get_business_staff(business_id: str, user_id: str, include_inactive: bool = False) -> List[dict]:
        """Get all staff for a business (excludes archived/deleted)"""
        db = get_db()

        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this business"
            )

        # Get staff (always exclude archived)
        query = db.table("staff").select("*").eq("business_id", business_id)
        query = query.is_("deleted_at", "null")

        if not include_inactive:
            query = query.eq("is_active", True)

        result = query.order("name").execute()

        return result.data if result.data else []
    
    @staticmethod
    async def get_staff(staff_id: str, user_id: str) -> dict:
        """Get staff member by ID"""
        db = get_db()
        
        # Get staff
        staff_result = db.table("staff").select("*").eq("id", staff_id).execute()
        
        if not staff_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        
        staff = staff_result.data[0]
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != staff["business_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this staff member"
            )
        
        return staff
    
    @staticmethod
    async def update_staff(staff_id: str, update_data: dict, user_id: str) -> dict:
        """Update staff member"""
        db = get_db()
        
        # Get staff to verify ownership
        staff = await StaffService.get_staff(staff_id, user_id)
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data to update"
            )
        
        # Update staff
        result = db.table("staff").update(update_data).eq("id", staff_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        
        return result.data[0]
    
    @staticmethod
    async def delete_staff(staff_id: str, user_id: str) -> dict:
        """Archive/delete staff member (permanently hidden)"""
        db = get_db()

        # Get staff to verify ownership
        await StaffService.get_staff(staff_id, user_id)

        # Archive by setting deleted_at timestamp (never retrievable)
        from datetime import datetime
        result = db.table("staff").update({
            "deleted_at": datetime.utcnow().isoformat()
        }).eq("id", staff_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )

        return {"message": "Staff member deleted successfully"}
    
    # Availability Management
    
    @staticmethod
    async def create_availability_template(template_data: dict, user_id: str) -> dict:
        """Create availability template for staff"""
        db = get_db()
        
        # Verify staff belongs to user's business
        staff = await StaffService.get_staff(template_data["staff_id"], user_id)
        
        # Validate day_of_week
        if not 0 <= template_data["day_of_week"] <= 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="day_of_week must be between 0 (Sunday) and 6 (Saturday)"
            )
        
        # Create template
        result = db.table("availability_templates").insert(template_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create availability template"
            )
        
        return result.data[0]
    
    @staticmethod
    async def bulk_create_availability(staff_id: str, templates: List[dict], user_id: str) -> List[dict]:
        """Create multiple availability templates at once"""
        db = get_db()
        
        # Verify staff belongs to user's business
        await StaffService.get_staff(staff_id, user_id)
        
        # Add staff_id to each template
        for template in templates:
            template["staff_id"] = staff_id
        
        # Create all templates
        result = db.table("availability_templates").insert(templates).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create availability templates"
            )
        
        return result.data
    
    @staticmethod
    async def get_staff_availability(staff_id: str, user_id: str) -> List[dict]:
        """Get availability templates for staff"""
        db = get_db()
        
        # Verify staff belongs to user's business
        await StaffService.get_staff(staff_id, user_id)
        
        # Get templates
        result = db.table("availability_templates").select("*").eq("staff_id", staff_id).eq("is_active", True).order("day_of_week").order("start_time").execute()
        
        return result.data if result.data else []
    
    @staticmethod
    async def update_availability_template(template_id: str, update_data: dict, user_id: str) -> dict:
        """Update availability template"""
        db = get_db()
        
        # Get template
        template_result = db.table("availability_templates").select("*").eq("id", template_id).execute()
        
        if not template_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability template not found"
            )
        
        template = template_result.data[0]
        
        # Verify staff belongs to user's business
        await StaffService.get_staff(template["staff_id"], user_id)
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        # Update template
        result = db.table("availability_templates").update(update_data).eq("id", template_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability template not found"
            )
        
        return result.data[0]
    
    @staticmethod
    async def delete_availability_template(template_id: str, user_id: str) -> dict:
        """Delete availability template"""
        db = get_db()
        
        # Get template
        template_result = db.table("availability_templates").select("*").eq("id", template_id).execute()
        
        if not template_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability template not found"
            )
        
        template = template_result.data[0]
        
        # Verify staff belongs to user's business
        await StaffService.get_staff(template["staff_id"], user_id)
        
        # Soft delete
        result = db.table("availability_templates").update({
            "is_active": False
        }).eq("id", template_id).execute()
        
        return {"message": "Availability template deleted successfully"}
    
    @staticmethod
    async def create_availability_exception(exception_data: dict, user_id: str) -> dict:
        """Create availability exception (time off, holiday, etc.)"""
        db = get_db()
        
        # Verify staff belongs to user's business
        await StaffService.get_staff(exception_data["staff_id"], user_id)
        
        # Create exception
        result = db.table("availability_exceptions").insert(exception_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create availability exception"
            )
        
        return result.data[0]
    
    @staticmethod
    async def get_staff_exceptions(staff_id: str, user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
        """Get availability exceptions for staff"""
        db = get_db()
        
        # Verify staff belongs to user's business
        await StaffService.get_staff(staff_id, user_id)
        
        # Get exceptions
        query = db.table("availability_exceptions").select("*").eq("staff_id", staff_id)
        
        if start_date:
            query = query.gte("exception_date", start_date)
        if end_date:
            query = query.lte("exception_date", end_date)
        
        result = query.order("exception_date").execute()

        return result.data if result.data else []

    # Staff-Services Management

    @staticmethod
    async def get_staff_services(staff_id: str, user_id: str) -> List[dict]:
        """Get services that a staff member can perform"""
        db = get_db()

        # Verify staff belongs to user's business
        await StaffService.get_staff(staff_id, user_id)

        # Get service IDs from staff_services junction table
        result = db.table("staff_services").select(
            "service_id, custom_price, services(id, name, duration_minutes, price, category, is_active)"
        ).eq("staff_id", staff_id).execute()

        if not result.data:
            return []

        # Extract service details
        services = []
        for item in result.data:
            if item.get("services"):
                service = item["services"]
                service["custom_price"] = item.get("custom_price")
                services.append(service)

        return services

    @staticmethod
    async def update_staff_services(staff_id: str, service_ids: List[str], user_id: str) -> dict:
        """Update services that a staff member can perform"""
        db = get_db()

        # Verify staff belongs to user's business
        staff = await StaffService.get_staff(staff_id, user_id)

        # Delete existing staff_services for this staff
        db.table("staff_services").delete().eq("staff_id", staff_id).execute()

        # Insert new staff_services
        if service_ids:
            new_mappings = [
                {"staff_id": staff_id, "service_id": service_id}
                for service_id in service_ids
            ]
            db.table("staff_services").insert(new_mappings).execute()

        return {
            "message": "Staff services updated successfully",
            "staff_id": staff_id,
            "service_count": len(service_ids)
        }

