from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime, date, timedelta

from backend.database.supabase_client import get_db
from backend.services.customer_service import CustomerService
from backend.services.staff_service import StaffService


class AppointmentService:
    
    @staticmethod
    async def get_available_slots(
        staff_id: str,
        start_date: date,
        end_date: Optional[date] = None,
        user_id: Optional[str] = None
    ) -> List[dict]:
        """Get available time slots for staff, filtered by closures, exceptions, and external calendar events"""
        db = get_db()
        
        # If user_id provided, verify they have access
        if user_id:
            await StaffService.get_staff(staff_id, user_id)
        
        # Default end_date to 30 days from start
        if not end_date:
            end_date = start_date + timedelta(days=30)
        
        # Get staff's business_id
        staff_result = db.table("staff").select("business_id").eq("id", staff_id).execute()
        if not staff_result.data:
            return []
        business_id = staff_result.data[0]["business_id"]
        
        # 1. Get business closures (holidays, etc.)
        closures_result = db.table("business_closures").select("closure_date").eq(
            "business_id", business_id
        ).gte("closure_date", str(start_date)).lte("closure_date", str(end_date)).execute()
        closed_dates = {c["closure_date"] for c in (closures_result.data or [])}
        
        # 2. Get staff availability exceptions (sick days, vacation)
        exceptions_result = db.table("availability_exceptions").select(
            "exception_date, exception_type"
        ).eq("staff_id", staff_id).eq("exception_type", "closed").gte(
            "exception_date", str(start_date)
        ).lte("exception_date", str(end_date)).execute()
        staff_off_dates = {e["exception_date"] for e in (exceptions_result.data or [])}
        
        # 3. Get business hours (to filter closed days of week)
        hours_result = db.table("business_hours").select("day_of_week").eq(
            "business_id", business_id
        ).eq("is_open", False).execute()
        closed_weekdays = {h["day_of_week"] for h in (hours_result.data or [])}
        
        # 4. Get available slots from time_slots table (not booked, not blocked)
        result = db.table("time_slots").select("*").eq(
            "staff_id", staff_id
        ).eq("is_booked", False).eq("is_blocked", False).gte(
            "date", str(start_date)
        ).lte("date", str(end_date)).order("date").order("time").execute()
        
        # 5. NEW: Get external calendar events that block time
        external_events_result = db.table("external_calendar_events").select(
            "start_datetime, end_datetime, is_all_day"
        ).eq("staff_id", staff_id).gte(
            "start_datetime", f"{start_date}T00:00:00"
        ).lte("end_datetime", f"{end_date}T23:59:59").execute()
        
        # Build list of blocked time ranges from external events
        blocked_ranges = []
        for event in (external_events_result.data or []):
            try:
                start_dt = datetime.fromisoformat(event["start_datetime"].replace("Z", ""))
                end_dt = datetime.fromisoformat(event["end_datetime"].replace("Z", ""))
                is_all_day = event.get("is_all_day", False)
                blocked_ranges.append({
                    "start": start_dt,
                    "end": end_dt,
                    "is_all_day": is_all_day
                })
            except (ValueError, TypeError):
                continue
        
        # 6. Filter out unavailable slots
        filtered_slots = []
        for slot in (result.data or []):
            slot_date = slot["date"]
            
            # Skip business closures (holidays)
            if slot_date in closed_dates:
                continue
            
            # Skip staff exceptions (sick days, vacation)
            if slot_date in staff_off_dates:
                continue
            
            # Skip closed weekdays (0=Sunday, 6=Saturday)
            slot_date_obj = datetime.strptime(slot_date, "%Y-%m-%d").date()
            day_of_week = (slot_date_obj.weekday() + 1) % 7  # Convert to our format (0=Sunday)
            if day_of_week in closed_weekdays:
                continue
            
            # 7. NEW: Check against external calendar events
            slot_time_str = slot["time"]
            time_parts = slot_time_str.split(":")
            slot_hour = int(time_parts[0])
            slot_minute = int(time_parts[1])
            
            slot_datetime = datetime.combine(
                slot_date_obj, 
                datetime.min.time().replace(hour=slot_hour, minute=slot_minute)
            )
            slot_duration = slot.get("duration_minutes", 30)
            slot_end = slot_datetime + timedelta(minutes=slot_duration)
            
            is_blocked_by_external = False
            for blocked in blocked_ranges:
                if blocked["is_all_day"]:
                    # All-day event blocks the entire day
                    if slot_date_obj == blocked["start"].date():
                        is_blocked_by_external = True
                        break
                else:
                    # Check for time overlap
                    # Overlap exists if: slot_start < event_end AND slot_end > event_start
                    if slot_datetime < blocked["end"] and slot_end > blocked["start"]:
                        is_blocked_by_external = True
                        break
            
            if is_blocked_by_external:
                continue
            
            # Slot passed all filters - it's available
            filtered_slots.append(slot)
        
        return filtered_slots
    
    @staticmethod
    async def create_appointment(appointment_data: dict, user_id: Optional[str] = None) -> dict:
        """Create a new appointment"""
        db = get_db()
        
        business_id = appointment_data["business_id"]
        
        # If user_id provided, verify ownership
        if user_id:
            user_result = db.table("users").select("business_id").eq("id", user_id).execute()
            
            if not user_result.data or user_result.data[0].get("business_id") != business_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to create appointments for this business"
                )
        
        # Verify customer exists and belongs to business
        customer_result = db.table("customers").select("*").eq("id", appointment_data["customer_id"]).eq("business_id", business_id).execute()
        
        if not customer_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # Verify staff exists and belongs to business
        staff_result = db.table("staff").select("*").eq("id", appointment_data["staff_id"]).eq("business_id", business_id).execute()
        
        if not staff_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        
        # Check if time slot is available
        # Normalize time format (handle both "09:00" and "09:00:00")
        appointment_time = appointment_data["appointment_time"]
        if len(appointment_time) == 5:
            # Convert "09:00" to "09:00:00" for database matching
            appointment_time_db = appointment_time + ":00"
        else:
            appointment_time_db = appointment_time
        
        slot_result = db.table("time_slots").select("*").eq("staff_id", appointment_data["staff_id"]).eq("date", str(appointment_data["appointment_date"])).eq("time", appointment_time_db).eq("is_booked", False).execute()
        
        if not slot_result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time slot is not available"
            )
        
        slot_id = slot_result.data[0]["id"]
        
        # Create appointment
        # Convert date to string if it's a date object
        if isinstance(appointment_data.get("appointment_date"), date):
            appointment_data["appointment_date"] = str(appointment_data["appointment_date"])
        
        appointment_data["slot_id"] = slot_id
        appointment_data["status"] = "scheduled"
        appointment_data["created_via"] = "dashboard" if user_id else "ai_phone"
        # Set reminder flags (defaults)
        appointment_data["reminder_sent_email"] = False
        appointment_data["reminder_sent_call"] = False
        appointment_data["reminder_sent_sms"] = False
        # Convert time to proper format if needed
        if "appointment_time" in appointment_data and len(appointment_data["appointment_time"]) == 5:
            appointment_data["appointment_time"] = appointment_data["appointment_time"] + ":00"
        
        result = db.table("appointments").insert(appointment_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create appointment"
            )
        
        appointment = result.data[0]
        
        # Mark slot as booked
        db.table("time_slots").update({"is_booked": True}).eq("id", slot_id).execute()
        
        # Update customer stats
        db.table("customers").update({
            "total_appointments": customer_result.data[0].get("total_appointments", 0) + 1,
            "last_visit_date": str(appointment_data["appointment_date"])
        }).eq("id", appointment_data["customer_id"]).execute()
        
        return appointment
    
    @staticmethod
    async def get_business_appointments(
        business_id: str,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        staff_id: Optional[str] = None
    ) -> List[dict]:
        """Get appointments for business with filters"""
        db = get_db()
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != business_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this business"
            )
        
        # Build query
        query = db.table("appointments").select("*").eq("business_id", business_id)
        
        # Apply filters
        if start_date:
            query = query.gte("appointment_date", str(start_date))
        if end_date:
            query = query.lte("appointment_date", str(end_date))
        if status:
            query = query.eq("status", status)
        if staff_id:
            query = query.eq("staff_id", staff_id)
        
        result = query.order("appointment_date").order("appointment_time").execute()
        
        # Get customer and staff details for each appointment
        appointments = []
        for apt in (result.data if result.data else []):
            # Get customer
            customer_result = db.table("customers").select("first_name, last_name, phone, email").eq("id", apt["customer_id"]).execute()
            customer = customer_result.data[0] if customer_result.data else {}
            
            # Get staff
            staff_result = db.table("staff").select("name, title").eq("id", apt["staff_id"]).execute()
            staff = staff_result.data[0] if staff_result.data else {}
            
            appointments.append({
                **apt,
                "customer_name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                "customer_phone": customer.get("phone", ""),
                "customer_email": customer.get("email"),
                "staff_name": staff.get("name", ""),
                "staff_title": staff.get("title", "")
            })
        
        return appointments
    
    @staticmethod
    async def get_appointment(appointment_id: str, user_id: str) -> dict:
        """Get appointment by ID"""
        db = get_db()
        
        # Get appointment
        result = db.table("appointments").select("*").eq("id", appointment_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        appointment = result.data[0]
        
        # Verify user owns this business
        user_result = db.table("users").select("business_id").eq("id", user_id).execute()
        
        if not user_result.data or user_result.data[0].get("business_id") != appointment["business_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this appointment"
            )
        
        # Get customer and staff details
        customer_result = db.table("customers").select("first_name, last_name, phone, email").eq("id", appointment["customer_id"]).execute()
        customer = customer_result.data[0] if customer_result.data else {}
        
        staff_result = db.table("staff").select("name, title").eq("id", appointment["staff_id"]).execute()
        staff = staff_result.data[0] if staff_result.data else {}
        
        return {
            **appointment,
            "customer_name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
            "customer_phone": customer.get("phone", ""),
            "customer_email": customer.get("email"),
            "staff_name": staff.get("name", ""),
            "staff_title": staff.get("title", "")
        }
    
    @staticmethod
    async def update_appointment(appointment_id: str, update_data: dict, user_id: str) -> dict:
        """Update appointment (reschedule, change status, etc.)"""
        db = get_db()
        
        # Get appointment to verify ownership
        appointment = await AppointmentService.get_appointment(appointment_id, user_id)
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data to update"
            )
        
        # If rescheduling, check new slot availability
        if "appointment_date" in update_data or "appointment_time" in update_data:
            new_date = update_data.get("appointment_date", appointment["appointment_date"])
            new_time = update_data.get("appointment_time", appointment["appointment_time"])
            staff_id = update_data.get("staff_id", appointment["staff_id"])
            
            # Check if new slot is available
            slot_result = db.table("time_slots").select("*").eq("staff_id", staff_id).eq("date", str(new_date)).eq("time", new_time).eq("is_booked", False).execute()
            
            if not slot_result.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="New time slot is not available"
                )
            
            new_slot_id = slot_result.data[0]["id"]
            
            # Free up old slot
            if appointment.get("slot_id"):
                db.table("time_slots").update({"is_booked": False}).eq("id", appointment["slot_id"]).execute()
            
            # Book new slot
            db.table("time_slots").update({"is_booked": True}).eq("id", new_slot_id).execute()
            update_data["slot_id"] = new_slot_id
        
        # Update appointment
        result = db.table("appointments").update(update_data).eq("id", appointment_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        return await AppointmentService.get_appointment(appointment_id, user_id)
    
    @staticmethod
    async def cancel_appointment(appointment_id: str, user_id: str, cancellation_reason: Optional[str] = None) -> dict:
        """Cancel appointment"""
        db = get_db()
        
        # Get appointment
        appointment = await AppointmentService.get_appointment(appointment_id, user_id)
        
        # Free up slot
        if appointment.get("slot_id"):
            db.table("time_slots").update({"is_booked": False}).eq("id", appointment["slot_id"]).execute()
        
        # Update appointment status
        result = db.table("appointments").update({
            "status": "cancelled",
            "cancellation_reason": cancellation_reason
        }).eq("id", appointment_id).execute()
        
        return {"message": "Appointment cancelled successfully"}
