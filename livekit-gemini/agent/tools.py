"""
Universal AI Agent - Complete Tool Suite

This module provides all the tools the AI agent needs to handle any task:
- Scheduling (7 tools)
- Customer Management (6 tools)
- Communication (5 tools)
- Information (4 tools)
- System (3 tools)

Total: 25 tools (22 implemented here, excluding 3 payment tools)

Includes latency tracking for all tool executions.
"""

import logging
import time
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from functools import wraps

from livekit.agents import function_tool, RunContext, get_job_context

if TYPE_CHECKING:
    from backend_client import BackendClient

logger = logging.getLogger("ai-agent-tools")


# ═══════════════════════════════════════════════════════════════════════════════
# TOOL EXECUTION TIMING
# ═══════════════════════════════════════════════════════════════════════════════

def timed_tool(tool_name: str):
    """
    Decorator to time tool execution.
    Logs the duration of each tool call.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                duration = (time.perf_counter() - start_time) * 1000
                logger.info(f"🔧 TOOL [{duration:6.1f}ms] {tool_name} ✅")
                return result
            except Exception as e:
                duration = (time.perf_counter() - start_time) * 1000
                logger.error(f"🔧 TOOL [{duration:6.1f}ms] {tool_name} ❌ Error: {e}")
                raise
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION DATA ACCESS
# ═══════════════════════════════════════════════════════════════════════════════

# These will be set by the agent at runtime
_session_data = None
_backend_client = None


def set_tool_context(session_data, backend_client: "BackendClient"):
    """Set the session data and backend client for tools to use"""
    global _session_data, _backend_client
    _session_data = session_data
    _backend_client = backend_client


def get_session():
    """Get current session data"""
    return _session_data


def get_backend():
    """Get backend client"""
    return _backend_client


def unwrap_value(value, default=None):
    """
    Unwrap nested lists from AI input.
    
    The AI sometimes passes parameters as lists or nested lists:
    - "value" -> "value"
    - ["value"] -> "value"
    - [["value"]] -> "value"
    - [] -> default
    - None -> default
    """
    while isinstance(value, list):
        if not value:
            return default
        value = value[0]
    return value if value is not None else default


# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def format_date_speech(date_str: str) -> str:
    """Format date for natural speech"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        today = date.today()
        diff = (dt.date() - today).days
        
        if diff == 0:
            return "today"
        elif diff == 1:
            return "tomorrow"
        elif diff == -1:
            return "yesterday"
        elif 0 < diff <= 7:
            return dt.strftime("%A")  # Just day name for next week
        else:
            return dt.strftime("%B %d")  # Month and day
    except:
        return date_str


def format_time_speech(time_str: str) -> str:
    """Format time for natural speech"""
    try:
        if len(time_str) == 5:  # HH:MM
            dt = datetime.strptime(time_str, "%H:%M")
        else:
            dt = datetime.strptime(time_str, "%H:%M:%S")
        
        hour = dt.hour
        minute = dt.minute
        
        # Convert to 12-hour format with AM/PM
        if hour == 0:
            hour_12 = 12
            period = "AM"
        elif hour < 12:
            hour_12 = hour
            period = "AM"
        elif hour == 12:
            hour_12 = 12
            period = "PM"
        else:
            hour_12 = hour - 12
            period = "PM"
        
        if minute == 0:
            return f"{hour_12} {period}"
        elif minute == 30:
            return f"{hour_12}:30 {period}"
        else:
            return f"{hour_12}:{minute:02d} {period}"
    except:
        return time_str


