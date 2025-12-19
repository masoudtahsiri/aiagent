"""
Messaging API Endpoints

Provides endpoints for:
- Sending SMS messages
- Sending WhatsApp messages
- Sending emails
- Sending appointment confirmations
- Managing message templates
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/messaging", tags=["Messaging"])


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SendSMSRequest(BaseModel):
    business_id: str
    to_phone: Optional[str] = None
    message: str
    customer_id: Optional[str] = None
    include_appointment: bool = False


class SendWhatsAppRequest(BaseModel):
    business_id: str
    to_phone: Optional[str] = None
    message: str
    customer_id: Optional[str] = None
    include_appointment: bool = False


class SendEmailRequest(BaseModel):
    business_id: str
    to_email: Optional[str] = None
    subject: str
    message: str
    customer_id: Optional[str] = None
    include_appointment: bool = False


class SendConfirmationRequest(BaseModel):
    business_id: str
    customer_id: str
    method: str = Field(default="sms", description="sms, whatsapp, email, or all")


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def get_db():
    """Get Supabase database client"""
    from backend.database.supabase_client import get_db as get_supabase_db
    return get_supabase_db()


# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGE SENDING HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

async def log_message(
    db,
    business_id: str,
    customer_id: Optional[str],
    channel: str,
    to_address: str,
    body: str,
    subject: Optional[str] = None,
    status: str = "sent",
    provider_message_id: Optional[str] = None,
    error_message: Optional[str] = None,
    appointment_id: Optional[str] = None
):
    """Log a sent message to the database."""
    try:
        db.table("message_log").insert({
            "business_id": business_id,
            "customer_id": customer_id,
            "channel": channel,
            "direction": "outbound",
            "to_address": to_address,
            "subject": subject,
            "body": body,
            "status": status,
            "provider_message_id": provider_message_id,
            "error_message": error_message,
            "appointment_id": appointment_id,
            "sent_at": datetime.utcnow().isoformat() if status == "sent" else None
        }).execute()
    except Exception as e:
        print(f"Failed to log message: {e}")


async def get_customer_info(db, customer_id: str):
    """Get customer info for messaging."""
    result = db.table("customers").select("*").eq("id", customer_id).execute()
    return result.data[0] if result.data else None


async def get_next_appointment(db, customer_id: str, business_id: str):
    """Get customer's next scheduled appointment."""
    result = db.table("appointments").select(
        "*, services(name), staff(name)"
    ).eq("customer_id", customer_id).eq(
        "business_id", business_id
    ).eq("status", "scheduled").order(
        "appointment_date"
    ).limit(1).execute()
    return result.data[0] if result.data else None


async def get_business_info(db, business_id: str):
    """Get business info for messaging."""
    result = db.table("businesses").select("*").eq("id", business_id).execute()
    return result.data[0] if result.data else None


def format_appointment_details(appointment: dict, business: dict) -> str:
    """Format appointment details for inclusion in message."""
    if not appointment:
        return ""
    
    date = appointment.get("appointment_date", "")
    time = appointment.get("appointment_time", "")
    service = appointment.get("services", {}).get("name", "") if appointment.get("services") else ""
    staff = appointment.get("staff", {}).get("name", "") if appointment.get("staff") else ""
    address = business.get("address", "") if business else ""
    
    details = f"\n\n📅 Appointment Details:\nDate: {date}\nTime: {time}"
    if service:
        details += f"\nService: {service}"
    if staff:
        details += f"\nWith: {staff}"
    if address:
        details += f"\nLocation: {address}"
    
    return details


