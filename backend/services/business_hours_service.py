"""Business hours service"""

from fastapi import HTTPException, status
from typing import List, Optional
from datetime import date
import holidays

from backend.database.supabase_client import get_db


class BusinessHoursService:

    @staticmethod
    async def get_business_hours(business_id: str) -> List[dict]:
        """Get business hours for all days"""
        db = get_db()
        result = db.table("business_hours").select("*").eq("business_id", business_id).order("day_of_week").execute()
        return result.data if result.data else []

    @staticmethod
    async def set_business_hours(business_id: str, hours_data: List[dict], user_id: str) -> List[dict]:
        """Set business hours (replaces all existing)"""
        db = get_db()

        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        # Delete existing hours
        db.table("business_hours").delete().eq("business_id", business_id).execute()

        # Insert new hours
        for hour in hours_data:
            hour["business_id"] = business_id

        if hours_data:
            result = db.table("business_hours").insert(hours_data).execute()
            return result.data if result.data else []

        return []

    @staticmethod
    async def get_business_closures(business_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
        """Get business closures"""
        db = get_db()
        query = db.table("business_closures").select("*").eq("business_id", business_id)

        if start_date:
            query = query.gte("closure_date", start_date)
        if end_date:
            query = query.lte("closure_date", end_date)

        result = query.order("closure_date").execute()
        return result.data if result.data else []

    @staticmethod
    async def add_closure(closure_data: dict, user_id: str) -> dict:
        """Add a business closure"""
        db = get_db()
        business_id = closure_data["business_id"]

        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        result = db.table("business_closures").insert(closure_data).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add closure"
            )

        return result.data[0]

    @staticmethod
    async def delete_closure(closure_id: str, user_id: str) -> dict:
        """Delete a business closure"""
        db = get_db()

        # Get closure
        closure_result = db.table("business_closures").select("*").eq("id", closure_id).execute()
        if not closure_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Closure not found"
            )

        closure = closure_result.data[0]

        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        if not user_result.data or user_result.data[0].get("business_id") != closure["business_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        db.table("business_closures").delete().eq("id", closure_id).execute()
        return {"message": "Closure deleted successfully"}

    @staticmethod
    async def sync_holidays_for_country(country_code: str, user_id: str) -> dict:
        """Sync holidays for a country - deletes existing closures and adds new holidays"""
        db = get_db()

        # Get user's business_id
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        if not user_result.data or not user_result.data[0].get("business_id"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business not found for user"
            )

        business_id = user_result.data[0]["business_id"]

        # Delete all existing closures for this business
        db.table("business_closures").delete().eq("business_id", business_id).execute()

        # Check if country is supported by the holidays library
        try:
            country_holidays = holidays.country_holidays(country_code)
        except NotImplementedError:
            return {"added": 0, "message": f"Country {country_code} is not supported", "unsupported": True}

        # Get holidays for current year + next 2 years (3-year window)
        today = date.today()
        current_year = today.year
        years_to_fetch = [current_year, current_year + 1, current_year + 2]

        closures_to_add = []
        for year in years_to_fetch:
            year_holidays = holidays.country_holidays(country_code, years=year)
            for holiday_date, holiday_name in sorted(year_holidays.items()):
                # Only include future holidays
                if holiday_date >= today:
                    closures_to_add.append({
                        "business_id": business_id,
                        "closure_date": holiday_date.isoformat(),
                        "reason": holiday_name
                    })

        # Insert all closures
        added_count = 0
        if closures_to_add:
            result = db.table("business_closures").insert(closures_to_add).execute()
            added_count = len(result.data) if result.data else 0

        return {
            "added": added_count,
            "total": len(closures_to_add),
            "unsupported": False
        }


