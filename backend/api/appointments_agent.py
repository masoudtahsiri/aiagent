"""Appointment endpoints for AI agent (no authentication required)"""

from fastapi import APIRouter, Query, HTTPException, status

from typing import Optional

from datetime import date



from backend.database.supabase_client import get_db

from backend.services.reminder_service import ReminderService



router = APIRouter(prefix="/api/agent/appointments", tags=["Agent Appointments"])

# Separate router for customer agent endpoints
customer_router = APIRouter(prefix="/api/agent/customers", tags=["Agent Customers"])





@router.post("/book")

async def book_appointment_for_agent(

    business_id: str,

    customer_id: str,

    staff_id: str,

    appointment_date: str,

    appointment_time: str,

    duration_minutes: int = 30,

    service_id: Optional[str] = None,

    notes: Optional[str] = None

):

    """Book appointment (no auth - for AI agent)"""

    db = get_db()

    

    # Verify business exists

    business_result = db.table("businesses").select("id").eq("id", business_id).eq("is_active", True).execute()

    if not business_result.data:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    

    # Verify customer exists

    customer_result = db.table("customers").select("id").eq("id", customer_id).eq("business_id", business_id).execute()

    if not customer_result.data:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    

    # Verify staff exists

    staff_result = db.table("staff").select("id, name").eq("id", staff_id).eq("business_id", business_id).execute()

    if not staff_result.data:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")

    

    # Normalize time format

    if len(appointment_time) == 5:

        appointment_time_db = appointment_time + ":00"

    else:

        appointment_time_db = appointment_time

    

    # Check if slot is available

    slot_result = db.table("time_slots").select("*").eq("staff_id", staff_id).eq("date", appointment_date).eq("time", appointment_time_db).eq("is_booked", False).eq("is_blocked", False).execute()

    

    if not slot_result.data:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Time slot is not available")

    

    slot_id = slot_result.data[0]["id"]

    

    # Create appointment

    appointment_data = {

        "business_id": business_id,

        "customer_id": customer_id,

        "staff_id": staff_id,

        "service_id": service_id,

        "slot_id": slot_id,

        "appointment_date": appointment_date,

        "appointment_time": appointment_time_db,

        "duration_minutes": duration_minutes,

        "notes": notes,

        "status": "scheduled",

        "created_via": "ai_phone",

        "reminder_sent_email": False,

        "reminder_sent_call": False,

        "reminder_sent_sms": False

    }

    

    result = db.table("appointments").insert(appointment_data).execute()

    

    if not result.data:

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create appointment")

    

    appointment = result.data[0]

    

    # Mark slot as booked

    db.table("time_slots").update({"is_booked": True}).eq("id", slot_id).execute()

    

    # Update customer stats

    customer_data = db.table("customers").select("total_appointments").eq("id", customer_id).execute()

    current_total = customer_data.data[0].get("total_appointments", 0) if customer_data.data else 0

    db.table("customers").update({

        "total_appointments": current_total + 1,

        "last_visit_date": appointment_date

    }).eq("id", customer_id).execute()

    

    # Log to appointment history

    db.table("appointment_history").insert({

        "appointment_id": appointment["id"],

        "changed_by": "ai",

        "change_type": "created",

        "new_date": appointment_date,

        "new_time": appointment_time_db,

        "notes": "Booked via AI phone agent"

    }).execute()

    

    # Create reminders

    try:

        await ReminderService.create_reminders_for_appointment(appointment)

    except Exception as e:

        # Log but don't fail the booking

        print(f"Warning: Failed to create reminders: {e}")

    

    return {

        "success": True,

        "appointment": appointment,

        "staff_name": staff_result.data[0]["name"]

    }





@router.get("/customer/{customer_id}")