# ═══════════════════════════════════════════════════════════════════════════════
# SEND SMS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/send-sms")
async def send_sms(request: SendSMSRequest):
    """
    Send an SMS message to a customer.
    
    If customer_id is provided but no to_phone, uses customer's phone.
    If include_appointment is True, appends appointment details.
    """
    db = get_db()
    
    # Get customer info if needed
    to_phone = request.to_phone
    if not to_phone and request.customer_id:
        customer = await get_customer_info(db, request.customer_id)
        if customer:
            to_phone = customer.get("phone")
    
    if not to_phone:
        raise HTTPException(status_code=400, detail="No phone number provided")
    
    # Build message
    message = request.message
    
    if request.include_appointment and request.customer_id:
        business = await get_business_info(db, request.business_id)
        appointment = await get_next_appointment(db, request.customer_id, request.business_id)
        if appointment:
            message += format_appointment_details(appointment, business)
    
    # Send SMS (placeholder - integrate with actual SMS provider)
    # In production, this would call Twilio, Bulutfon, etc.
    try:
        # TODO: Integrate with SMS provider
        # Example with Twilio:
        # client = twilio.Client(account_sid, auth_token)
        # sms = client.messages.create(body=message, from_=from_number, to=to_phone)
        # provider_message_id = sms.sid
        
        provider_message_id = f"sms_{datetime.utcnow().timestamp()}"
        
        # Log the message
        await log_message(
            db=db,
            business_id=request.business_id,
            customer_id=request.customer_id,
            channel="sms",
            to_address=to_phone,
            body=message,
            status="sent",
            provider_message_id=provider_message_id
        )
        
        return {
            "success": True,
            "message_id": provider_message_id,
            "channel": "sms",
            "to": to_phone
        }
        
    except Exception as e:
        await log_message(
            db=db,
            business_id=request.business_id,
            customer_id=request.customer_id,
            channel="sms",
            to_address=to_phone,
            body=message,
            status="failed",
            error_message=str(e)
        )
        
        return {
            "success": False,
            "error": str(e)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SEND WHATSAPP
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/send-whatsapp")
async def send_whatsapp(request: SendWhatsAppRequest):
    """
    Send a WhatsApp message to a customer.
    """
    db = get_db()
    
    # Get customer info if needed
    to_phone = request.to_phone
    if not to_phone and request.customer_id:
        customer = await get_customer_info(db, request.customer_id)
        if customer:
            to_phone = customer.get("phone")
    
    if not to_phone:
        raise HTTPException(status_code=400, detail="No phone number provided")
    
    # Build message
    message = request.message
    
    if request.include_appointment and request.customer_id:
        business = await get_business_info(db, request.business_id)
        appointment = await get_next_appointment(db, request.customer_id, request.business_id)
        if appointment:
            message += format_appointment_details(appointment, business)
    
    # Send WhatsApp (placeholder)
    try:
        # TODO: Integrate with WhatsApp provider (Twilio, 360dialog, etc.)
        
        provider_message_id = f"wa_{datetime.utcnow().timestamp()}"
        
        await log_message(
            db=db,
            business_id=request.business_id,
            customer_id=request.customer_id,
            channel="whatsapp",
            to_address=to_phone,
            body=message,
            status="sent",
            provider_message_id=provider_message_id
        )
        
        return {
            "success": True,
            "message_id": provider_message_id,
            "channel": "whatsapp",
            "to": to_phone
        }
        
    except Exception as e:
        await log_message(
            db=db,
            business_id=request.business_id,
            customer_id=request.customer_id,
            channel="whatsapp",
            to_address=to_phone,
            body=message,
            status="failed",
            error_message=str(e)
        )
        
        return {
            "success": False,
            "error": str(e)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SEND EMAIL
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/send-email")
async def send_email(request: SendEmailRequest):
    """
    Send an email to a customer.
    """
    db = get_db()
    
    # Get customer info if needed
    to_email = request.to_email
    if not to_email and request.customer_id:
        customer = await get_customer_info(db, request.customer_id)
        if customer:
            to_email = customer.get("email")
    
    if not to_email:
        raise HTTPException(status_code=400, detail="No email address provided")
    
    # Build message
    message = request.message
    
    if request.include_appointment and request.customer_id:
        business = await get_business_info(db, request.business_id)
        appointment = await get_next_appointment(db, request.customer_id, request.business_id)
        if appointment:
            message += format_appointment_details(appointment, business)
    
    # Send Email (placeholder)
    try:
        # TODO: Integrate with email provider (SendGrid, AWS SES, etc.)
        
        provider_message_id = f"email_{datetime.utcnow().timestamp()}"
        
        await log_message(
            db=db,
            business_id=request.business_id,
            customer_id=request.customer_id,
            channel="email",
            to_address=to_email,
            subject=request.subject,
            body=message,
            status="sent",
            provider_message_id=provider_message_id
        )
        
        return {
            "success": True,
            "message_id": provider_message_id,
            "channel": "email",
            "to": to_email
        }
        
    except Exception as e:
        await log_message(
            db=db,
            business_id=request.business_id,
            customer_id=request.customer_id,
            channel="email",
            to_address=to_email,
            subject=request.subject,
            body=message,
            status="failed",
            error_message=str(e)
        )
        
        return {
            "success": False,
            "error": str(e)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SEND APPOINTMENT CONFIRMATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/send-appointment-confirmation")
async def send_appointment_confirmation(request: SendConfirmationRequest):
    """
    Send appointment confirmation with all details.
    Can send via SMS, WhatsApp, Email, or all channels.
    """
    db = get_db()
    
    # Get customer
    customer = await get_customer_info(db, request.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get appointment
    appointment = await get_next_appointment(db, request.customer_id, request.business_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="No upcoming appointments found")
    
    # Get business
    business = await get_business_info(db, request.business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Build confirmation message
    first_name = customer.get("first_name", "")
    business_name = business.get("business_name", "")
    date = appointment.get("appointment_date", "")
    time = appointment.get("appointment_time", "")
    service = appointment.get("services", {}).get("name", "") if appointment.get("services") else "your appointment"
    staff = appointment.get("staff", {}).get("name", "") if appointment.get("staff") else ""
    address = business.get("address", "")
    
    staff_str = f" with {staff}" if staff else ""
    
    # Different message formats per channel
    sms_message = f"Hi {first_name}! Your {service}{staff_str} at {business_name} is confirmed for {date} at {time}. "
    if address:
        sms_message += f"Address: {address}. "
    sms_message += "See you then!"
    
    email_subject = f"Appointment Confirmation - {business_name}"
    email_message = f"""Dear {first_name},

Your appointment has been confirmed!

📅 Date: {date}
⏰ Time: {time}
✂️ Service: {service}
👤 With: {staff if staff else 'Our team'}
📍 Location: {address}

If you need to reschedule or cancel, please call us or reply to this email.

Thank you for choosing {business_name}!

Best regards,
The {business_name} Team"""

    results = {}
    
    # Send based on method
    if request.method in ["sms", "all"]:
        if customer.get("phone"):
            sms_result = await send_sms(SendSMSRequest(
                business_id=request.business_id,
                to_phone=customer["phone"],
                message=sms_message,
                customer_id=request.customer_id,
                include_appointment=False
            ))
            results["sms"] = sms_result
    
    if request.method in ["whatsapp", "all"]:
        if customer.get("phone"):
            wa_result = await send_whatsapp(SendWhatsAppRequest(
                business_id=request.business_id,
                to_phone=customer["phone"],
                message=sms_message,
                customer_id=request.customer_id,
                include_appointment=False
            ))
            results["whatsapp"] = wa_result
    
    if request.method in ["email", "all"]:
        if customer.get("email"):
            email_result = await send_email(SendEmailRequest(
                business_id=request.business_id,
                to_email=customer["email"],
                subject=email_subject,
                message=email_message,
                customer_id=request.customer_id,
                include_appointment=False
            ))
            results["email"] = email_result
    
    # Determine overall success
    any_success = any(r.get("success", False) for r in results.values())
    
    return {
        "success": any_success,
        "results": results,
        "appointment_id": appointment.get("id")
    }


# ═══════════════════════════════════════════════════════════════════════════════
# GET MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/templates")
async def get_message_templates(
    business_id: Optional[str] = Query(None),
    template_type: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    language_code: str = Query(default="en")
):
    """Get message templates for a business."""
    db = get_db()
    
    # Start with default templates (business_id is NULL)
    query = db.table("message_templates").select("*").eq("is_active", True)
    
    if template_type:
        query = query.eq("template_type", template_type)
    if channel:
        query = query.eq("channel", channel)
    
    # Get business-specific and default templates
    if business_id:
        query = query.or_(f"business_id.eq.{business_id},business_id.is.null")
    else:
        query = query.is_("business_id", "null")
    
    result = query.execute()
    
    # Filter by language, with fallback to English
    templates = result.data or []
    
    # Prefer language-specific, fallback to 'en'
    filtered = []
    for t in templates:
        if t.get("language_code") == language_code:
            filtered.append(t)
    
    # If no templates in requested language, use English
    if not filtered:
        filtered = [t for t in templates if t.get("language_code") == "en"]
    
    return filtered


# ═══════════════════════════════════════════════════════════════════════════════
# GET MESSAGE HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/history/{customer_id}")
async def get_message_history(
    customer_id: str,
    business_id: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    limit: int = Query(default=50, le=100)
):
    """Get message history for a customer."""
    db = get_db()
    
    query = db.table("message_log").select("*").eq("customer_id", customer_id)
    
    if business_id:
        query = query.eq("business_id", business_id)
    if channel:
        query = query.eq("channel", channel)
    
    result = query.order("created_at", desc=True).limit(limit).execute()
    
    return result.data or []

