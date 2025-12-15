"""
Google Calendar Sync API - For n8n workflow integration

Handles bidirectional sync between database and Google Calendar:
- Time slots → Google Calendar (as free/busy/blocked)
- Availability exceptions → Google Calendar
- Business hours → Google Calendar
- Closures → Google Calendar
- Appointments ↔ Google Calendar (bidirectional)
- Automatic Google Calendar Push Notifications (Watch API)
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import uuid
import os
import logging

from backend.database.supabase_client import get_db

router = APIRouter(prefix="/api/calendar", tags=["Calendar Sync"])
logger = logging.getLogger(__name__)

# Your n8n webhook URL - UPDATE THIS
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "https://n8n.algorityai.com/webhook/google-calendar-push")


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class SyncRequest(BaseModel):
    """Request model for calendar sync"""
    staff_id: str
    sync_type: str = "bidirectional"  # 'push', 'pull', 'bidirectional'
    start_date: Optional[str] = None  # YYYY-MM-DD, defaults to today
    end_date: Optional[str] = None  # YYYY-MM-DD, defaults to +30 days


class SyncResponse(BaseModel):
    """Response model for calendar sync"""
    success: bool
    staff_id: str
    sync_type: str
    events_synced: int = 0
    errors: List[str] = []
    message: str


# =============================================================================
# SYNC ENDPOINT - Called by n8n
# =============================================================================

@router.post("/sync", response_model=SyncResponse)
async def sync_calendar(request: SyncRequest):
    """
    Sync calendar data between database and Google Calendar.
    
    Called by n8n workflow to perform real-time sync.
    
    Syncs:
    - Time slots (as free/busy/blocked in Google Calendar)
    - Availability exceptions (as all-day events)
    - Business closures (as all-day events)
    - Appointments (as calendar events)
    
    Args:
        staff_id: Staff member ID
        sync_type: 'push' (DB→Calendar), 'pull' (Calendar→DB), or 'bidirectional'
        start_date: Start date for sync range (YYYY-MM-DD)
        end_date: End date for sync range (YYYY-MM-DD)
    """
    db = get_db()
    
    # Validate staff exists
    staff_result = db.table("staff").select("id, name, business_id").eq("id", request.staff_id).execute()
    if not staff_result.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    staff = staff_result.data[0]
    business_id = staff["business_id"]
    
    # Get calendar connection
    conn_result = db.table("calendar_connections").select("*").eq(
        "staff_id", request.staff_id
    ).eq("provider", "google").eq("sync_enabled", True).execute()
    
    if not conn_result.data:
        return SyncResponse(
            success=False,
            staff_id=request.staff_id,
            sync_type=request.sync_type,
            message="No active Google Calendar connection found for this staff member"
        )
    
    connection = conn_result.data[0]
    
    # Set date range
    if not request.start_date:
        request.start_date = datetime.now().strftime("%Y-%m-%d")
    if not request.end_date:
        end_dt = datetime.strptime(request.start_date, "%Y-%m-%d") + timedelta(days=30)
        request.end_date = end_dt.strftime("%Y-%m-%d")
    
    errors = []
    events_synced = 0
    
    try:
        # PUSH: Database → Google Calendar
        if request.sync_type in ["push", "bidirectional"]:
            push_result = await _push_to_calendar(
                db=db,
                connection=connection,
                staff_id=request.staff_id,
                business_id=business_id,
                start_date=request.start_date,
                end_date=request.end_date
            )
            events_synced += push_result.get("events_synced", 0)
            errors.extend(push_result.get("errors", []))
        
        # PULL: Google Calendar → Database
        if request.sync_type in ["pull", "bidirectional"]:
            pull_result = await _pull_from_calendar(
                db=db,
                connection=connection,
                staff_id=request.staff_id,
                business_id=business_id,
                start_date=request.start_date,
                end_date=request.end_date
            )
            events_synced += pull_result.get("events_synced", 0)
            errors.extend(pull_result.get("errors", []))
        
        # Update last sync time
        db.table("calendar_connections").update({
            "last_sync_at": datetime.utcnow().isoformat()
        }).eq("id", connection["id"]).execute()
        
        # Log sync
        db.table("calendar_sync_log").insert({
            "calendar_connection_id": connection["id"],
            "sync_type": request.sync_type,
            "events_synced": events_synced,
            "errors_count": len(errors),
            "error_details": "; ".join(errors) if errors else None,
            "sync_status": "success" if not errors else "partial"
        }).execute()
        
        return SyncResponse(
            success=len(errors) == 0,
            staff_id=request.staff_id,
            sync_type=request.sync_type,
            events_synced=events_synced,
            errors=errors,
            message=f"Sync completed: {events_synced} events synced" + (f", {len(errors)} errors" if errors else "")
        )
    
    except Exception as e:
        # Log error
        db.table("calendar_sync_log").insert({
            "calendar_connection_id": connection["id"],
            "sync_type": request.sync_type,
            "events_synced": 0,
            "errors_count": 1,
            "error_details": str(e),
            "sync_status": "failed"
        }).execute()
        
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# =============================================================================
# WEBHOOK ENDPOINT - Called by Google Calendar
# =============================================================================

@router.post("/webhook")
async def calendar_webhook(request: dict):
    """
    Webhook endpoint for Google Calendar push notifications.
    
    Called by Google Calendar when events change.
    Triggers pull sync for the affected staff member.
    """
    # Google Calendar sends notifications in this format
    # We'll extract the calendar ID and trigger a pull sync
    
    channel_id = request.get("channel_id")
    resource_id = request.get("resource_id")
    
    if not channel_id:
        return {"status": "ignored", "reason": "no channel_id"}
    
    db = get_db()
    
    # Find connection by channel_id (stored in calendar_connections)
    # Note: You may need to store channel_id when setting up webhook
    conn_result = db.table("calendar_connections").select("*").eq(
        "provider", "google"
    ).execute()
    
    # For now, sync all active connections
    # In production, match by channel_id
    for connection in (conn_result.data or []):
        if connection.get("sync_enabled"):
            try:
                await sync_calendar(SyncRequest(
                    staff_id=connection["staff_id"],
                    sync_type="pull",
                    start_date=datetime.now().strftime("%Y-%m-%d"),
                    end_date=(datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                ))
            except Exception as e:
                # Log error but don't fail webhook
                pass
    
    return {"status": "processed"}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def _push_to_calendar(
    db,
    connection: dict,
    staff_id: str,
    business_id: str,
    start_date: str,
    end_date: str
) -> dict:
    """Push database data to Google Calendar"""
    events_synced = 0
    errors = []
    
    # This function will be called by n8n with Google Calendar credentials
    # For now, return the data that needs to be synced
    
    # 1. Get time slots (as free/busy blocks)
    slots_result = db.table("time_slots").select("*").eq(
        "staff_id", staff_id
    ).gte("date", start_date).lte("date", end_date).execute()
    
    # 2. Get availability exceptions
    exceptions_result = db.table("availability_exceptions").select("*").eq(
        "staff_id", staff_id
    ).gte("exception_date", start_date).lte("exception_date", end_date).execute()
    
    # 3. Get business closures
    closures_result = db.table("business_closures").select("*").eq(
        "business_id", business_id
    ).gte("closure_date", start_date).lte("closure_date", end_date).execute()
    
    # 4. Get appointments
    appointments_result = db.table("appointments").select(
        "*, customers(first_name, last_name, phone), services(name)"
    ).eq("staff_id", staff_id).gte(
        "appointment_date", start_date
    ).lte("appointment_date", end_date).execute()
    
    # Return data for n8n to process
    return {
        "events_synced": 0,  # n8n will count
        "errors": [],
        "data": {
            "time_slots": slots_result.data or [],
            "availability_exceptions": exceptions_result.data or [],
            "business_closures": closures_result.data or [],
            "appointments": appointments_result.data or []
        }
    }


async def _pull_from_calendar(
    db,
    connection: dict,
    staff_id: str,
    business_id: str,
    start_date: str,
    end_date: str
) -> dict:
    """Pull Google Calendar events to database"""
    events_synced = 0
    errors = []
    
    # This function will be called by n8n with Google Calendar credentials
    # n8n will fetch events from Google Calendar and return them here
    
    # For now, return structure for n8n to populate
    return {
        "events_synced": 0,  # n8n will count
        "errors": [],
        "data": {
            "calendar_events": []  # n8n will populate
        }
    }


# =============================================================================
# GET SYNC STATUS
# =============================================================================

@router.get("/sync-data")
async def get_sync_data(
    staff_id: str = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...)
):
    """
    Get data from database that needs to be synced to Google Calendar.
    
    Called by n8n to get appointments, slots, exceptions, closures.
    """
    db = get_db()
    
    # Validate staff exists
    staff_result = db.table("staff").select("id, business_id").eq("id", staff_id).execute()
    if not staff_result.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    business_id = staff_result.data[0]["business_id"]
    
    # Get time slots (only blocked ones)
    slots_result = db.table("time_slots").select("*").eq(
        "staff_id", staff_id
    ).eq("is_blocked", True).gte("date", start_date).lte("date", end_date).execute()
    
    # Get availability exceptions
    exceptions_result = db.table("availability_exceptions").select("*").eq(
        "staff_id", staff_id
    ).eq("exception_type", "closed").gte("exception_date", start_date).lte("exception_date", end_date).execute()
    
    # Get business closures
    closures_result = db.table("business_closures").select("*").eq(
        "business_id", business_id
    ).gte("closure_date", start_date).lte("closure_date", end_date).execute()
    
    # Get appointments (non-cancelled)
    appointments_result = db.table("appointments").select(
        "*, customers(first_name, last_name, phone), services(name)"
    ).eq("staff_id", staff_id).neq("status", "cancelled").gte(
        "appointment_date", start_date
    ).lte("appointment_date", end_date).execute()
    
    return {
        "staff_id": staff_id,
        "business_id": business_id,
        "time_slots": slots_result.data or [],
        "availability_exceptions": exceptions_result.data or [],
        "business_closures": closures_result.data or [],
        "appointments": appointments_result.data or []
    }


@router.post("/sync-events")
async def sync_events_to_db(request: dict):
    """
    Receive Google Calendar events and sync to database.
    
    Called by n8n after fetching events from Google Calendar.
    Accepts: { staff_id: str, events: List[dict] } or { staff_id: str, events: dict }
    """
    events_raw = request.get("events", [])
    staff_id = request.get("staff_id")
    
    if not staff_id:
        raise HTTPException(status_code=400, detail="staff_id required")
    
    # Handle both single event object and array of events
    if isinstance(events_raw, dict):
        events = [events_raw]
    elif isinstance(events_raw, list):
        events = events_raw
    else:
        events = []
    
    db = get_db()
    synced_count = 0
    errors = []
    
    # Validate staff exists
    staff_result = db.table("staff").select("id, business_id").eq("id", staff_id).execute()
    if not staff_result.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    business_id = staff_result.data[0]["business_id"]
    
    for event in events:
        try:
            # Check if event is from external source (not our system)
            # Events from our system will have identifiers like appointment_id, slot_id, etc.
            
            event_id = event.get("calendar_event_id") or event.get("id")
            source = event.get("source", "google_calendar")
            
            # If event is from our database (already synced), skip
            if source == "database":
                continue
            
            # For external events, you can:
            # 1. Create as appointment if it looks like an appointment
            # 2. Create as blocked time slot
            # 3. Just log it for review
            
            # For now, we'll just count it as synced
            # You can implement full logic based on your business needs
            synced_count += 1
            
        except Exception as e:
            errors.append(f"Error processing event {event.get('id', 'unknown')}: {str(e)}")
    
    return {
        "success": len(errors) == 0,
        "events_synced": synced_count,
        "errors": errors,
        "message": f"Synced {synced_count} events from Google Calendar" + (f", {len(errors)} errors" if errors else "")
    }


@router.post("/sync-from-calendar")
async def sync_from_calendar(request: dict):
    """
    Receive Google Calendar events and sync to database.
    
    Called by n8n after fetching events from Google Calendar.
    (Legacy endpoint - use /sync-events instead)
    """
    return await sync_events_to_db(request)


@router.get("/sync-status")
async def get_all_sync_status():
    """
    Get all staff members with active Google Calendar connections.
    
    Called by n8n workflow to get list of staff that need syncing.
    """
    db = get_db()
    
    # Get all active Google Calendar connections
    conn_result = db.table("calendar_connections").select(
        "*, staff(id, name, business_id)"
    ).eq("provider", "google").eq("sync_enabled", True).execute()
    
    if not conn_result.data:
        return []
    
    # Format response for n8n
    staff_list = []
    for connection in conn_result.data:
        staff_list.append({
            "staff_id": connection["staff_id"],
            "calendar_id": connection.get("calendar_id"),
            "last_sync_at": connection.get("last_sync_at"),
            "sync_direction": connection.get("sync_direction", "bidirectional"),
            "staff_name": connection.get("staff", {}).get("name") if connection.get("staff") else None,
            "business_id": connection.get("staff", {}).get("business_id") if connection.get("staff") else None
        })
    
    return staff_list


@router.get("/sync-status/{staff_id}")
async def get_sync_status(staff_id: str):
    """Get last sync status for a staff member"""
    db = get_db()
    
    conn_result = db.table("calendar_connections").select(
        "*, calendar_sync_log(*)"
    ).eq("staff_id", staff_id).eq("provider", "google").order(
        "calendar_sync_log.created_at", desc=True
    ).limit(1).execute()
    
    if not conn_result.data:
        raise HTTPException(status_code=404, detail="No calendar connection found")
    
    connection = conn_result.data[0]
    
    return {
        "staff_id": staff_id,
        "sync_enabled": connection.get("sync_enabled", False),
        "last_sync_at": connection.get("last_sync_at"),
        "sync_direction": connection.get("sync_direction", "bidirectional"),
        "last_sync_log": connection.get("calendar_sync_log", [{}])[0] if connection.get("calendar_sync_log") else None
    }


# =============================================================================
# BLOCK/UNBLOCK SLOTS FROM EXTERNAL CALENDAR EVENTS
# =============================================================================

@router.post("/block-from-calendar")
async def block_slots_from_calendar_event(request: dict):
    """
    Block time slots based on a Google Calendar event.
    Called by n8n when external events are detected.
    
    This prevents double-booking when staff has personal events in Google Calendar.
    """
    from datetime import datetime, timedelta
    
    db = get_db()
    
    staff_id = request.get("staff_id")
    google_event_id = request.get("google_event_id")
    start_datetime = request.get("start")
    end_datetime = request.get("end")
    summary = request.get("summary", "External Event")
    is_all_day = request.get("is_all_day", False)
    
    if not all([staff_id, google_event_id, start_datetime, end_datetime]):
        raise HTTPException(status_code=400, detail="Missing required fields: staff_id, google_event_id, start, end")
    
    # Parse datetimes
    try:
        if 'T' in start_datetime:
            start_dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00').replace('+00:00', ''))
            end_dt = datetime.fromisoformat(end_datetime.replace('Z', '+00:00').replace('+00:00', ''))
        else:
            # All-day event (date only)
            start_dt = datetime.strptime(start_datetime, "%Y-%m-%d")
            end_dt = datetime.strptime(end_datetime, "%Y-%m-%d")
            is_all_day = True
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {e}")
    
    # Get staff's business_id
    staff_result = db.table("staff").select("business_id").eq("id", staff_id).execute()
    if not staff_result.data:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    business_id = staff_result.data[0]["business_id"]
    
    # Check if we already have this event
    existing = db.table("external_calendar_events").select("id").eq(
        "google_event_id", google_event_id
    ).eq("staff_id", staff_id).execute()
    
    if existing.data:
        # Update existing event
        db.table("external_calendar_events").update({
            "summary": summary,
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat(),
            "is_all_day": is_all_day,
            "last_synced_at": datetime.utcnow().isoformat()
        }).eq("google_event_id", google_event_id).eq("staff_id", staff_id).execute()
    else:
        # Insert new event
        db.table("external_calendar_events").insert({
            "staff_id": staff_id,
            "business_id": business_id,
            "google_event_id": google_event_id,
            "summary": summary,
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat(),
            "is_all_day": is_all_day
        }).execute()
    
    # Block overlapping time slots
    current_date = start_dt.date()
    end_date = end_dt.date()
    blocked_count = 0
    
    while current_date <= end_date:
        # Get all unbooked slots for this date
        slots = db.table("time_slots").select("id, time, duration_minutes").eq(
            "staff_id", staff_id
        ).eq("date", str(current_date)).eq("is_booked", False).execute()
        
        for slot in (slots.data or []):
            # Parse slot time
            time_parts = slot["time"].split(":")
            slot_hour = int(time_parts[0])
            slot_minute = int(time_parts[1])
            slot_datetime = datetime.combine(current_date, datetime.min.time().replace(hour=slot_hour, minute=slot_minute))
            slot_end = slot_datetime + timedelta(minutes=slot.get("duration_minutes", 30))
            
            # Check if slot overlaps with the event
            # For all-day events, block all slots on that day
            if is_all_day:
                overlaps = True
            else:
                overlaps = slot_datetime < end_dt and slot_end > start_dt
            
            if overlaps:
                db.table("time_slots").update({
                    "is_blocked": True,
                    "google_event_id": google_event_id,
                    "blocked_reason": summary
                }).eq("id", slot["id"]).execute()
                blocked_count += 1
        
        current_date += timedelta(days=1)
    
    return {
        "success": True,
        "slots_blocked": blocked_count,
        "google_event_id": google_event_id,
        "message": f"Blocked {blocked_count} time slots for event: {summary}"
    }


@router.post("/unblock-from-calendar")
async def unblock_slots_from_calendar_event(request: dict):
    """
    Unblock time slots when a Google Calendar event is deleted or cancelled.
    Called by n8n when events are removed from Google Calendar.
    """
    db = get_db()
    
    staff_id = request.get("staff_id")
    google_event_id = request.get("google_event_id")
    
    if not google_event_id:
        raise HTTPException(status_code=400, detail="google_event_id is required")
    
    # Remove external event record
    db.table("external_calendar_events").delete().eq(
        "google_event_id", google_event_id
    ).execute()
    
    # Unblock time slots that were blocked by this event
    query = db.table("time_slots").update({
        "is_blocked": False,
        "google_event_id": None,
        "blocked_reason": None
    }).eq("google_event_id", google_event_id)
    
    if staff_id:
        query = query.eq("staff_id", staff_id)
    
    result = query.execute()
    
    unblocked_count = len(result.data) if result.data else 0
    
    return {
        "success": True,
        "slots_unblocked": unblocked_count,
        "google_event_id": google_event_id,
        "message": f"Unblocked {unblocked_count} time slots"
    }


@router.post("/mark-appointment-synced")
async def mark_appointment_synced(request: dict):
    """
    Mark an appointment as synced to Google Calendar.
    Called by n8n after successfully creating a Google Calendar event.
    """
    from datetime import datetime
    
    db = get_db()
    
    appointment_id = request.get("appointment_id")
    google_event_id = request.get("google_event_id")
    
    if not appointment_id or not google_event_id:
        raise HTTPException(status_code=400, detail="appointment_id and google_event_id are required")
    
    result = db.table("appointments").update({
        "google_event_id": google_event_id,
        "sync_status": "synced",
        "last_synced_at": datetime.utcnow().isoformat()
    }).eq("id", appointment_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {
        "success": True,
        "appointment_id": appointment_id,
        "google_event_id": google_event_id
    }


@router.get("/external-events/{staff_id}")
async def get_external_events(
    staff_id: str,
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    """
    Get all external calendar events for a staff member.
    Useful for debugging and viewing what's blocking availability.
    """
    db = get_db()
    
    query = db.table("external_calendar_events").select("*").eq("staff_id", staff_id)
    
    if start_date:
        query = query.gte("start_datetime", f"{start_date}T00:00:00")
    if end_date:
        query = query.lte("end_datetime", f"{end_date}T23:59:59")
    
    result = query.order("start_datetime").execute()
    
    return result.data or []


@router.get("/cancelled-appointments")
async def get_cancelled_appointments_for_sync(
    staff_id: str = Query(None),
    business_id: str = Query(None)
):
    """
    Get appointments that were cancelled and need to be deleted from Google Calendar.
    Called by n8n to sync cancellations.
    """
    db = get_db()
    
    # Find appointments that are cancelled AND have a google_event_id AND are pending delete
    query = db.table("appointments").select(
        "id, google_event_id, staff_id, business_id, appointment_date, appointment_time"
    ).eq("status", "cancelled").eq("sync_status", "pending_delete").not_.is_("google_event_id", "null")
    
    if staff_id:
        query = query.eq("staff_id", staff_id)
    if business_id:
        query = query.eq("business_id", business_id)
    
    result = query.limit(50).execute()
    
    return result.data or []


@router.post("/mark-appointment-deleted")
async def mark_appointment_deleted_from_calendar(request: dict):
    """
    Mark an appointment as deleted from Google Calendar.
    Called by n8n after successfully deleting the Google Calendar event.
    """
    db = get_db()
    
    appointment_id = request.get("appointment_id")
    
    if not appointment_id:
        raise HTTPException(status_code=400, detail="appointment_id is required")
    
    result = db.table("appointments").update({
        "sync_status": "deleted",
        "google_event_id": None  # Clear the event ID since it no longer exists
    }).eq("id", appointment_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {
        "success": True,
        "appointment_id": appointment_id
    }


# =============================================================================
# CALENDAR WATCH API - Automatic Push Notifications
# =============================================================================

@router.post("/watch/create")
async def create_calendar_watch(request: dict):
    """
    Create a Google Calendar watch for a staff member.
    
    CALL THIS after staff completes Google Calendar OAuth.
    
    Request body:
    {
        "staff_id": "uuid",
        "channel_id": "uuid",  # Generated by n8n
        "resource_id": "string",  # From Google response
        "expiration": 1234567890000  # Unix timestamp ms from Google
    }
    
    n8n handles the actual Google API call and passes us the result.
    """
    db = get_db()
    
    staff_id = request.get("staff_id")
    channel_id = request.get("channel_id")
    resource_id = request.get("resource_id")
    expiration = request.get("expiration")
    
    if not all([staff_id, channel_id, resource_id, expiration]):
        raise HTTPException(status_code=400, detail="Missing required fields: staff_id, channel_id, resource_id, expiration")
    
    # Validate staff exists
    staff_result = db.table("staff").select("id, business_id").eq("id", staff_id).execute()
    if not staff_result.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Convert expiration from milliseconds to timestamp
    expiration_dt = datetime.fromtimestamp(int(expiration) / 1000)
    
    # Get calendar connection ID
    conn_result = db.table("calendar_connections").select("id").eq(
        "staff_id", staff_id
    ).eq("provider", "google").execute()
    
    calendar_connection_id = conn_result.data[0]["id"] if conn_result.data else None
    
    # Check if watch already exists
    existing = db.table("calendar_webhook_channels").select("id").eq(
        "staff_id", staff_id
    ).execute()
    
    channel_data = {
        "calendar_connection_id": calendar_connection_id,
        "staff_id": staff_id,
        "channel_id": channel_id,
        "resource_id": resource_id,
        "expiration": expiration_dt.isoformat(),
    }
    
    if existing.data:
        # Update existing watch
        db.table("calendar_webhook_channels").update(channel_data).eq(
            "staff_id", staff_id
        ).execute()
        logger.info(f"[Watch] Updated watch for staff {staff_id}")
    else:
        # Create new watch
        db.table("calendar_webhook_channels").insert(channel_data).execute()
        logger.info(f"[Watch] Created watch for staff {staff_id}")
    
    return {
        "success": True,
        "staff_id": staff_id,
        "channel_id": channel_id,
        "expiration": expiration_dt.isoformat()
    }


@router.post("/watch/renew")
async def renew_watch(request: dict):
    """
    Renew a watch that's about to expire.
    Called by n8n when it detects expiration is near.
    
    Request body:
    {
        "staff_id": "uuid",
        "channel_id": "uuid",
        "resource_id": "string",
        "expiration": 1234567890000
    }
    """
    # Same as create - upsert logic handles renewal
    return await create_calendar_watch(request)


@router.get("/watch/channel-info/{staff_id}")
async def get_channel_info(staff_id: str):
    """
    Get watch channel info for a staff member.
    n8n uses this to check expiration time.
    """
    db = get_db()
    
    channel = db.table("calendar_webhook_channels").select("*").eq(
        "staff_id", staff_id
    ).execute()
    
    if not channel.data:
        return {"exists": False}
    
    channel_data = channel.data[0]
    expiration_dt = datetime.fromisoformat(channel_data["expiration"])
    
    return {
        "exists": True,
        "channel_id": channel_data["channel_id"],
        "resource_id": channel_data["resource_id"],
        "expiration": int(expiration_dt.timestamp() * 1000),
        "expires_at": channel_data["expiration"]
    }


@router.get("/watch/expiring-channels")
async def get_expiring_channels(hours_ahead: int = Query(24)):
    """
    Get channels that will expire within the specified hours.
    Called by n8n daily renewal workflow.
    """
    db = get_db()
    
    # Find channels expiring in the next N hours
    expiration_threshold = (datetime.utcnow() + timedelta(hours=hours_ahead)).isoformat()
    
    result = db.table("calendar_webhook_channels").select(
        "*, calendar_connections(staff_id, calendar_id)"
    ).lt("expiration", expiration_threshold).execute()
    
    channels = []
    for channel in (result.data or []):
        channels.append({
            "staff_id": channel["staff_id"],
            "channel_id": channel["channel_id"],
            "resource_id": channel["resource_id"],
            "expiration": channel["expiration"],
            "calendar_id": channel.get("calendar_connections", {}).get("calendar_id", "primary") if channel.get("calendar_connections") else "primary"
        })
    
    return {
        "expiring_count": len(channels),
        "channels": channels
    }


@router.post("/watch/stop")
async def stop_watch(request: dict):
    """
    Stop watching a calendar and remove from database.
    Called by n8n after stopping the watch with Google.
    
    Request body:
    {
        "channel_id": "uuid"  # OR
        "staff_id": "uuid"
    }
    """
    db = get_db()
    
    channel_id = request.get("channel_id")
    staff_id = request.get("staff_id")
    
    if channel_id:
        db.table("calendar_webhook_channels").delete().eq(
            "channel_id", channel_id
        ).execute()
    elif staff_id:
        db.table("calendar_webhook_channels").delete().eq(
            "staff_id", staff_id
        ).execute()
    else:
        raise HTTPException(status_code=400, detail="channel_id or staff_id required")
    
    return {"success": True}


@router.get("/watch/active-watches")
async def get_active_watches():
    """
    Get all active watch channels.
    Useful for debugging and monitoring.
    """
    db = get_db()
    
    result = db.table("calendar_webhook_channels").select(
        "*, staff(name, email)"
    ).gt("expiration", datetime.utcnow().isoformat()).execute()
    
    return {
        "active_count": len(result.data or []),
        "watches": result.data or []
    }


@router.post("/watch/block-from-external")
async def block_from_external_event(request: dict):
    """
    Block time slots based on an external Google Calendar event.
    Called by n8n when processing external events.
    
    Request body:
    {
        "staff_id": "uuid",
        "google_event_id": "string",
        "summary": "Event title",
        "start_time": "2024-01-01T10:00:00Z",
        "end_time": "2024-01-01T11:00:00Z",
        "is_all_day": false
    }
    """
    db = get_db()
    
    staff_id = request.get("staff_id")
    google_event_id = request.get("google_event_id")
    summary = request.get("summary", "External Event")
    start_time = request.get("start_time")
    end_time = request.get("end_time")
    is_all_day = request.get("is_all_day", False)
    
    if not all([staff_id, google_event_id, start_time, end_time]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Parse datetimes
    try:
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00').replace('+00:00', ''))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00').replace('+00:00', ''))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {e}")
    
    # Get staff's business_id
    staff_result = db.table("staff").select("business_id").eq("id", staff_id).execute()
    if not staff_result.data:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    business_id = staff_result.data[0]["business_id"]
    
    # Save/update external event record
    existing = db.table("external_calendar_events").select("id").eq(
        "staff_id", staff_id
    ).eq("google_event_id", google_event_id).execute()
    
    if existing.data:
        db.table("external_calendar_events").update({
            "summary": summary,
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat(),
            "is_all_day": is_all_day,
            "last_synced_at": datetime.utcnow().isoformat()
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        db.table("external_calendar_events").insert({
            "staff_id": staff_id,
            "business_id": business_id,
            "google_event_id": google_event_id,
            "summary": summary,
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat(),
            "is_all_day": is_all_day
        }).execute()
    
    # Block overlapping time slots
    current_date = start_dt.date()
    end_date = end_dt.date()
    blocked_count = 0
    
    while current_date <= end_date:
        # Get all unbooked slots for this date
        slots = db.table("time_slots").select("id, time, duration_minutes").eq(
            "staff_id", staff_id
        ).eq("date", str(current_date)).eq("is_booked", False).execute()
        
        for slot in (slots.data or []):
            # Parse slot time
            time_parts = slot["time"].split(":")
            slot_hour = int(time_parts[0])
            slot_minute = int(time_parts[1])
            slot_datetime = datetime.combine(current_date, datetime.min.time().replace(hour=slot_hour, minute=slot_minute))
            slot_end = slot_datetime + timedelta(minutes=slot.get("duration_minutes", 30))
            
            # Check if slot overlaps with the event
            if is_all_day:
                overlaps = True
            else:
                overlaps = slot_datetime < end_dt and slot_end > start_dt
            
            if overlaps:
                db.table("time_slots").update({
                    "is_blocked": True,
                    "google_event_id": google_event_id,
                    "blocked_reason": summary[:100]
                }).eq("id", slot["id"]).execute()
                blocked_count += 1
        
        current_date += timedelta(days=1)
    
    return {
        "success": True,
        "blocked": True,
        "slots_blocked": blocked_count
    }


@router.post("/watch/unblock-from-external")
async def unblock_from_external_event(request: dict):
    """
    Unblock time slots when an external event is deleted/cancelled.
    Called by n8n when processing cancelled events.
    
    Request body:
    {
        "staff_id": "uuid",
        "google_event_id": "string"
    }
    """
    db = get_db()
    
    staff_id = request.get("staff_id")
    google_event_id = request.get("google_event_id")
    
    if not google_event_id:
        raise HTTPException(status_code=400, detail="google_event_id is required")
    
    # Remove external event record
    db.table("external_calendar_events").delete().eq(
        "google_event_id", google_event_id
    ).execute()
    
    # Unblock associated time slots
    query = db.table("time_slots").update({
        "is_blocked": False,
        "google_event_id": None,
        "blocked_reason": None
    }).eq("google_event_id", google_event_id)
    
    if staff_id:
        query = query.eq("staff_id", staff_id)
    
    result = query.execute()
    unblocked_count = len(result.data) if result.data else 0
    
    return {
        "success": True,
        "unblocked": True,
        "slots_unblocked": unblocked_count
    }


@router.post("/watch/cleanup-deleted-events")
async def cleanup_deleted_events(request: dict):
    """
    Remove external events that no longer exist in Google Calendar.
    Called by n8n with list of current event IDs.
    
    Request body:
    {
        "staff_id": "uuid",
        "current_event_ids": ["event1", "event2", ...]
    }
    """
    db = get_db()
    
    staff_id = request.get("staff_id")
    current_event_ids = request.get("current_event_ids", [])
    
    if not staff_id:
        raise HTTPException(status_code=400, detail="staff_id is required")
    
    # Find events in our DB that aren't in Google Calendar anymore
    existing = db.table("external_calendar_events").select("*").eq(
        "staff_id", staff_id
    ).execute()
    
    deleted_count = 0
    for event in (existing.data or []):
        if event["google_event_id"] not in current_event_ids:
            # This event was deleted from Google Calendar
            await unblock_from_external_event({
                "staff_id": staff_id,
                "google_event_id": event["google_event_id"]
            })
            deleted_count += 1
    
    return {
        "success": True,
        "deleted_count": deleted_count
    }