async def get_customer_appointments(

    customer_id: str,

    status: Optional[str] = Query(None),

    upcoming_only: bool = Query(True)

):

    """Get appointments for a customer (no auth - for AI agent)"""

    db = get_db()

    

    query = db.table("appointments").select(

        "*, staff(name, title)"

    ).eq("customer_id", customer_id)

    

    if status:

        query = query.eq("status", status)

    

    if upcoming_only:

        from datetime import date as date_type

        today = date_type.today().isoformat()

        query = query.gte("appointment_date", today)

    

    query = query.order("appointment_date").order("appointment_time")

    

    result = query.execute()

    

    return result.data if result.data else []





@router.post("/{appointment_id}/cancel")

async def cancel_appointment_for_agent(

    appointment_id: str,

    cancellation_reason: Optional[str] = None

):

    """Cancel appointment (no auth - for AI agent)"""

    db = get_db()

    

    # Get appointment

    apt_result = db.table("appointments").select("*").eq("id", appointment_id).execute()

    

    if not apt_result.data:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    

    appointment = apt_result.data[0]

    

    if appointment["status"] == "cancelled":

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment is already cancelled")

    

    # Free up slot

    if appointment.get("slot_id"):

        db.table("time_slots").update({"is_booked": False}).eq("id", appointment["slot_id"]).execute()

    

    # Update appointment - keep google_event_id for deletion tracking

    db.table("appointments").update({

        "status": "cancelled",

        "cancellation_reason": cancellation_reason,

        "sync_status": "pending_delete"  # NEW: Mark for deletion from Google Calendar

    }).eq("id", appointment_id).execute()

    

    # Log to history

    db.table("appointment_history").insert({

        "appointment_id": appointment_id,

        "changed_by": "ai",

        "change_type": "cancelled",

        "old_date": appointment["appointment_date"],

        "old_time": appointment["appointment_time"],

        "notes": cancellation_reason or "Cancelled via AI phone agent"

    }).execute()

    

    # Cancel reminders

    await ReminderService.cancel_appointment_reminders(appointment_id)

    

    return {
        "success": True, 
        "message": "Appointment cancelled successfully",
        "google_event_id": appointment.get("google_event_id")  # Return this for n8n to delete
    }





@router.post("/{appointment_id}/reschedule")

async def reschedule_appointment_for_agent(

    appointment_id: str,

    new_date: str,

    new_time: str,

    staff_id: Optional[str] = None

):

    """Reschedule appointment (no auth - for AI agent)"""

    db = get_db()

    

    # Get appointment

    apt_result = db.table("appointments").select("*").eq("id", appointment_id).execute()

    

    if not apt_result.data:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    

    appointment = apt_result.data[0]

    

    if appointment["status"] == "cancelled":

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reschedule cancelled appointment")

    

    # Use existing staff if not provided

    target_staff_id = staff_id or appointment["staff_id"]

    

    # Normalize time format

    if len(new_time) == 5:

        new_time_db = new_time + ":00"

    else:

        new_time_db = new_time

    

    # Check new slot availability

    slot_result = db.table("time_slots").select("*").eq("staff_id", target_staff_id).eq("date", new_date).eq("time", new_time_db).eq("is_booked", False).eq("is_blocked", False).execute()

    

    if not slot_result.data:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New time slot is not available")

    

    new_slot_id = slot_result.data[0]["id"]

    

    # Free old slot

    if appointment.get("slot_id"):

        db.table("time_slots").update({"is_booked": False}).eq("id", appointment["slot_id"]).execute()

    

    # Book new slot

    db.table("time_slots").update({"is_booked": True}).eq("id", new_slot_id).execute()

    

    # Update appointment

    db.table("appointments").update({

        "appointment_date": new_date,

        "appointment_time": new_time_db,

        "staff_id": target_staff_id,

        "slot_id": new_slot_id

    }).eq("id", appointment_id).execute()

    

    # Log to history

    db.table("appointment_history").insert({

        "appointment_id": appointment_id,

        "changed_by": "ai",

        "change_type": "rescheduled",

        "old_date": appointment["appointment_date"],

        "old_time": appointment["appointment_time"],

        "new_date": new_date,

        "new_time": new_time_db,

        "notes": "Rescheduled via AI phone agent"

    }).execute()

    

    # Cancel old reminders and create new ones

    await ReminderService.cancel_appointment_reminders(appointment_id)

    

    # Get updated appointment

    updated_apt = db.table("appointments").select("*").eq("id", appointment_id).execute()

    if updated_apt.data:

        try:

            await ReminderService.create_reminders_for_appointment(updated_apt.data[0])

        except Exception as e:

            print(f"Warning: Failed to create reminders: {e}")

    

    return {"success": True, "message": "Appointment rescheduled successfully"}


