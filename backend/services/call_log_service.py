"""Call logging service"""

from fastapi import HTTPException, status

from typing import List, Optional

from datetime import datetime



from backend.database.supabase_client import get_db





class CallLogService:

    

    @staticmethod

    async def create_call_log(call_data: dict) -> dict:

        """Create a new call log entry (called by agent)"""

        db = get_db()

        

        # Set defaults

        call_data["created_at"] = datetime.utcnow().isoformat()

        

        result = db.table("call_logs").insert(call_data).execute()

        

        if not result.data:

            raise HTTPException(

                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,

                detail="Failed to create call log"

            )

        

        return result.data[0]

    

    @staticmethod

    async def update_call_log(call_log_id: str, update_data: dict) -> dict:

        """Update call log (called by agent when call ends)"""

        db = get_db()

        

        result = db.table("call_logs").update(update_data).eq("id", call_log_id).execute()

        

        if not result.data:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Call log not found"

            )

        

        return result.data[0]

    

    @staticmethod

    async def get_business_calls(

        business_id: str,

        user_id: str,

        start_date: Optional[str] = None,

        end_date: Optional[str] = None,

        limit: int = 50,

        offset: int = 0

    ) -> dict:

        """Get call logs for a business"""

        db = get_db()

        

        # Verify user owns this business

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != business_id:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized"

            )

        

        query = db.table("call_logs").select("*", count="exact").eq("business_id", business_id)

        

        if start_date:

            query = query.gte("started_at", start_date)

        if end_date:

            query = query.lte("started_at", end_date)

        

        result = query.order("started_at", desc=True).range(offset, offset + limit - 1).execute()

        

        return {

            "calls": result.data if result.data else [],

            "total": result.count if result.count else 0,

            "limit": limit,

            "offset": offset

        }

    

    @staticmethod

    async def get_call_log(call_log_id: str, user_id: str) -> dict:

        """Get single call log"""

        db = get_db()

        

        result = db.table("call_logs").select("*").eq("id", call_log_id).execute()

        

        if not result.data:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Call log not found"

            )

        

        call_log = result.data[0]

        

        # Verify user owns this business

        user_result = db.table("users").select("business_id").eq("id", user_id).execute()

        

        if not user_result.data or user_result.data[0].get("business_id") != call_log["business_id"]:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized"

            )

        

        return call_log












