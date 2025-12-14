from fastapi import APIRouter, Request, HTTPException, Header
from datetime import datetime, timedelta
from typing import Optional
import httpx
import uuid

from backend.database.supabase_client import get_db

router = APIRouter(prefix="/api/calendar/webhooks", tags=["Calendar Webhooks"])


@router.post("/receive")
async def receive_google_webhook(
    request: Request,
    x_goog_channel_id: Optional[str] = Header(None),
    x_goog_resource_id: Optional[str] = Header(None),
    x_goog_resource_state: Optional[str] = Header(None),
    x_goog_message_number: Optional[str] = Header(None)
):
    """
    Receive push notifications from Google Calendar.
    Google sends a POST request here whenever a calendar changes.
    """
    db = get_db()
    
    # Log the webhook for debugging
    print(f"[Webhook] Received: channel={x_goog_channel_id}, state={x_goog_resource_state}")
    
    # Ignore sync messages (sent when watch is first created)
    if x_goog_resource_state == "sync":
        return {"status": "sync acknowledged"}
    
    # Find the channel in our database
    if not x_goog_channel_id:
        return {"status": "no channel id"}
    
    channel_result = db.table("calendar_webhook_channels").select(
        "*, calendar_connections(*)"
    ).eq("channel_id", x_goog_channel_id).execute()
    
    if not channel_result.data:
        print(f"[Webhook] Unknown channel: {x_goog_channel_id}")
        return {"status": "unknown channel"}
    
    channel = channel_result.data[0]
    staff_id = channel["staff_id"]
    
    # Trigger a sync for this staff member
    # In production, you might want to queue this instead of processing inline
    await process_calendar_changes(staff_id, channel)
    
    return {"status": "processed"}


async def process_calendar_changes(staff_id: str, channel: dict):
    """
    Process calendar changes for a specific staff member.
    This is called when we receive a webhook notification.
    """
    db = get_db()
    
    # Get the calendar connection
    connection = channel.get("calendar_connections", {})
    calendar_id = connection.get("calendar_id", "primary")
    
    # Get staff's Google OAuth token
    # NOTE: You need to implement token storage and refresh
    # This is a placeholder - in production, get the actual token
    
    print(f"[Webhook] Processing changes for staff {staff_id}, calendar {calendar_id}")
    
    # For now, we'll trigger the n8n workflow via webhook
    # You can replace this with direct API calls if you store OAuth tokens
    
    try:
        async with httpx.AsyncClient() as client:
            # Trigger n8n workflow for this specific staff
            # You'll need to create a webhook trigger in n8n for this
            await client.post(
                f"https://n8n.algorityai.com/webhook/calendar-sync",
                json={"staff_id": staff_id},
                timeout=10
            )
    except Exception as e:
        print(f"[Webhook] Failed to trigger n8n: {e}")


@router.post("/register")
async def register_webhook_for_staff(request: dict):
    """
    Register a Google Calendar watch for a staff member.
    This needs to be called with a valid Google OAuth token.
    
    Called by n8n or admin to set up real-time sync.
    """
    db = get_db()
    
    staff_id = request.get("staff_id")
    access_token = request.get("access_token")  # Google OAuth token
    calendar_id = request.get("calendar_id", "primary")
    webhook_url = request.get("webhook_url")  # Your public webhook URL
    
    if not all([staff_id, access_token, webhook_url]):
        raise HTTPException(status_code=400, detail="staff_id, access_token, and webhook_url are required")
    
    # Generate unique channel ID
    channel_id = str(uuid.uuid4())
    
    # Calculate expiration (max 7 days for Google)
    expiration = datetime.utcnow() + timedelta(days=7)
    expiration_ms = int(expiration.timestamp() * 1000)
    
    # Register watch with Google Calendar API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/watch",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={
                "id": channel_id,
                "type": "web_hook",
                "address": webhook_url,
                "expiration": expiration_ms
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to register webhook: {response.text}"
            )
        
        google_response = response.json()
    
    # Get calendar connection ID
    conn_result = db.table("calendar_connections").select("id").eq(
        "staff_id", staff_id
    ).eq("calendar_id", calendar_id).execute()
    
    calendar_connection_id = conn_result.data[0]["id"] if conn_result.data else None
    
    # Store channel info in database
    db.table("calendar_webhook_channels").upsert({
        "calendar_connection_id": calendar_connection_id,
        "staff_id": staff_id,
        "channel_id": channel_id,
        "resource_id": google_response.get("resourceId"),
        "expiration": expiration.isoformat()
    }, on_conflict="calendar_connection_id").execute()
    
    return {
        "success": True,
        "channel_id": channel_id,
        "resource_id": google_response.get("resourceId"),
        "expiration": expiration.isoformat()
    }


@router.post("/renew-all")
async def renew_expiring_webhooks():
    """
    Renew webhook channels that are about to expire.
    Should be called daily by a cron job.
    """
    db = get_db()
    
    # Find channels expiring in the next 24 hours
    tomorrow = (datetime.utcnow() + timedelta(days=1)).isoformat()
    
    expiring = db.table("calendar_webhook_channels").select(
        "*, calendar_connections(*)"
    ).lt("expiration", tomorrow).execute()
    
    renewed = []
    failed = []
    
    for channel in expiring.data or []:
        # TODO: Get OAuth token for this staff member and call register_webhook_for_staff
        # For now, just log it
        print(f"[Webhook] Channel {channel['channel_id']} needs renewal")
        failed.append(channel["channel_id"])
    
    return {
        "renewed": len(renewed),
        "failed": len(failed),
        "failed_channels": failed
    }


@router.delete("/stop/{channel_id}")
async def stop_webhook(channel_id: str, access_token: str = None):
    """
    Stop a webhook channel.
    """
    db = get_db()
    
    # Get channel info
    channel_result = db.table("calendar_webhook_channels").select("*").eq(
        "channel_id", channel_id
    ).execute()
    
    if not channel_result.data:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    channel = channel_result.data[0]
    
    # Stop the watch with Google (if we have token)
    if access_token:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://www.googleapis.com/calendar/v3/channels/stop",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "id": channel_id,
                    "resourceId": channel["resource_id"]
                }
            )
    
    # Delete from our database
    db.table("calendar_webhook_channels").delete().eq("channel_id", channel_id).execute()
    
    return {"success": True, "channel_id": channel_id}
