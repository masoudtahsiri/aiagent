from fastapi import HTTPException, status
from typing import List, Optional, Tuple
from datetime import datetime, date, timedelta

from backend.database.supabase_client import get_db
from backend.models.staff import TimeOffType


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

    # Time Off Management

    @staticmethod
    async def create_time_off(time_off_data: dict, user_id: str) -> dict:
        """Create a time off entry for staff"""
        db = get_db()

        # Verify staff belongs to user's business
        staff = await StaffService.get_staff(time_off_data["staff_id"], user_id)

        # Create time off entries for each date in the range
        start_date = datetime.strptime(time_off_data["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(time_off_data["end_date"], "%Y-%m-%d").date()

        # Create a single time off record that spans the date range
        time_off_record = {
            "staff_id": time_off_data["staff_id"],
            "exception_date": time_off_data["start_date"],
            "exception_type": "time_off",
            "start_time": None,
            "end_time": None,
            "reason": f"{time_off_data.get('time_off_type', 'vacation')}: {time_off_data.get('reason', '')}".strip(": "),
        }

        # For multi-day time offs, create entries for each day
        created_entries = []
        current_date = start_date
        while current_date <= end_date:
            entry = {
                **time_off_record,
                "exception_date": str(current_date),
            }

            # Check if an entry already exists for this date
            existing = db.table("availability_exceptions").select("id").eq(
                "staff_id", time_off_data["staff_id"]
            ).eq("exception_date", str(current_date)).eq("exception_type", "time_off").execute()

            if not existing.data:
                result = db.table("availability_exceptions").insert(entry).execute()
                if result.data:
                    created_entries.append(result.data[0])

            current_date += timedelta(days=1)

        if not created_entries:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time off entries already exist for the specified dates"
            )

        # Return a combined response
        return {
            "id": created_entries[0]["id"] if created_entries else None,
            "staff_id": time_off_data["staff_id"],
            "start_date": time_off_data["start_date"],
            "end_date": time_off_data["end_date"],
            "time_off_type": time_off_data.get("time_off_type", "vacation"),
            "reason": time_off_data.get("reason"),
            "created_at": created_entries[0]["created_at"] if created_entries else None,
            "days_count": len(created_entries),
        }

    @staticmethod
    async def get_staff_time_offs(
        staff_id: str,
        user_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[dict]:
        """Get time off entries for staff, grouped by contiguous date ranges"""
        db = get_db()

        # Verify staff belongs to user's business
        await StaffService.get_staff(staff_id, user_id)

        # Get all time_off exceptions
        query = db.table("availability_exceptions").select("*").eq(
            "staff_id", staff_id
        ).eq("exception_type", "time_off")

        if start_date:
            query = query.gte("exception_date", start_date)
        if end_date:
            query = query.lte("exception_date", end_date)

        result = query.order("exception_date").execute()

        if not result.data:
            return []

        # Group contiguous dates into time off periods
        time_offs = []
        entries = sorted(result.data, key=lambda x: x["exception_date"])

        current_group = None
        for entry in entries:
            entry_date = datetime.strptime(entry["exception_date"], "%Y-%m-%d").date()

            if current_group is None:
                # Start new group
                current_group = {
                    "id": entry["id"],
                    "staff_id": entry["staff_id"],
                    "start_date": entry["exception_date"],
                    "end_date": entry["exception_date"],
                    "reason": entry.get("reason", ""),
                    "created_at": entry["created_at"],
                    "_last_date": entry_date,
                }
                # Parse time_off_type from reason
                reason = entry.get("reason", "")
                if ":" in reason:
                    type_str = reason.split(":")[0].strip()
                    current_group["time_off_type"] = type_str
                    current_group["reason"] = reason.split(":", 1)[1].strip() if len(reason.split(":")) > 1 else ""
                else:
                    current_group["time_off_type"] = "vacation"
                    current_group["reason"] = reason
            else:
                # Check if this date is contiguous with current group
                expected_next = current_group["_last_date"] + timedelta(days=1)
                if entry_date == expected_next:
                    # Extend current group
                    current_group["end_date"] = entry["exception_date"]
                    current_group["_last_date"] = entry_date
                else:
                    # Save current group and start new one
                    del current_group["_last_date"]
                    time_offs.append(current_group)
                    current_group = {
                        "id": entry["id"],
                        "staff_id": entry["staff_id"],
                        "start_date": entry["exception_date"],
                        "end_date": entry["exception_date"],
                        "reason": entry.get("reason", ""),
                        "created_at": entry["created_at"],
                        "_last_date": entry_date,
                    }
                    reason = entry.get("reason", "")
                    if ":" in reason:
                        type_str = reason.split(":")[0].strip()
                        current_group["time_off_type"] = type_str
                        current_group["reason"] = reason.split(":", 1)[1].strip() if len(reason.split(":")) > 1 else ""
                    else:
                        current_group["time_off_type"] = "vacation"
                        current_group["reason"] = reason

        # Don't forget the last group
        if current_group:
            del current_group["_last_date"]
            time_offs.append(current_group)

        return time_offs

    @staticmethod
    async def delete_time_off(time_off_id: str, user_id: str) -> dict:
        """Delete a time off entry (and all entries in the same date range)"""
        db = get_db()

        # Get the time off entry
        entry_result = db.table("availability_exceptions").select("*").eq("id", time_off_id).execute()

        if not entry_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time off entry not found"
            )

        entry = entry_result.data[0]

        # Verify staff belongs to user's business
        await StaffService.get_staff(entry["staff_id"], user_id)

        # Delete the entry
        db.table("availability_exceptions").delete().eq("id", time_off_id).execute()

        return {"message": "Time off entry deleted successfully"}

    @staticmethod
    async def delete_time_off_range(staff_id: str, start_date: str, end_date: str, user_id: str) -> dict:
        """Delete all time off entries in a date range"""
        db = get_db()

        # Verify staff belongs to user's business
        await StaffService.get_staff(staff_id, user_id)

        # Delete all time_off entries in the range
        result = db.table("availability_exceptions").delete().eq(
            "staff_id", staff_id
        ).eq("exception_type", "time_off").gte(
            "exception_date", start_date
        ).lte("exception_date", end_date).execute()

        deleted_count = len(result.data) if result.data else 0

        return {
            "message": f"Deleted {deleted_count} time off entries",
            "deleted_count": deleted_count,
        }

    # Availability Validation

    @staticmethod
    async def validate_availability_against_business_hours(
        staff_id: str,
        schedule: List[dict],
        user_id: str
    ) -> Tuple[bool, List[str], List[str]]:
        """Validate staff availability is within business hours"""
        db = get_db()

        # Get staff to get business_id
        staff = await StaffService.get_staff(staff_id, user_id)
        business_id = staff["business_id"]

        # Get business hours
        hours_result = db.table("business_hours").select("*").eq("business_id", business_id).execute()

        business_hours = {}
        if hours_result.data:
            for h in hours_result.data:
                business_hours[h["day_of_week"]] = {
                    "is_open": h.get("is_open", True),
                    "open_time": h.get("open_time"),
                    "close_time": h.get("close_time"),
                }

        errors = []
        warnings = []

        for entry in schedule:
            day = entry.get("day_of_week")
            if not entry.get("is_working", True):
                continue

            staff_start = entry.get("start_time")
            staff_end = entry.get("end_time")

            if day not in business_hours:
                warnings.append(f"Day {day}: No business hours set. Staff availability will apply.")
                continue

            bh = business_hours[day]
            if not bh.get("is_open"):
                errors.append(f"Day {day}: Business is closed, but staff is set to work.")
                continue

            bh_open = bh.get("open_time")
            bh_close = bh.get("close_time")

            if bh_open and staff_start:
                # Normalize time strings
                bh_open_str = bh_open[:5] if len(bh_open) > 5 else bh_open
                staff_start_str = staff_start[:5] if len(staff_start) > 5 else staff_start

                if staff_start_str < bh_open_str:
                    errors.append(
                        f"Day {day}: Staff start time ({staff_start_str}) is before business opens ({bh_open_str})."
                    )

            if bh_close and staff_end:
                bh_close_str = bh_close[:5] if len(bh_close) > 5 else bh_close
                staff_end_str = staff_end[:5] if len(staff_end) > 5 else staff_end

                if staff_end_str > bh_close_str:
                    errors.append(
                        f"Day {day}: Staff end time ({staff_end_str}) is after business closes ({bh_close_str})."
                    )

        is_valid = len(errors) == 0
        return is_valid, errors, warnings

    @staticmethod
    async def update_staff_availability_with_validation(
        staff_id: str,
        schedule: List[dict],
        user_id: str
    ) -> dict:
        """Update staff availability with business hours validation"""
        db = get_db()

        # Validate first
        is_valid, errors, warnings = await StaffService.validate_availability_against_business_hours(
            staff_id, schedule, user_id
        )

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Availability validation failed",
                    "errors": errors,
                    "warnings": warnings,
                }
            )

        # Delete existing templates for this staff
        db.table("availability_templates").delete().eq("staff_id", staff_id).execute()

        # Insert new templates
        templates = []
        for entry in schedule:
            if entry.get("is_working", True) and entry.get("start_time") and entry.get("end_time"):
                templates.append({
                    "staff_id": staff_id,
                    "day_of_week": entry["day_of_week"],
                    "start_time": entry["start_time"],
                    "end_time": entry["end_time"],
                    "slot_duration_minutes": entry.get("slot_duration_minutes", 30),
                    "is_active": True,
                })

        if templates:
            db.table("availability_templates").insert(templates).execute()

        return {
            "message": "Availability updated successfully",
            "staff_id": staff_id,
            "days_configured": len(templates),
            "warnings": warnings,
        }

    @staticmethod
    async def get_business_hours_for_staff(staff_id: str, user_id: str) -> List[dict]:
        """Get business hours for the staff's business"""
        db = get_db()

        # Get staff to get business_id
        staff = await StaffService.get_staff(staff_id, user_id)
        business_id = staff["business_id"]

        # Get business hours
        result = db.table("business_hours").select("*").eq("business_id", business_id).order("day_of_week").execute()

        return result.data if result.data else []