def require_customer(func):
    """Decorator that requires customer to be identified"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        session = get_session()
        if not session or not session.customer:
            return {
                "success": False,
                "message": "I need to look you up first. Could you tell me your name?",
                "next_action": "identify_customer"
            }
        return await func(*args, **kwargs)
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════
# 📅 SCHEDULING TOOLS (7)
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool()
async def check_availability(
    context: RunContext,
    date: str,
    service_name: Optional[str] = None,
    staff_name: Optional[str] = None,
) -> dict:
    """
    Check available appointment slots for a specific date.
    
    Args:
        date: The date to check (YYYY-MM-DD format). Use 'today' or 'tomorrow' for convenience.
        service_name: Optional service name to filter by duration requirements.
        staff_name: Optional staff member name to filter by.
    
    Returns:
        success: Whether the check succeeded
        available_slots: List of available time slots
        message: Natural language summary to tell caller
    """
    tool_start = time.perf_counter()
    logger.info("🔧 TOOL START: check_availability")
    
    session = get_session()
    backend = get_backend()
    
    # Normalize inputs - AI sometimes passes nested lists
    date = unwrap_value(date, "")
    service_name = unwrap_value(service_name)
    staff_name = unwrap_value(staff_name)
    
    # Handle relative dates
    if date and date.lower() == "today":
        date = datetime.now().strftime("%Y-%m-%d")
    elif date and date.lower() == "tomorrow":
        date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Look up staff_id from staff_name if provided, otherwise use default
    staff_id = None
    if staff_name:
        staff_list = session.business_config.get("staff", [])
        for staff in staff_list:
            if staff.get("name", "").lower() == staff_name.lower():
                staff_id = staff.get("id")
                break
        if not staff_id:
            return {
                "success": False,
                "message": f"I couldn't find a staff member named {staff_name}. Let me check availability for all staff.",
                "available_slots": []
            }
    else:
        # Use default staff if available, or first staff member
        staff_id = session.default_staff_id
        if not staff_id:
            staff_list = session.business_config.get("staff", [])
            if staff_list:
                staff_id = staff_list[0].get("id")
        if not staff_id:
            return {
                "success": False,
                "message": "I need to know which staff member you'd like to see. Who would you like to book with?",
                "available_slots": []
            }
    
    try:
        result = await backend.check_availability(
            business_id=session.business_id,
            date=date,
            service_name=service_name,
            staff_name=staff_name,
            staff_id=staff_id
        )
        
        if not result:
            return {
                "success": False,
                "message": "I'm having trouble checking availability right now. Let me try again.",
                "available_slots": []
            }
        
        slots = result.get("available_slots", [])
        
        if not slots:
            date_formatted = format_date_speech(date)
            return {
                "success": True,
                "message": f"I don't see any openings on {date_formatted}. Would you like me to check another day or add you to our waitlist?",
                "available_slots": [],
                "date": date
            }
        
        # Store for session
        session.available_slots = slots
        
        # Format for speech
        date_formatted = format_date_speech(date)
        time_list = [format_time_speech(s["time"]) for s in slots[:5]]
        
        if len(slots) == 1:
            message = f"I have one opening on {date_formatted} at {time_list[0]}."
        elif len(slots) <= 5:
            times = ", ".join(time_list[:-1]) + f", and {time_list[-1]}"
            message = f"For {date_formatted}, I have openings at {times}."
        else:
            times = ", ".join(time_list)
            message = f"I have several openings on {date_formatted}. The earliest are at {times}. Would any of these work?"
        
        tool_duration = (time.perf_counter() - tool_start) * 1000
        logger.info(f"🔧 TOOL COMPLETE [{tool_duration:6.1f}ms]: check_availability ✅")
        return {
            "success": True,
            "message": message,
            "available_slots": slots,
            "date": date
        }
        
    except Exception as e:
        tool_duration = (time.perf_counter() - tool_start) * 1000
        logger.error(f"🔧 TOOL COMPLETE [{tool_duration:6.1f}ms]: check_availability ❌ Error: {e}")
        return {
            "success": False,
            "message": "I'm having trouble accessing the schedule. Let me try that again.",
            "available_slots": []
        }


@function_tool()
async def book_appointment(
    context: RunContext,
    date: str,
    time_slot: str,
    service_name: str,
    staff_name: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Book a new appointment for the customer.
    
    Args:
        date: Appointment date (YYYY-MM-DD)
        time_slot: Appointment time (HH:MM)
        service_name: Name of the service to book
        staff_name: Optional staff member preference
        notes: Optional notes for the appointment
    
    Returns:
        success: Whether booking succeeded
        message: Confirmation message to tell caller
        appointment: Created appointment details
    """
    tool_start = time.perf_counter()
    logger.info(f"🔧 TOOL START: book_appointment (date={date}, time={time_slot})")
    
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need to get your information first. What's your name?",
            "next_action": "collect_customer_info"
        }
    
    # Normalize inputs - AI sometimes passes nested lists
    date = unwrap_value(date, "")
    time_slot = unwrap_value(time_slot, "")
    service_name = unwrap_value(service_name, "")
    staff_name = unwrap_value(staff_name)
    notes = unwrap_value(notes)
    
    # Handle relative dates
    if date and date.lower() == "today":
        date = datetime.now().strftime("%Y-%m-%d")
    elif date and date.lower() == "tomorrow":
        date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Look up staff_id from staff_name
    staff_id = None
    if staff_name:
        staff_list = session.business_config.get("staff", [])
        for staff in staff_list:
            if staff.get("name", "").lower() == staff_name.lower():
                staff_id = staff.get("id")
                break
        if not staff_id:
            return {
                "success": False,
                "message": f"I couldn't find {staff_name}. Who would you like to book with?",
            }
    else:
        # Use default staff if available
        staff_id = session.default_staff_id
        if not staff_id:
            staff_list = session.business_config.get("staff", [])
            if staff_list:
                staff_id = staff_list[0].get("id")
        if not staff_id:
            return {
                "success": False,
                "message": "Which staff member would you like to book with?",
            }
    
    # Look up service_id from service_name
    service_id = None
    duration_minutes = 30
    if service_name:
        services = session.business_config.get("services", [])
        for svc in services:
            if svc.get("name", "").lower() == service_name.lower():
                service_id = svc.get("id")
                duration_minutes = svc.get("duration_minutes", 30)
                break
    
    try:
        result = await backend.book_appointment(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            date=date,
            appointment_time=time_slot,
            staff_id=staff_id,
            service_id=service_id,
            duration_minutes=duration_minutes,
            notes=notes
        )
        
        if not result or not result.get("success"):
            error = result.get("error", "") if result else ""
            error = str(unwrap_value(error, ""))  # Ensure error is a string
            if "conflict" in error.lower() or "not available" in error.lower():
                return {
                    "success": False,
                    "message": "That time slot just got taken. Let me check for other options.",
                    "next_action": "check_availability"
                }
            return {
                "success": False,
                "message": "I couldn't complete the booking. Would you like to try a different time?"
            }
        
        appointment = result.get("appointment", {})
        
        # Format confirmation
        date_formatted = format_date_speech(date)
        time_formatted = format_time_speech(time_slot)
        staff = appointment.get("staff_name", staff_name) or ""
        staff_str = f" with {staff}" if staff else ""
        
        # Update call outcome
        session.call_outcome = "appointment_booked"
        
        tool_duration = (time.perf_counter() - tool_start) * 1000
        logger.info(f"🔧 TOOL COMPLETE [{tool_duration:6.1f}ms]: book_appointment ✅")
        
        return {
            "success": True,
            "message": f"Perfect! You're all set for {service_name} on {date_formatted} at {time_formatted}{staff_str}. Would you like me to send you a confirmation?",
            "appointment": appointment
        }
        
    except Exception as e:
        tool_duration = (time.perf_counter() - tool_start) * 1000
        logger.error(f"🔧 TOOL COMPLETE [{tool_duration:6.1f}ms]: book_appointment ❌ Error: {e}")
        return {
            "success": False,
            "message": "I ran into an issue booking that appointment. Let me try again."
        }


