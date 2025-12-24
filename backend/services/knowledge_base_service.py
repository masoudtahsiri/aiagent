"""Knowledge base / FAQ service"""

from fastapi import HTTPException, status

from typing import List, Optional



from backend.database.supabase_client import get_db





class KnowledgeBaseService:

    

    @staticmethod

    async def get_business_faqs(business_id: str, category: Optional[str] = None) -> List[dict]:

        """Get all FAQs for a business"""

        db = get_db()

        

        query = db.table("knowledge_base").select("*").eq("business_id", business_id).eq("is_active", True)

        

        if category:

            query = query.eq("category", category)

        

        result = query.order("category").order("question").execute()

        return result.data if result.data else []

    

    @staticmethod

    async def search_faqs(business_id: str, search_query: str) -> List[dict]:

        """Search FAQs by keywords"""

        db = get_db()

        

        # Search in question, answer, and keywords

        # Using ilike for case-insensitive search

        result = db.table("knowledge_base").select("*").eq("business_id", business_id).eq("is_active", True).or_(

            f"question.ilike.%{search_query}%,answer.ilike.%{search_query}%"

        ).execute()

        

        return result.data if result.data else []

    

    @staticmethod

    async def create_faq(faq_data: dict, user_id: str) -> dict:

        """Create a new FAQ entry"""

        db = get_db()

        

        # Verify user owns this business

        business_id = faq_data["business_id"]

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != business_id:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized"

            )

        

        result = db.table("knowledge_base").insert(faq_data).execute()

        

        if not result.data:

            raise HTTPException(

                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,

                detail="Failed to create FAQ"

            )

        

        return result.data[0]

    

    @staticmethod

    async def update_faq(faq_id: str, update_data: dict, user_id: str) -> dict:

        """Update FAQ entry"""

        db = get_db()

        

        # Get FAQ

        faq_result = db.table("knowledge_base").select("*").eq("id", faq_id).execute()

        

        if not faq_result.data:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="FAQ not found"

            )

        

        faq = faq_result.data[0]

        

        # Verify user owns this business

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != faq["business_id"]:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized"

            )

        

        # Remove None values

        update_data = {k: v for k, v in update_data.items() if v is not None}

        

        result = db.table("knowledge_base").update(update_data).eq("id", faq_id).execute()

        

        return result.data[0] if result.data else faq

    

    @staticmethod

    async def delete_faq(faq_id: str, user_id: str) -> dict:

        """Delete FAQ entry"""

        db = get_db()

        

        # Get FAQ

        faq_result = db.table("knowledge_base").select("*").eq("id", faq_id).execute()

        

        if not faq_result.data:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="FAQ not found"

            )

        

        faq = faq_result.data[0]

        

        # Verify user owns this business

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != faq["business_id"]:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized"

            )

        

        # Soft delete

        db.table("knowledge_base").update({"is_active": False}).eq("id", faq_id).execute()

        

        return {"message": "FAQ deleted successfully"}



























