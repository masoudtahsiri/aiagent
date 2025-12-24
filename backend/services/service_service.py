"""Service management for businesses"""

from fastapi import HTTPException, status

from typing import List, Optional



from backend.database.supabase_client import get_db





class ServiceService:

    

    @staticmethod

    async def get_business_services(business_id: str, include_inactive: bool = False) -> List[dict]:

        """Get all services for a business"""

        db = get_db()

        

        query = db.table("services").select("*").eq("business_id", business_id)

        

        if not include_inactive:

            query = query.eq("is_active", True)

        

        result = query.order("category").order("name").execute()

        return result.data if result.data else []

    

    @staticmethod

    async def get_service(service_id: str) -> dict:

        """Get service by ID"""

        db = get_db()

        

        result = db.table("services").select("*").eq("id", service_id).execute()

        

        if not result.data:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Service not found"

            )

        

        return result.data[0]

    

    @staticmethod

    async def create_service(service_data: dict, user_id: str) -> dict:

        """Create a new service"""

        db = get_db()

        

        # Verify user owns this business

        business_id = service_data["business_id"]

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != business_id:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized to add services to this business"

            )

        

        result = db.table("services").insert(service_data).execute()

        

        if not result.data:

            raise HTTPException(

                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,

                detail="Failed to create service"

            )

        

        return result.data[0]

    

    @staticmethod

    async def update_service(service_id: str, update_data: dict, user_id: str) -> dict:

        """Update service"""

        db = get_db()

        

        # Get service

        service = await ServiceService.get_service(service_id)

        

        # Verify user owns this business

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != service["business_id"]:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized to update this service"

            )

        

        # Remove None values

        update_data = {k: v for k, v in update_data.items() if v is not None}

        

        if not update_data:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="No data to update"

            )

        

        result = db.table("services").update(update_data).eq("id", service_id).execute()

        

        if not result.data:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Service not found"

            )

        

        return result.data[0]

    

    @staticmethod

    async def delete_service(service_id: str, user_id: str) -> dict:

        """Delete/deactivate service"""

        db = get_db()

        

        # Get service

        service = await ServiceService.get_service(service_id)

        

        # Verify user owns this business

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != service["business_id"]:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized to delete this service"

            )

        

        # Soft delete

        result = db.table("services").update({"is_active": False}).eq("id", service_id).execute()

        

        return {"message": "Service deactivated successfully"}

    

    @staticmethod

    async def get_staff_for_service(service_id: str) -> List[dict]:

        """Get staff members who can perform a service"""

        db = get_db()

        

        result = db.table("staff_services").select(

            "staff_id, custom_price, staff(id, name, title, specialty)"

        ).eq("service_id", service_id).execute()

        

        if not result.data:

            return []

        

        return result.data




