@function_tool()
async def cancel_appointment(
    context: RunContext,
    appointment_id: Optional[str] = None,
    appointment_date: Optional[str] = None,
    reason: Optional[str] = None,
) -> dict:
    """
    Cancel an existing appointment.
    IMPORTANT: Always ask the customer for their cancellation reason before calling this function.
    
    Args:
        appointment_id: The appointment ID (if known)
        appointment_date: Date of appointment to cancel (if ID not known)
        reason: The reason for cancellation - ALWAYS ask the customer why they are cancelling
    
    Returns:
        success: Whether cancellation succeeded
        message: Confirmation message to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    # Normalize inputs (AI may pass lists)
    reason = unwrap_value(reason)
    appointment_id = unwrap_value(appointment_id)
    appointment_date = unwrap_value(appointment_date)
    
    if not session.customer:
        return {
            "success": False,
            "message": "Let me look up your account first. What's your name?",
            "next_action": "identify_customer"
        }
    
    # Ask for reason if not provided
    if not reason:
        return {
            "success": False,
            "message": "I understand you'd like to cancel. May I ask the reason for the cancellation?",
            "awaiting": "cancellation_reason"
        }
    
    try:
        # If no appointment_id, try to find by date
        if not appointment_id and appointment_date:
            appointments = await backend.get_customer_appointments(
                customer_id=session.customer["id"],
                business_id=session.business_id,
                status="scheduled"
            )
            
            for apt in (appointments or []):
                if apt.get("appointment_date") == appointment_date:
                    appointment_id = apt["id"]
                    break
        
        if not appointment_id:
            return {
                "success": False,
                "message": "I couldn't find that appointment. Could you tell me the date of the appointment you want to cancel?"
            }
        
        result = await backend.cancel_appointment(
            appointment_id=appointment_id,
            reason=reason
        )
        
        if result and result.get("success"):
            session.call_outcome = "appointment_cancelled"
            return {
                "success": True,
                "message": "I've cancelled that appointment for you. Would you like to reschedule for another time?"
            }
        
        return {
            "success": False,
            "message": "I had trouble cancelling that appointment. Let me try again."
        }
        
    except Exception as e:
        logger.error(f"cancel_appointment error: {e}")
        return {
            "success": False,
            "message": "I'm having trouble with the cancellation. Could you hold on while I try again?"
        }


@function_tool()
async def reschedule_appointment(
    context: RunContext,
    new_date: str,
    new_time: str,
    appointment_id: Optional[str] = None,
    current_date: Optional[str] = None,
) -> dict:
    """
    Reschedule an existing appointment to a new date/time.
    
    Args:
        new_date: New date for the appointment (YYYY-MM-DD)
        new_time: New time for the appointment (HH:MM)
        appointment_id: The appointment ID (if known)
        current_date: Current date of appointment (if ID not known)
    
    Returns:
        success: Whether rescheduling succeeded
        message: Confirmation message to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "Let me find your account first. What's your name?",
            "next_action": "identify_customer"
        }
    
    # Normalize inputs - AI sometimes passes nested lists
    new_date = unwrap_value(new_date, "")
    new_time = unwrap_value(new_time, "")
    appointment_id = unwrap_value(appointment_id)
    current_date = unwrap_value(current_date)
    
    # Handle relative dates
    if new_date and new_date.lower() == "today":
        new_date = datetime.now().strftime("%Y-%m-%d")
    elif new_date and new_date.lower() == "tomorrow":
        new_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    try:
        # Find appointment if ID not provided
        if not appointment_id and current_date:
            appointments = await backend.get_customer_appointments(
                customer_id=session.customer["id"],
                business_id=session.business_id,
                status="scheduled"
            )
            
            for apt in (appointments or []):
                if apt.get("appointment_date") == current_date:
                    appointment_id = apt["id"]
                    break
        
        # If still no ID, get the next upcoming appointment
        if not appointment_id:
            appointments = await backend.get_customer_appointments(
                customer_id=session.customer["id"],
                business_id=session.business_id,
                status="scheduled"
            )
            
            if appointments:
                appointment_id = appointments[0]["id"]
        
        if not appointment_id:
            return {
                "success": False,
                "message": "I couldn't find an appointment to reschedule. Do you have an existing booking with us?"
            }
        
        result = await backend.reschedule_appointment(
            appointment_id=appointment_id,
            new_date=new_date,
            new_time=new_time
        )
        
        if result and result.get("success"):
            date_formatted = format_date_speech(new_date)
            time_formatted = format_time_speech(new_time)
            
            session.call_outcome = "appointment_rescheduled"
            
            return {
                "success": True,
                "message": f"Done! I've moved your appointment to {date_formatted} at {time_formatted}. Would you like a confirmation sent to you?"
            }
        
        error = result.get("error", "") if result else ""
        error = str(unwrap_value(error, ""))  # Ensure error is a string
        if "not available" in error.lower():
            return {
                "success": False,
                "message": "That time isn't available. Would you like me to check for other options?"
            }
        
        return {
            "success": False,
            "message": "I couldn't reschedule to that time. Let me check what else is available."
        }
        
    except Exception as e:
        logger.error(f"reschedule_appointment error: {e}")
        return {
            "success": False,
            "message": "I ran into an issue rescheduling. Let me try again."
        }