@router.get("/customer-context/{customer_id}")
async def get_customer_context(customer_id: str):
    """Get full customer context for AI agent (no auth)

    
    Returns:
    - Customer tags
    - Recent appointments (last 10)
    - Appointment history (changes, cancellations)
    """
    db = get_db()
    
    # Verify customer exists
    customer_result = db.table("customers").select("id, business_id").eq("id", customer_id).execute()
    if not customer_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    business_id = customer_result.data[0]["business_id"]
    
    # Get customer tags
    tags_result = db.table("customer_tags").select("tag").eq("customer_id", customer_id).execute()
    tags = [t["tag"] for t in (tags_result.data or [])]
    
    # Get recent appointments (last 10, any status)
    appointments_result = db.table("appointments").select(
        "id, appointment_date, appointment_time, status, notes, staff_id, service_id, cancellation_reason, created_at"
    ).eq("customer_id", customer_id).order("appointment_date", desc=True).limit(10).execute()
    
    recent_appointments = []
    for apt in (appointments_result.data or []):
        # Get staff name
        staff_name = None
        if apt.get("staff_id"):
            staff_result = db.table("staff").select("name").eq("id", apt["staff_id"]).execute()
            if staff_result.data:
                staff_name = staff_result.data[0]["name"]
        
        # Get service name
        service_name = None
        if apt.get("service_id"):
            service_result = db.table("services").select("name").eq("id", apt["service_id"]).execute()
            if service_result.data:
                service_name = service_result.data[0]["name"]
        
        recent_appointments.append({
            "id": apt["id"],
            "date": apt["appointment_date"],
            "time": apt["appointment_time"],
            "status": apt["status"],
            "staff_name": staff_name,
            "service_name": service_name,
            "notes": apt.get("notes"),
            "cancellation_reason": apt.get("cancellation_reason")
        })
    
    # Count cancellations and no-shows
    cancellation_count = len([a for a in recent_appointments if a["status"] == "cancelled"])
    no_show_count = len([a for a in recent_appointments if a["status"] == "no_show"])
    completed_count = len([a for a in recent_appointments if a["status"] == "completed"])
    
    return {
        "customer_id": customer_id,
        "tags": tags,
        "recent_appointments": recent_appointments,
        "stats": {
            "recent_completed": completed_count,
            "recent_cancelled": cancellation_count,
            "recent_no_shows": no_show_count
        }
    }


@customer_router.put("/{customer_id}")
async def update_customer_for_agent(
    customer_id: str,
    update_data: dict
):
    """Update customer info (no auth - for AI agent)"""
    db = get_db()
    
    # Verify customer exists
    customer_result = db.table("customers").select("id").eq("id", customer_id).execute()
    if not customer_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    # Only allow certain fields to be updated
    allowed_fields = [
        'email', 'phone', 'address', 'city', 'state', 'zip_code', 
        'first_name', 'last_name', 'notes',
        'preferred_contact_method', 'accommodations', 'language'
    ]
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields and v is not None}
    
    if not filtered_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid fields to update")
    
    result = db.table("customers").update(filtered_data).eq("id", customer_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update customer")
    
    return result.data[0]