@function_tool()
async def get_my_appointments(context: RunContext) -> dict:
    """
    Get the customer's upcoming appointments.
    
    Returns:
        success: Whether lookup succeeded
        message: Natural summary of appointments
        appointments: List of appointment details
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "Let me look you up. What's your name?",
            "next_action": "identify_customer"
        }
    
    try:
        appointments = await backend.get_customer_appointments(
            customer_id=session.customer["id"],
            business_id=session.business_id,
            status="scheduled"
        )
        
        if not appointments:
            return {
                "success": True,
                "message": "You don't have any upcoming appointments. Would you like to book one?",
                "appointments": []
            }
        
        # Format for speech
        if len(appointments) == 1:
            apt = appointments[0]
            date_formatted = format_date_speech(apt.get("appointment_date", ""))
            time_formatted = format_time_speech(apt.get("appointment_time", ""))
            service = apt.get("service_name", "appointment")
            staff = apt.get("staff_name", "")
            staff_str = f" with {staff}" if staff else ""
            
            message = f"You have a {service}{staff_str} on {date_formatted} at {time_formatted}."
        else:
            message = f"You have {len(appointments)} upcoming appointments. "
            details = []
            for apt in appointments[:3]:
                date_formatted = format_date_speech(apt.get("appointment_date", ""))
                time_formatted = format_time_speech(apt.get("appointment_time", ""))
                details.append(f"{date_formatted} at {time_formatted}")
            
            message += "They're on " + ", and ".join(details) + "."
        
        return {
            "success": True,
            "message": message,
            "appointments": appointments
        }
        
    except Exception as e:
        logger.error(f"get_my_appointments error: {e}")
        return {
            "success": False,
            "message": "I'm having trouble pulling up your appointments. Let me try again."
        }


@function_tool()
async def add_to_waitlist(
    context: RunContext,
    preferred_date: Optional[str] = None,
    preferred_time_of_day: Optional[str] = None,
    preferred_staff: Optional[str] = None,
    service_name: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Add the customer to the waitlist for cancellation openings.
    Use when no suitable appointments are available.
    
    Args:
        preferred_date: Specific date they want (YYYY-MM-DD) or None for any
        preferred_time_of_day: 'morning', 'afternoon', 'evening', or None for any
        preferred_staff: Staff name preference (optional)
        service_name: Service they want (optional)
        notes: Any special notes
    
    Returns:
        success: Whether added to waitlist
        message: Confirmation to tell caller
        position: Their position on the waitlist
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need to get your information first before adding you to our waitlist.",
            "next_action": "collect_customer_info"
        }
    
    try:
        result = await backend.add_to_waitlist(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            preferred_date=preferred_date,
            preferred_time_of_day=preferred_time_of_day,
            preferred_staff=preferred_staff,
            service_name=service_name,
            notes=notes
        )
        
        if result and result.get("success"):
            position = result.get("position", "")
            position_str = f" You're number {position} in line." if position else ""
            
            return {
                "success": True,
                "message": f"I've added you to our waitlist.{position_str} We'll call you right away if something opens up!",
                "position": position
            }
        
        return {
            "success": False,
            "message": "I had trouble adding you to the waitlist. Would you like me to try again?"
        }
        
    except Exception as e:
        logger.error(f"add_to_waitlist error: {e}")
        return {
            "success": False,
            "message": "I couldn't add you to the waitlist right now. Let me try again."
        }


@function_tool()
async def check_waitlist_status(context: RunContext) -> dict:
    """
    Check the customer's position on the waitlist.
    
    Returns:
        success: Whether check succeeded
        message: Status message to tell caller
        on_waitlist: Whether they're on the waitlist
        position: Their position (if on waitlist)
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "Let me look you up first. What's your name?",
            "next_action": "identify_customer"
        }
    
    try:
        result = await backend.check_waitlist(
            customer_id=session.customer["id"],
            business_id=session.business_id
        )
        
        if not result or not result.get("on_waitlist"):
            return {
                "success": True,
                "message": "You're not currently on our waitlist. Would you like me to add you?",
                "on_waitlist": False
            }
        
        position = result.get("position", "")
        return {
            "success": True,
            "message": f"You're number {position} on our waitlist. We'll call you as soon as something opens up!",
            "on_waitlist": True,
            "position": position
        }
        
    except Exception as e:
        logger.error(f"check_waitlist_status error: {e}")
        return {
            "success": False,
            "message": "I'm having trouble checking the waitlist. Let me try again."
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 👤 CUSTOMER MANAGEMENT TOOLS (6)
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool()
async def create_new_customer(
    context: RunContext,
    first_name: str,
    last_name: str,
    date_of_birth: Optional[str] = None,
    city: Optional[str] = None,
    address: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Register a new customer in the system. Collect all required information from the caller.
    
    Args:
        first_name: Customer's first name (required)
        last_name: Customer's last name (required)
        date_of_birth: Date of birth in YYYY-MM-DD format (required - ask the caller)
        city: City where the customer lives (required - ask the caller)
        address: Full street address (required - ask the caller)
        phone: Phone number (optional - will use caller's number if not provided)
        email: Email address (optional)
        notes: Any notes about the customer (optional)
    
    Returns:
        success: Whether creation succeeded
        message: Confirmation message
        customer: Created customer record
    """
    session = get_session()
    backend = get_backend()
    
    # Use caller's phone if not provided
    if not phone:
        phone = session.caller_phone
    
    try:
        result = await backend.create_customer(
            business_id=session.business_id,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            city=city,
            address=address,
            phone=phone,
            email=email,
            notes=notes,
            language=session.language_code
        )
        
        if result and result.get("success"):
            customer = result.get("customer", {})
            session.customer = customer
            
            return {
                "success": True,
                "message": f"Great, I've got you set up in our system, {first_name}. How can I help you today?",
                "customer": customer
            }
        
        error = result.get("error", "") if result else ""
        error = str(unwrap_value(error, ""))  # Ensure error is a string
        if "duplicate" in error.lower() or "exists" in error.lower():
            return {
                "success": False,
                "message": "It looks like you might already be in our system. Let me look you up.",
                "next_action": "lookup_customer"
            }
        
        return {
            "success": False,
            "message": "I had trouble saving your information. Could you tell me your name again?"
        }
        
    except Exception as e:
        logger.error(f"create_new_customer error: {e}")
        return {
            "success": False,
            "message": "I ran into an issue. Let me try that again."
        }


@function_tool()
async def update_customer_info(
    context: RunContext,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    date_of_birth: Optional[str] = None,
    city: Optional[str] = None,
    address: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    preferred_contact_method: Optional[str] = None,
    accommodations: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Update the customer's personal information, contact details, or preferences.
    
    Args:
        first_name: Customer's first name
        last_name: Customer's last name
        date_of_birth: Date of birth in YYYY-MM-DD format
        city: City where the customer lives
        address: Full street address
        phone: New phone number
        email: New email address
        preferred_contact_method: How they prefer to be contacted (phone, sms, email, whatsapp)
        accommodations: Special needs or accommodations
        notes: Additional notes to add
    
    Returns:
        success: Whether update succeeded
        message: Confirmation message
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "Let me find your account first. What's your name?",
            "next_action": "identify_customer"
        }
    
    try:
        update_data = {}
        if first_name:
            update_data["first_name"] = first_name
        if last_name:
            update_data["last_name"] = last_name
        if date_of_birth:
            update_data["date_of_birth"] = date_of_birth
        if city:
            update_data["city"] = city
        if address:
            update_data["address"] = address
        if phone:
            update_data["phone"] = phone
        if email:
            update_data["email"] = email
        if preferred_contact_method:
            update_data["preferred_contact_method"] = preferred_contact_method
        if accommodations:
            update_data["accommodations"] = accommodations
        if notes:
            # Append to existing notes
            existing_notes = session.customer.get("notes", "") or ""
            update_data["notes"] = f"{existing_notes}\n{notes}".strip()
        
        if not update_data:
            return {
                "success": False,
                "message": "What information would you like to update?"
            }
        
        result = await backend.update_customer(
            customer_id=session.customer["id"],
            **update_data
        )
        
        if result and result.get("success"):
            # Update session data
            for key, value in update_data.items():
                session.customer[key] = value
            
            return {
                "success": True,
                "message": "I've updated your information."
            }
        
        return {
            "success": False,
            "message": "I had trouble updating that. Let me try again."
        }
        
    except Exception as e:
        logger.error(f"update_customer_info error: {e}")
        return {
            "success": False,
            "message": "I ran into an issue updating your information."
        }


@function_tool()
async def add_customer_note(
    context: RunContext,
    note: str,
    importance: int = 5,
) -> dict:
    """
    Add a note or memory about the customer.
    Use to record important information that should be remembered for future calls.
    
    Args:
        note: The note content (what to remember)
        importance: How important (1-10, higher = more important)
    
    Returns:
        success: Whether note was saved
        message: Confirmation
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need to identify you first.",
            "next_action": "identify_customer"
        }
    
    try:
        result = await backend.save_memory(
            customer_id=session.customer["id"],
            business_id=session.business_id,
            memory_type="note",
            content=note,
            importance=min(max(importance, 1), 10),
            source_type="call",
            source_id=session.call_log_id
        )
        
        if result:
            return {
                "success": True,
                "message": "I've made a note of that."
            }
        
        return {
            "success": False,
            "message": "I had trouble saving that note, but I'll remember for our conversation."
        }
        
    except Exception as e:
        logger.error(f"add_customer_note error: {e}")
        return {
            "success": False,
            "message": "I couldn't save that note, but I've got it for this call."
        }


@function_tool()
async def add_family_member(
    context: RunContext,
    name: str,
    relationship: str,
    phone: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Link a family member or relationship to the customer's account.
    
    Args:
        name: Name of the related person
        relationship: Type of relationship (spouse, child, parent, sibling, friend, etc.)
        phone: Their phone number (optional)
        notes: Any notes about this person (optional)
    
    Returns:
        success: Whether relationship was saved
        message: Confirmation
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need to identify you first.",
            "next_action": "identify_customer"
        }
    
    # Normalize inputs - AI sometimes passes nested lists
    name = unwrap_value(name, "")
    relationship = unwrap_value(relationship, "")
    phone = unwrap_value(phone)
    notes = unwrap_value(notes)
    
    try:
        result = await backend.add_relationship(
            customer_id=session.customer["id"],
            business_id=session.business_id,
            related_name=name,
            relationship_type=relationship.lower() if relationship else "",
            phone=phone,
            notes=notes
        )
        
        if result and result.get("success"):
            return {
                "success": True,
                "message": f"I've added {name} as your {relationship}."
            }
        
        return {
            "success": False,
            "message": "I had trouble adding that relationship."
        }
        
    except Exception as e:
        logger.error(f"add_family_member error: {e}")
        return {
            "success": False,
            "message": "I couldn't save that information right now."
        }


@function_tool()
async def get_customer_history(context: RunContext) -> dict:
    """
    Get the customer's full history with the business.
    Includes past appointments, notes, and interactions.
    
    Returns:
        success: Whether lookup succeeded
        message: Summary to tell caller
        history: Full history details
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "Let me look you up first. What's your name?",
            "next_action": "identify_customer"
        }
    
    try:
        result = await backend.get_customer_history(
            customer_id=session.customer["id"],
            business_id=session.business_id
        )
        
        if not result:
            return {
                "success": True,
                "message": "I don't see any past visits on record. Is this your first time with us?",
                "history": {}
            }
        
        appointments = result.get("appointments", [])
        completed = [a for a in appointments if a.get("status") == "completed"]
        
        if not completed:
            return {
                "success": True,
                "message": "You haven't had any appointments with us yet.",
                "history": result
            }
        
        # Summarize
        total = len(completed)
        recent = completed[:3]
        
        if total == 1:
            apt = recent[0]
            date_formatted = format_date_speech(apt.get("appointment_date", ""))
            service = apt.get("service_name", "visit")
            message = f"I see you had a {service} with us on {date_formatted}."
        else:
            last_visit = format_date_speech(recent[0].get("appointment_date", ""))
            message = f"You've had {total} visits with us. Your last one was {last_visit}."
        
        return {
            "success": True,
            "message": message,
            "history": result
        }
        
    except Exception as e:
        logger.error(f"get_customer_history error: {e}")
        return {
            "success": False,
            "message": "I'm having trouble pulling up your history."
        }


@function_tool()
async def record_feedback(
    context: RunContext,
    feedback_type: str,
    content: str,
    rating: Optional[int] = None,
) -> dict:
    """
    Record customer feedback, complaint, or suggestion.
    
    Args:
        feedback_type: Type of feedback ('complaint', 'compliment', 'suggestion', 'question', 'general')
        content: The actual feedback content
        rating: Optional satisfaction rating (1-5)
    
    Returns:
        success: Whether feedback was recorded
        message: Acknowledgment to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I'd like to record this properly. Could you tell me your name?",
            "next_action": "identify_customer"
        }
    
    # Normalize inputs - AI sometimes passes nested lists
    feedback_type = unwrap_value(feedback_type, "general")
    content = unwrap_value(content, "")
    
    try:
        result = await backend.record_feedback(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            feedback_type=feedback_type.lower(),
            content=content,
            rating=rating,
            call_log_id=session.call_log_id
        )
        
        # Update call outcome
        if feedback_type.lower() == "complaint":
            session.call_outcome = "complaint_recorded"
        
        if result and result.get("success"):
            if feedback_type.lower() == "complaint":
                return {
                    "success": True,
                    "message": "I'm so sorry to hear that. I've recorded your feedback and our team will follow up with you. Is there anything else I can help with right now?"
                }
            elif feedback_type.lower() == "compliment":
                return {
                    "success": True,
                    "message": "Thank you so much for sharing that! I've passed it along to the team. They'll be thrilled to hear it."
                }
            else:
                return {
                    "success": True,
                    "message": "Thank you for your feedback. I've recorded it for our team to review."
                }
        
        return {
            "success": False,
            "message": "I had trouble recording that, but I've noted it down."
        }
        
    except Exception as e:
        logger.error(f"record_feedback error: {e}")
        return {
            "success": False,
            "message": "I couldn't save that formally, but I've made note of it."
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 💬 COMMUNICATION TOOLS (5)
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool()
async def send_sms(
    context: RunContext,
    message: str,
    include_appointment_details: bool = False,
) -> dict:
    """
    Send an SMS text message to the customer.
    Use for confirmations, reminders, or any text communication.
    
    Args:
        message: The message to send
        include_appointment_details: If True, append upcoming appointment details
    
    Returns:
        success: Whether SMS was sent
        message: Confirmation to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need your phone number to send a text. Are you in our system?",
            "next_action": "identify_customer"
        }
    
    phone = session.customer.get("phone") or session.caller_phone
    
    if not phone:
        return {
            "success": False,
            "message": "I don't have a phone number on file. What number should I send it to?"
        }
    
    try:
        result = await backend.send_message(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            channel="sms",
            to_address=phone,
            content=message,
            include_appointment=include_appointment_details
        )
        
        if result and result.get("success"):
            return {
                "success": True,
                "message": "I've sent you a text message."
            }
        
        return {
            "success": False,
            "message": "I wasn't able to send the text right now. Would you like me to email you instead?"
        }
        
    except Exception as e:
        logger.error(f"send_sms error: {e}")
        return {
            "success": False,
            "message": "I had trouble sending the text. Let me try again."
        }


@function_tool()
async def send_whatsapp(
    context: RunContext,
    message: str,
    include_appointment_details: bool = False,
) -> dict:
    """
    Send a WhatsApp message to the customer.
    
    Args:
        message: The message to send
        include_appointment_details: If True, append upcoming appointment details
    
    Returns:
        success: Whether message was sent
        message: Confirmation to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need your phone number first.",
            "next_action": "identify_customer"
        }
    
    phone = session.customer.get("phone") or session.caller_phone
    
    try:
        result = await backend.send_message(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            channel="whatsapp",
            to_address=phone,
            content=message,
            include_appointment=include_appointment_details
        )
        
        if result and result.get("success"):
            return {
                "success": True,
                "message": "I've sent you a WhatsApp message."
            }
        
        return {
            "success": False,
            "message": "I couldn't send the WhatsApp message. Would you prefer a regular text?"
        }
        
    except Exception as e:
        logger.error(f"send_whatsapp error: {e}")
        return {
            "success": False,
            "message": "I had trouble with WhatsApp. Let me send a text instead."
        }


@function_tool()
async def send_email(
    context: RunContext,
    subject: str,
    message: str,
    include_appointment_details: bool = False,
) -> dict:
    """
    Send an email to the customer.
    
    Args:
        subject: Email subject line
        message: Email body content
        include_appointment_details: If True, append upcoming appointment details
    
    Returns:
        success: Whether email was sent
        message: Confirmation to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need your email address.",
            "next_action": "identify_customer"
        }
    
    email = session.customer.get("email")
    
    if not email:
        return {
            "success": False,
            "message": "I don't have an email address on file. What's your email?"
        }
    
    try:
        result = await backend.send_message(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            channel="email",
            to_address=email,
            content=message,
            subject=subject,
            include_appointment=include_appointment_details
        )
        
        if result and result.get("success"):
            return {
                "success": True,
                "message": f"I've sent an email to {email}."
            }
        
        return {
            "success": False,
            "message": "I had trouble sending the email. Is your email address correct?"
        }
        
    except Exception as e:
        logger.error(f"send_email error: {e}")
        return {
            "success": False,
            "message": "I couldn't send the email right now."
        }


@function_tool()
async def schedule_callback(
    context: RunContext,
    callback_date: str,
    callback_time: str,
    reason: str,
    notes: Optional[str] = None,
) -> dict:
    """
    Schedule for the AI to call the customer back at a specific time.
    Use when you can't resolve something now or customer requests callback.
    
    Args:
        callback_date: Date to call back (YYYY-MM-DD) or 'today'/'tomorrow'
        callback_time: Time to call back (HH:MM)
        reason: Why we're calling back
        notes: Additional notes for the callback
    
    Returns:
        success: Whether callback was scheduled
        message: Confirmation to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need your information to schedule a callback.",
            "next_action": "identify_customer"
        }
    
    # Normalize inputs - AI sometimes passes nested lists
    callback_date = unwrap_value(callback_date, "")
    callback_time = unwrap_value(callback_time, "")
    reason = unwrap_value(reason, "")
    notes = unwrap_value(notes)
    
    # Handle relative dates
    if callback_date and callback_date.lower() == "today":
        callback_date = datetime.now().strftime("%Y-%m-%d")
    elif callback_date and callback_date.lower() == "tomorrow":
        callback_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    try:
        result = await backend.schedule_callback(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            phone=session.caller_phone or session.customer.get("phone"),
            callback_date=callback_date,
            callback_time=callback_time,
            reason=reason,
            notes=notes,
            original_call_log_id=session.call_log_id
        )
        
        if result and result.get("success"):
            date_formatted = format_date_speech(callback_date)
            time_formatted = format_time_speech(callback_time)
            
            return {
                "success": True,
                "message": f"I've scheduled a callback for {date_formatted} at {time_formatted}. We'll call you then!"
            }
        
        return {
            "success": False,
            "message": "I couldn't schedule the callback. Would another time work?"
        }
        
    except Exception as e:
        logger.error(f"schedule_callback error: {e}")
        return {
            "success": False,
            "message": "I had trouble scheduling that. Let me try again."
        }


@function_tool()
async def send_appointment_details(
    context: RunContext,
    method: str = "sms",
) -> dict:
    """
    Send appointment confirmation/details to the customer.
    Includes date, time, location, and any preparation instructions.
    
    Args:
        method: How to send - 'sms', 'whatsapp', 'email', or 'all'
    
    Returns:
        success: Whether details were sent
        message: Confirmation to tell caller
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {
            "success": False,
            "message": "I need your information first.",
            "next_action": "identify_customer"
        }
    
    try:
        result = await backend.send_appointment_confirmation(
            business_id=session.business_id,
            customer_id=session.customer["id"],
            method=method
        )
        
        if result and result.get("success"):
            method_text = {
                "sms": "a text",
                "whatsapp": "a WhatsApp message",
                "email": "an email",
                "all": "a text and email"
            }.get(method, "a message")
            
            return {
                "success": True,
                "message": f"I've sent you {method_text} with all the appointment details, including our address."
            }
        
        return {
            "success": False,
            "message": "I had trouble sending the details. Would you like me to tell you now instead?"
        }
        
    except Exception as e:
        logger.error(f"send_appointment_details error: {e}")
        return {
            "success": False,
            "message": "I couldn't send the confirmation right now."
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 📋 INFORMATION TOOLS (4)
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool()
async def get_services(context: RunContext) -> dict:
    """
    Get the list of services offered with pricing and duration.
    
    Returns:
        success: Whether lookup succeeded
        message: Summary to tell caller
        services: Full list of services
    """
    session = get_session()
    
    services = session.business_config.get("services", [])
    
    if not services:
        return {
            "success": True,
            "message": "Let me check on our services for you.",
            "services": []
        }
    
    # Format for speech
    if len(services) <= 3:
        details = []
        for svc in services:
            name = svc.get("name", "")
            duration = svc.get("duration_minutes", 0)
            price = svc.get("price", 0)
            
            if price:
                details.append(f"{name} for ${price:.0f}")
            else:
                details.append(name)
        
        message = "We offer " + ", and ".join(details) + "."
    else:
        service_names = [s.get("name", "") for s in services[:5]]
        message = "We offer " + ", ".join(service_names[:-1]) + f", and {service_names[-1]}."
        if len(services) > 5:
            message += f" Plus {len(services) - 5} more services."
    
    return {
        "success": True,
        "message": message,
        "services": services
    }


@function_tool()
async def get_business_hours(context: RunContext) -> dict:
    """
    Get the business operating hours.
    
    Returns:
        success: Whether lookup succeeded
        message: Hours summary to tell caller
        hours: Detailed hours by day
    """
    session = get_session()
    
    hours = session.business_config.get("business_hours", [])
    
    if not hours:
        return {
            "success": True,
            "message": "I'll need to check on our specific hours.",
            "hours": []
        }
    
    # Find today's hours
    today = datetime.now().weekday()
    today_hours = None
    
    for h in hours:
        if h.get("day_of_week") == today:
            today_hours = h
            break
    
    day_names = {
        0: "Monday", 1: "Tuesday", 2: "Wednesday",
        3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"
    }
    
    if today_hours:
        # Backend returns is_open (boolean), not is_closed
        if not today_hours.get("is_open", True):
            message = "We're closed today."
        else:
            open_time = format_time_speech(today_hours.get("open_time", "9:00"))
            close_time = format_time_speech(today_hours.get("close_time", "17:00"))
            message = f"Today we're open from {open_time} until {close_time}."
    else:
        message = "Let me tell you our hours."
    
    return {
        "success": True,
        "message": message,
        "hours": hours
    }


@function_tool()
async def answer_question(
    context: RunContext,
    question: str,
) -> dict:
    """
    Search the knowledge base to answer a customer question.
    
    Args:
        question: The question to answer
    
    Returns:
        success: Whether an answer was found
        message: The answer to tell caller
        source: Where the answer came from
    """
    session = get_session()
    backend = get_backend()
    
    # Normalize inputs - AI sometimes passes nested lists
    question = unwrap_value(question, "")
    
    knowledge_base = session.business_config.get("knowledge_base", [])
    
    # First, search local knowledge base
    question_lower = question.lower() if question else ""
    
    for entry in knowledge_base:
        kb_question = entry.get("question", "").lower()
        # Simple keyword matching
        if any(word in kb_question for word in question_lower.split() if len(word) > 3):
            return {
                "success": True,
                "message": entry.get("answer", ""),
                "source": "knowledge_base"
            }
    
    # If not found locally, try backend search
    try:
        result = await backend.search_knowledge_base(
            business_id=session.business_id,
            query=question
        )
        
        if result and result.get("answer"):
            return {
                "success": True,
                "message": result["answer"],
                "source": "knowledge_base_search"
            }
    except:
        pass
    
    # Log the gap
    try:
        await backend.log_knowledge_gap(
            business_id=session.business_id,
            question=question,
            call_log_id=session.call_log_id
        )
    except:
        pass
    
    return {
        "success": False,
        "message": "I'm not sure about that specific question. Is there something else I can help with?",
        "source": "not_found"
    }


@function_tool()
async def get_directions(context: RunContext) -> dict:
    """
    Provide directions or location information to the business.
    
    Returns:
        success: Whether location info was found
        message: Directions/location info to tell caller
        address: Full address
    """
    session = get_session()
    
    business = session.business_config.get("business", {})
    address = business.get("address", "")
    
    if not address:
        return {
            "success": False,
            "message": "Let me get you our address."
        }
    
    # Check for additional location notes
    location_notes = business.get("location_notes", "")
    
    message = f"We're located at {address}."
    
    if location_notes:
        message += f" {location_notes}"
    
    return {
        "success": True,
        "message": message,
        "address": address
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 🔧 SYSTEM TOOLS (3)
# ═══════════════════════════════════════════════════════════════════════════════

@function_tool()
async def save_memory(
    context: RunContext,
    content: str,
    memory_type: str = "fact",
    importance: int = 5,
) -> dict:
    """
    Save an important piece of information about the customer.
    Use proactively when the customer mentions something worth remembering.
    
    Args:
        content: What to remember (e.g., "Prefers morning appointments")
        memory_type: Type of memory - 'fact', 'preference', 'issue', 'note'
        importance: How important (1-10, higher = more important to remember)
    
    Returns:
        success: Whether memory was saved
        message: Confirmation (keep brief, don't announce to customer)
    """
    session = get_session()
    backend = get_backend()
    
    if not session.customer:
        return {"success": False, "message": ""}
    
    try:
        result = await backend.save_memory(
            customer_id=session.customer["id"],
            business_id=session.business_id,
            memory_type=memory_type,
            content=content,
            importance=min(max(importance, 1), 10),
            source_type="call",
            source_id=session.call_log_id
        )
        
        return {"success": bool(result), "message": ""}
        
    except Exception as e:
        logger.error(f"save_memory error: {e}")
        return {"success": False, "message": ""}


@function_tool()
async def transfer_to_department(
    context: RunContext,
    department: str,
    reason: str,
) -> dict:
    """
    Transfer the call to a different AI role/department.
    NOTE: This transfers to another AI agent, NOT a human.
    
    Args:
        department: Which department (e.g., 'billing', 'technical', 'manager')
        reason: Why the transfer is needed
    
    Returns:
        success: Whether transfer was initiated
        message: What to tell the caller
    """
    session = get_session()
    backend = get_backend()
    
    # Check if department exists
    ai_roles = session.business_config.get("ai_roles", [])
    target_role = None
    
    for role in ai_roles:
        role_type = role.get("role_type", "").lower()
        if department.lower() in role_type or role_type in department.lower():
            target_role = role
            break
    
    if not target_role:
        return {
            "success": False,
            "message": f"I can actually help you with {department} questions. What do you need?"
        }
    
    # Log the transfer attempt
    try:
        await backend.log_transfer(
            call_log_id=session.call_log_id,
            from_role=session.current_role_id,
            to_role=target_role["id"],
            reason=reason
        )
    except:
        pass
    
    return {
        "success": True,
        "message": f"Let me connect you with our {department} team. One moment please."
    }


@function_tool()
async def end_call(
    context: RunContext,
    summary: Optional[str] = None,
) -> dict:
    """
    End the call gracefully with a summary and farewell.
    Use when the conversation is naturally concluding.
    
    Args:
        summary: Brief summary of what was accomplished (optional)
    
    Returns:
        success: Always True
        message: Farewell message
    """
    import asyncio
    
    session = get_session()
    
    # Get customer name for personalized goodbye
    customer_name = ""
    if session.customer:
        customer_name = session.customer.get("first_name", "")
    
    if session.language_code.startswith("tr"):
        if customer_name:
            message = f"Teşekkürler {customer_name}, iyi günler dilerim. Görüşmek üzere!"
        else:
            message = "Aradığınız için teşekkürler. İyi günler!"
    elif session.language_code.startswith("es"):
        if customer_name:
            message = f"Gracias {customer_name}, ¡que tenga un buen día!"
        else:
            message = "¡Gracias por llamar! ¡Que tenga un buen día!"
    else:
        if customer_name:
            message = f"Thank you {customer_name}, have a great day! Goodbye!"
        else:
            message = "Thank you for calling! Have a great day!"
    
    # Schedule room deletion after AI finishes speaking goodbye
    # Using get_job_context().delete_room() which "Deletes the room and disconnects all participants"
    # This is the official LiveKit API that properly terminates SIP calls
    async def delete_room_after_delay():
        try:
            await asyncio.sleep(6)  # Wait 6 seconds for goodbye to be fully spoken
            logger.info("📞 Ending call - deleting room to disconnect all participants")
            job_ctx = get_job_context()
            job_ctx.delete_room()  # This deletes room AND disconnects SIP participant
        except Exception as e:
            logger.warning(f"Error deleting room: {e}")
    
    asyncio.create_task(delete_room_after_delay())
    
    return {
        "success": True,
        "message": message,
        "end_call": True
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TOOL COLLECTION HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def get_tools_for_agent(
    session_data,
    backend: "BackendClient",
    is_existing_customer: bool = False
) -> List:
    """
    Get the list of tools to provide to the agent.
    
    Args:
        session_data: Current session data
        backend: Backend client instance
        is_existing_customer: Whether customer is already identified
    
    Returns:
        List of tool functions
    """
    # Set global context for tools
    set_tool_context(session_data, backend)
    
    # All tools
    all_tools = [
        # Scheduling
        check_availability,
        book_appointment,
        cancel_appointment,
        reschedule_appointment,
        get_my_appointments,
        add_to_waitlist,
        check_waitlist_status,
        
        # Customer Management
        create_new_customer,
        update_customer_info,
        add_customer_note,
        add_family_member,
        get_customer_history,
        record_feedback,
        
        # Communication
        send_sms,
        send_whatsapp,
        send_email,
        schedule_callback,
        send_appointment_details,
        
        # Information
        get_services,
        get_business_hours,
        answer_question,
        get_directions,
        
        # System
        save_memory,
        transfer_to_department,
        end_call,
    ]
    
    return all_tools
