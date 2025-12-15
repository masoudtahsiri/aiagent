"""
AI Agent Tools - Optimized for Reliable Function Calling

Key Improvements:
1. Clear, actionable return messages that tell AI exactly what to say/do next
2. Explicit success/failure states with next-step guidance
3. Concise responses optimized for voice TTS
4. Robust error handling with user-friendly fallbacks
5. Validation before API calls to catch issues early
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from livekit.agents import function_tool, RunContext

logger = logging.getLogger("agent-tools")

# =============================================================================
# FORMATTERS - Optimized for natural speech
# =============================================================================

_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
_MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", 
                "July", "August", "September", "October", "November", "December"]


def format_date_speech(date_str: str) -> str:
    """Format date for natural speech: 2025-01-15 -> Tuesday, January 15th"""
    try:
        year, month, day = map(int, date_str.split("-"))
        date_obj = datetime(year, month, day)
        weekday = _DAY_NAMES[date_obj.weekday()]
        day_suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        return f"{weekday}, {_MONTH_NAMES[month]} {day}{day_suffix}"
    except (ValueError, IndexError):
        return date_str


def format_time_speech(time_str: str) -> str:
    """Format time for natural speech: 14:30 -> 2:30 PM"""
    try:
        parts = time_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        
        period = "AM" if hour < 12 else "PM"
        display_hour = hour % 12 or 12
        
        if minute == 0:
            return f"{display_hour} {period}"
        return f"{display_hour}:{minute:02d} {period}"
    except (ValueError, IndexError):
        return time_str


def format_slots_for_speech(slots: List[Dict], max_days: int = 2, max_times_per_day: int = 3) -> str:
    """Format available slots for natural speech output"""
    if not slots:
        return ""
    
    # Group by date
    by_date = {}
    for slot in slots:
        date = slot["date"]
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(format_time_speech(slot["time"]))
    
    # Build natural speech response
    parts = []
    sorted_dates = sorted(by_date.keys())[:max_days]
    
    for date_str in sorted_dates:
        times = by_date[date_str][:max_times_per_day]
        date_spoken = format_date_speech(date_str)
        
        if len(times) == 1:
            parts.append(f"{date_spoken} at {times[0]}")
        elif len(times) == 2:
            parts.append(f"{date_spoken} at {times[0]} or {times[1]}")
        else:
            times_str = ", ".join(times[:-1]) + f", or {times[-1]}"
            parts.append(f"{date_spoken} at {times_str}")
    
    result = ". ".join(parts)
    
    # Mention if more available
    total_days = len(by_date)
    if total_days > max_days:
        result += f". I also have availability on {total_days - max_days} more days if those don't work."
    
    return result


def format_appointments_for_speech(appointments: List[Dict], max_count: int = 3) -> str:
    """Format appointments for natural speech"""
    if not appointments:
        return ""
    
    parts = []
    for apt in appointments[:max_count]:
        date = format_date_speech(apt["appointment_date"])
        time = format_time_speech(apt["appointment_time"])
        
        staff_name = ""
        if apt.get("staff") and isinstance(apt["staff"], dict):
            staff_name = apt["staff"].get("name", "")
        
        status = apt.get("status", "scheduled")
        
        if status == "cancelled":
            parts.append(f"{date} at {time} (cancelled)")
        elif staff_name:
            parts.append(f"{date} at {time} with {staff_name}")
        else:
            parts.append(f"{date} at {time}")
    
    if len(appointments) > max_count:
        remaining = len(appointments) - max_count
        return ". ".join(parts) + f". And {remaining} more appointment{'s' if remaining > 1 else ''}."
    
    return ". ".join(parts)


def resolve_staff(staff_name: str, staff_list: List[Dict]) -> tuple:
    """Resolve staff name to (staff_id, staff_name) tuple"""
    if not staff_name or not staff_list:
        return None, None
    
    search = staff_name.lower().replace(".", "").replace("dr ", "doctor ").strip()
    
    # Exact match first
    for staff in staff_list:
        if search == staff.get("name", "").lower():
            return staff["id"], staff["name"]
    
    # Partial match (first name, last name, or contains)
    for staff in staff_list:
        name = staff.get("name", "").lower()
        if search in name or any(search == part for part in name.split()):
            return staff["id"], staff["name"]
    
    return None, None


# =============================================================================
# TOOL FACTORY
# =============================================================================

def get_tools_for_agent(session_data, backend, is_existing_customer: bool = False):
    """Create function tools for the Agent with optimized return messages"""
    
    # Pre-compute lookups
    _staff_list = session_data.business_config.get("staff", [])
    _services = session_data.business_config.get("services", [])
    _service_map = {s["id"]: s for s in _services}
    _staff_map = {s["id"]: s for s in _staff_list}
    
    def get_default_staff():
        """Get default staff if only one exists"""
        if len(_staff_list) == 1:
            return _staff_list[0]["id"], _staff_list[0]["name"]
        if session_data.default_staff_id:
            staff = _staff_map.get(session_data.default_staff_id)
            if staff:
                return staff["id"], staff["name"]
        return None, None
    
    def get_staff_names_list() -> str:
        """Get comma-separated list of staff names"""
        return ", ".join(s["name"] for s in _staff_list)

    # =========================================================================
    # CUSTOMER CREATION TOOL
    # =========================================================================
    
    @function_tool()
    async def create_new_customer(
        context: RunContext,
        first_name: str,
        last_name: str,
        date_of_birth: str,
        address: str,
        city: str,
        email: str,
    ) -> dict:
        """
        Save a new customer's information to the system. 
        MUST be called for all new customers before booking appointments.
        
        Args:
            first_name: Customer's first name (required)
            last_name: Customer's last name (required)
            date_of_birth: Date of birth in YYYY-MM-DD format (required)
            address: Street address (required)
            city: City name (required)
            email: Email address (required)
        
        Returns:
            success: Whether the customer was created
            message: What to say to the customer next
            next_action: What to do next (proceed_with_request or retry)
        """
        logger.info(f"👤 create_new_customer: {first_name} {last_name}")
        
        # Validate required fields
        missing = []
        if not first_name or first_name.strip() == "":
            missing.append("first name")
        if not last_name or last_name.strip() == "":
            missing.append("last name")
        if not date_of_birth or date_of_birth.strip() == "":
            missing.append("date of birth")
        if not address or address.strip() == "":
            missing.append("address")
        if not city or city.strip() == "":
            missing.append("city")
        if not email or email.strip() == "":
            missing.append("email")
        
        if missing:
            return {
                "success": False,
                "message": f"I still need your {', '.join(missing)}.",
                "next_action": "collect_missing_info",
                "missing_fields": missing
            }
        
        # Create customer
        customer = await backend.create_customer(
            business_id=session_data.business_id,
            phone=session_data.caller_phone,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email.strip(),
            date_of_birth=date_of_birth.strip(),
            address=address.strip(),
            city=city.strip()
        )
        
        if customer:
            session_data.customer = customer
            logger.info(f"✅ Customer created: {customer.get('id')}")
            return {
                "success": True,
                "message": f"Thank you {first_name}! I've got you all set up in our system. Now, how can I help you today?",
                "next_action": "proceed_with_request",
                "customer_id": customer.get("id")
            }
        
        logger.error("❌ Failed to create customer")
        return {
            "success": False,
            "message": "I'm having a little trouble saving your information. Could you repeat your email address?",
            "next_action": "retry",
            "retry_hint": "Try collecting email again, it may have been unclear"
        }

    # =========================================================================
    # AVAILABILITY TOOLS
    # =========================================================================
    
    @function_tool()
    async def check_availability(
        context: RunContext,
        staff_name: str = None,
        start_date: str = None,
        time_preference: str = None,
    ) -> dict:
        """
        Check available appointment times. MUST be called before answering 
        any question about availability or before booking.
        
        Args:
            staff_name: Name of staff member to check (optional - if not specified and multiple staff exist, will ask)
            start_date: Start date in YYYY-MM-DD format (optional - defaults to today)
            time_preference: Preferred time of day: 'morning', 'afternoon', or 'evening' (optional)
        
        Returns:
            success: Whether availability was found
            message: Natural language description of available times to tell the caller
            available_slots: List of available time slots (for internal use)
            next_action: What to do next
        """
        logger.info(f"🔍 check_availability: staff={staff_name}, date={start_date}, pref={time_preference}")
        
        # Resolve staff
        staff_id, resolved_name = None, None
        if staff_name:
            staff_id, resolved_name = resolve_staff(staff_name, _staff_list)
            if not staff_id:
                names = get_staff_names_list()
                return {
                    "success": False,
                    "message": f"I don't have anyone by that name. Our team includes {names}. Who would you like to see?",
                    "next_action": "ask_staff_preference",
                    "available_staff": [s["name"] for s in _staff_list]
                }
        else:
            staff_id, resolved_name = get_default_staff()
        
        # Multiple staff - need to ask preference
        if not staff_id and len(_staff_list) > 1:
            names = get_staff_names_list()
            return {
                "success": True,
                "message": f"We have {names} available. Do you have a preference?",
                "next_action": "ask_staff_preference",
                "available_staff": [s["name"] for s in _staff_list]
            }
        
        # Single staff - use them
        if not staff_id and len(_staff_list) == 1:
            staff_id = _staff_list[0]["id"]
            resolved_name = _staff_list[0]["name"]
        
        if not staff_id:
            return {
                "success": False,
                "message": "Which provider would you like to see?",
                "next_action": "ask_staff_preference"
            }
        
        # Determine date range
        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")
        
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            start_dt = datetime.now()
            start_date = start_dt.strftime("%Y-%m-%d")
        
        end_date = (start_dt + timedelta(days=14)).strftime("%Y-%m-%d")
        
        # Fetch available slots
        logger.info(f"📡 Fetching slots: staff={resolved_name}, {start_date} to {end_date}")
        slots = await backend.get_available_slots(staff_id, start_date, end_date)
        logger.info(f"📡 Got {len(slots) if slots else 0} slots")
        
        if not slots:
            # Check for known exceptions (vacation, etc)
            staff_info = _staff_map.get(staff_id)
            if staff_info:
                exceptions = staff_info.get("availability_exceptions", [])
                start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
                
                reasons = []
                for exc in exceptions:
                    if exc.get("type") == "closed":
                        try:
                            exc_date = datetime.strptime(exc.get("date", ""), "%Y-%m-%d").date()
                            if start_dt <= exc_date <= end_dt:
                                reasons.append(f"{format_date_speech(exc['date'])}: {exc.get('reason', 'unavailable')}")
                        except:
                            pass
                
                if reasons:
                    reason_text = "; ".join(reasons[:3])
                    return {
                        "success": True,
                        "message": f"I don't have any availability with {resolved_name} in the next two weeks. Note: {reason_text}. Would you like me to check further out or with someone else?",
                        "next_action": "offer_alternatives",
                        "no_availability_reason": reasons
                    }
            
            return {
                "success": True,
                "message": f"I don't have any availability with {resolved_name} in the next two weeks. Would you like me to check further out, or with a different provider?",
                "next_action": "offer_alternatives"
            }
        
        # Filter by time preference if specified
        if time_preference:
            pref = time_preference.lower()
            filtered = []
            for slot in slots:
                try:
                    hour = int(slot["time"].split(":")[0])
                    if pref in ["morning", "am"] and hour < 12:
                        filtered.append(slot)
                    elif pref in ["afternoon", "pm"] and 12 <= hour < 17:
                        filtered.append(slot)
                    elif pref in ["evening", "late"] and hour >= 17:
                        filtered.append(slot)
                except:
                    pass
            
            if filtered:
                slots = filtered
            else:
                formatted = format_slots_for_speech(slots)
                return {
                    "success": True,
                    "message": f"I don't have any {time_preference} slots available. But I do have: {formatted}. Would any of those work?",
                    "next_action": "offer_available_times",
                    "available_slots": slots
                }
        
        # Cache slots for booking
        session_data.available_slots = slots
        
        # Format response
        formatted = format_slots_for_speech(slots)
        return {
            "success": True,
            "message": f"With {resolved_name}, I have {formatted}. Which would you prefer?",
            "next_action": "wait_for_selection",
            "available_slots": slots,
            "staff_name": resolved_name,
            "staff_id": staff_id
        }

    # =========================================================================
    # BOOKING TOOLS
    # =========================================================================
    
    @function_tool()
    async def book_appointment(
        context: RunContext,
        appointment_date: str,
        appointment_time: str,
        staff_name: str = None,
        service_name: str = None,
        notes: str = None,
    ) -> dict:
        """
        Book an appointment. MUST be called to actually create a booking.
        Confirm date, time, and provider with caller before calling this.
        
        Args:
            appointment_date: Date in YYYY-MM-DD format (required)
            appointment_time: Time in HH:MM 24-hour format (required)
            staff_name: Name of staff member (optional if single staff)
            service_name: Name of service (optional)
            notes: Any notes about the appointment (optional)
        
        Returns:
            success: Whether booking succeeded
            message: Confirmation or error message to tell caller
            next_action: What to do next
        """
        logger.info(f"📅 book_appointment: {appointment_date} {appointment_time} with {staff_name}")
        
        # Check customer exists
        if not session_data.customer:
            return {
                "success": False,
                "message": "Before I book that, I need to get a few details from you. What's your first name?",
                "next_action": "collect_customer_info",
                "reason": "no_customer"
            }
        
        # Validate date/time format
        try:
            datetime.strptime(appointment_date, "%Y-%m-%d")
        except ValueError:
            return {
                "success": False,
                "message": "I didn't catch the date. What day would you like?",
                "next_action": "clarify_date"
            }
        
        try:
            datetime.strptime(appointment_time, "%H:%M")
        except ValueError:
            return {
                "success": False,
                "message": "I didn't catch the time. What time would you prefer?",
                "next_action": "clarify_time"
            }
        
        # Resolve staff
        staff_id, resolved_name = None, None
        if staff_name:
            staff_id, resolved_name = resolve_staff(staff_name, _staff_list)
        if not staff_id:
            staff_id, resolved_name = get_default_staff()
        if not staff_id and len(_staff_list) == 1:
            staff_id = _staff_list[0]["id"]
            resolved_name = _staff_list[0]["name"]
        
        if not staff_id:
            return {
                "success": False,
                "message": "Who would you like to book with?",
                "next_action": "ask_staff_preference"
            }
        
        # Resolve service if specified
        service_id = None
        if service_name:
            service_lower = service_name.lower()
            for svc in _services:
                if service_lower in svc.get("name", "").lower():
                    service_id = svc["id"]
                    break
        
        # Book the appointment
        logger.info(f"📡 Calling backend to book appointment...")
        result = await backend.book_appointment(
            business_id=session_data.business_id,
            customer_id=session_data.customer["id"],
            staff_id=staff_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            service_id=service_id,
            notes=notes
        )
        logger.info(f"📡 Booking result: {result}")
        
        if result and result.get("success"):
            session_data.call_outcome = "appointment_booked"
            date_formatted = format_date_speech(appointment_date)
            time_formatted = format_time_speech(appointment_time)
            
            return {
                "success": True,
                "message": f"You're all set! I've booked you for {date_formatted} at {time_formatted} with {resolved_name}. We'll send you a confirmation. Is there anything else I can help with?",
                "next_action": "ask_if_anything_else",
                "appointment": {
                    "date": appointment_date,
                    "time": appointment_time,
                    "staff": resolved_name
                }
            }
        
        # Booking failed - offer alternatives
        return {
            "success": False,
            "message": "I'm sorry, that time slot was just taken. Would you like me to check for other available times?",
            "next_action": "offer_alternatives",
            "reason": "slot_taken"
        }

    @function_tool()
    async def get_my_appointments(context: RunContext) -> dict:
        """
        Get the caller's upcoming appointments.
        Call this when the caller asks about their appointments or before cancelling/rescheduling.
        
        Returns:
            success: Whether appointments were retrieved
            message: Natural description of appointments to tell caller
            appointments: List of appointment details
            next_action: What to do next
        """
        logger.info("📋 get_my_appointments")
        
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to look you up first. Could you tell me your name?",
                "next_action": "identify_customer"
            }
        
        appointments = await backend.get_customer_appointments(
            customer_id=session_data.customer["id"],
            upcoming_only=True
        )
        
        if not appointments:
            return {
                "success": True,
                "message": "You don't have any upcoming appointments scheduled. Would you like to book one?",
                "next_action": "offer_booking",
                "appointments": []
            }
        
        formatted = format_appointments_for_speech(appointments)
        count = len(appointments)
        
        return {
            "success": True,
            "message": f"You have {count} upcoming appointment{'s' if count > 1 else ''}: {formatted}. What would you like to do?",
            "next_action": "wait_for_instruction",
            "appointments": appointments
        }

    @function_tool()
    async def cancel_appointment(
        context: RunContext,
        appointment_date: str = None,
        reason: str = None,
    ) -> dict:
        """
        Cancel an appointment. MUST be called when caller wants to cancel.
        
        Args:
            appointment_date: Specific date to cancel in YYYY-MM-DD (optional - cancels next if not specified)
            reason: Reason for cancellation (optional)
        
        Returns:
            success: Whether cancellation succeeded
            message: Confirmation or status to tell caller
            next_action: What to do next
        """
        logger.info(f"❌ cancel_appointment: date={appointment_date}, reason={reason}")
        
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to look you up first. What's your name?",
                "next_action": "identify_customer"
            }
        
        # Get customer's appointments
        appointments = await backend.get_customer_appointments(
            customer_id=session_data.customer["id"],
            upcoming_only=True
        )
        
        if not appointments:
            return {
                "success": False,
                "message": "I don't see any upcoming appointments to cancel. Is there something else I can help with?",
                "next_action": "ask_what_else"
            }
        
        # Filter to active (non-cancelled) appointments
        active = [a for a in appointments if a.get("status") != "cancelled"]
        
        if not active:
            formatted = format_appointments_for_speech(appointments)
            return {
                "success": False,
                "message": f"All your appointments are already cancelled: {formatted}. Would you like to book a new one?",
                "next_action": "offer_booking"
            }
        
        # Find the appointment to cancel
        apt_to_cancel = None
        if appointment_date:
            for apt in active:
                if apt["appointment_date"] == appointment_date:
                    apt_to_cancel = apt
                    break
            
            if not apt_to_cancel:
                # Check if cancelled already
                for apt in appointments:
                    if apt["appointment_date"] == appointment_date and apt.get("status") == "cancelled":
                        return {
                            "success": False,
                            "message": f"Your appointment on {format_date_speech(appointment_date)} is already cancelled. Is there something else I can help with?",
                            "next_action": "ask_what_else"
                        }
                
                formatted = format_appointments_for_speech(active)
                return {
                    "success": False,
                    "message": f"I don't see an appointment on that date. Your upcoming appointments are: {formatted}. Which one would you like to cancel?",
                    "next_action": "clarify_appointment"
                }
        else:
            # Cancel the next appointment
            apt_to_cancel = active[0]
        
        # Double-check not already cancelled
        if apt_to_cancel.get("status") == "cancelled":
            return {
                "success": False,
                "message": f"That appointment on {format_date_speech(apt_to_cancel['appointment_date'])} is already cancelled.",
                "next_action": "ask_what_else"
            }
        
        # Cancel it
        result = await backend.cancel_appointment(apt_to_cancel["id"], reason)
        
        if result and result.get("success"):
            session_data.call_outcome = "appointment_cancelled"
            date_formatted = format_date_speech(apt_to_cancel["appointment_date"])
            return {
                "success": True,
                "message": f"I've cancelled your appointment on {date_formatted}. Would you like to reschedule for another time?",
                "next_action": "offer_reschedule"
            }
        
        # Check if already cancelled (API might return this)
        if result and "already cancelled" in str(result.get("message", "")).lower():
            return {
                "success": False,
                "message": f"That appointment is already cancelled. Is there something else I can help with?",
                "next_action": "ask_what_else"
            }
        
        return {
            "success": False,
            "message": "I'm having trouble cancelling that right now. Would you like me to have someone call you back to help?",
            "next_action": "offer_callback"
        }

    @function_tool()
    async def reschedule_appointment(
        context: RunContext,
        new_date: str,
        new_time: str,
        current_date: str = None,
    ) -> dict:
        """
        Reschedule an existing appointment to a new date/time.
        Call check_availability first to confirm the new time is available.
        
        Args:
            new_date: New date in YYYY-MM-DD format (required)
            new_time: New time in HH:MM 24-hour format (required)
            current_date: Current appointment date to reschedule (optional - uses next appointment if not specified)
        
        Returns:
            success: Whether reschedule succeeded
            message: Confirmation or error to tell caller
            next_action: What to do next
        """
        logger.info(f"🔄 reschedule_appointment: new={new_date} {new_time}, from={current_date}")
        
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to look you up first. What's your name?",
                "next_action": "identify_customer"
            }
        
        # Get appointments
        appointments = await backend.get_customer_appointments(
            customer_id=session_data.customer["id"],
            upcoming_only=True
        )
        
        if not appointments:
            return {
                "success": False,
                "message": "I don't see any appointments to reschedule. Would you like to book a new one?",
                "next_action": "offer_booking"
            }
        
        # Filter to active
        active = [a for a in appointments if a.get("status") != "cancelled"]
        
        if not active:
            return {
                "success": False,
                "message": "Your appointments are all cancelled. Would you like to book a new one?",
                "next_action": "offer_booking"
            }
        
        # Find appointment to reschedule
        apt = None
        if current_date:
            for a in active:
                if a["appointment_date"] == current_date:
                    apt = a
                    break
            if not apt:
                # Check if it's cancelled
                for a in appointments:
                    if a["appointment_date"] == current_date and a.get("status") == "cancelled":
                        return {
                            "success": False,
                            "message": f"Your appointment on {format_date_speech(current_date)} was cancelled. Would you like to book a new appointment instead?",
                            "next_action": "offer_booking"
                        }
                
                formatted = format_appointments_for_speech(active)
                return {
                    "success": False,
                    "message": f"I don't see an appointment on that date. Your appointments are: {formatted}. Which one did you want to reschedule?",
                    "next_action": "clarify_appointment"
                }
        else:
            apt = active[0]
        
        # Reschedule
        result = await backend.reschedule_appointment(apt["id"], new_date, new_time)
        
        if result and result.get("success"):
            session_data.call_outcome = "appointment_rescheduled"
            new_date_formatted = format_date_speech(new_date)
            new_time_formatted = format_time_speech(new_time)
            return {
                "success": True,
                "message": f"I've rescheduled you to {new_date_formatted} at {new_time_formatted}. We'll send you an updated confirmation. Anything else I can help with?",
                "next_action": "ask_if_anything_else"
            }
        
        return {
            "success": False,
            "message": "That time isn't available after all. Would you like me to check for other times?",
            "next_action": "offer_alternatives"
        }

    # =========================================================================
    # INFORMATION TOOLS
    # =========================================================================
    
    @function_tool()
    async def get_services(context: RunContext) -> dict:
        """
        Get list of services offered by the business.
        Call when caller asks about services, treatments, or what you offer.
        
        Returns:
            success: Whether services were retrieved
            message: Natural description of services
            services: List of service details
        """
        logger.info("📝 get_services")
        
        if not _services:
            return {
                "success": True,
                "message": "Let me check with someone about what specific services we offer. Is there something in particular you're looking for?",
                "services": []
            }
        
        # Build natural response
        parts = []
        for svc in _services[:6]:
            name = svc.get("name", "")
            price = svc.get("price")
            duration = svc.get("duration_minutes", 30)
            
            if price:
                parts.append(f"{name} for ${price:.0f}")
            else:
                parts.append(name)
        
        services_text = ", ".join(parts)
        
        return {
            "success": True,
            "message": f"We offer {services_text}. Would you like more details on any of these?",
            "services": _services
        }

    @function_tool()
    async def get_business_hours(context: RunContext) -> dict:
        """
        Get business operating hours.
        Call when caller asks about hours, when you're open, or when they can come in.
        
        Returns:
            success: Whether hours were retrieved
            message: Natural description of hours
        """
        logger.info("🕐 get_business_hours")
        
        hours = session_data.business_config.get("business_hours", [])
        
        if not hours:
            return {
                "success": True,
                "message": "I don't have the hours in front of me. Would you like me to have someone call you with that information?"
            }
        
        # Build natural response
        open_parts = []
        closed_days = []
        
        for h in sorted(hours, key=lambda x: x.get("day_of_week", 0)):
            day_idx = h.get("day_of_week", 0)
            day = _DAY_NAMES[day_idx] if day_idx < 7 else "Unknown"
            
            if h.get("is_open"):
                open_time = format_time_speech(h.get("open_time", ""))
                close_time = format_time_speech(h.get("close_time", ""))
                open_parts.append(f"{day} {open_time} to {close_time}")
            else:
                closed_days.append(day)
        
        response = "We're open " + ", ".join(open_parts)
        if closed_days:
            response += f". We're closed on {', '.join(closed_days)}"
        
        return {
            "success": True,
            "message": response
        }

    @function_tool()
    async def answer_question(
        context: RunContext,
        question: str,
    ) -> dict:
        """
        Search knowledge base to answer a customer question.
        Call when caller has a question about policies, procedures, or other business info.
        
        Args:
            question: The caller's question
        
        Returns:
            success: Whether answer was found
            message: Answer to tell the caller
        """
        logger.info(f"❓ answer_question: {question}")
        
        knowledge = session_data.business_config.get("knowledge_base", [])
        question_lower = question.lower()
        
        # Quick local search
        for kb in knowledge:
            kb_q = kb.get("question", "").lower()
            # Match if significant words overlap
            if any(word in question_lower for word in kb_q.split() if len(word) > 3):
                session_data.call_outcome = "question_answered"
                return {
                    "success": True,
                    "message": kb["answer"]
                }
        
        # API search
        results = await backend.search_knowledge_base(session_data.business_id, question)
        
        if results and len(results) > 0:
            session_data.call_outcome = "question_answered"
            return {
                "success": True,
                "message": results[0]["answer"]
            }
        
        return {
            "success": False,
            "message": "I don't have that information handy. Would you like me to have someone call you back with an answer?"
        }

    @function_tool()
    async def update_customer_info(
        context: RunContext,
        field: str,
        value: str,
    ) -> dict:
        """
        Update caller's contact information.
        Call when caller wants to update their email, phone, address, or other info.
        
        Args:
            field: Field to update (email, phone, address, city, state, zip_code, preferred_contact_method, accommodations, language)
            value: New value
        
        Returns:
            success: Whether update succeeded
            message: Confirmation to tell caller
        """
        logger.info(f"✏️ update_customer_info: {field} = {value}")
        
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to verify who you are first. Could you tell me your name?",
                "next_action": "identify_customer"
            }
        
        allowed = {'email', 'phone', 'address', 'city', 'state', 'zip_code', 
                   'preferred_contact_method', 'accommodations', 'language'}
        field_clean = field.lower().replace(" ", "_")
        
        if field_clean not in allowed:
            return {
                "success": False,
                "message": "I can update your email, phone, address, or contact preferences. Which would you like to update?",
                "next_action": "clarify_field"
            }
        
        result = await backend.update_customer(
            session_data.customer["id"],
            {field_clean: value}
        )
        
        if result:
            session_data.customer[field_clean] = value
            return {
                "success": True,
                "message": f"I've updated your {field.replace('_', ' ')}. Is there anything else?"
            }
        
        return {
            "success": False,
            "message": "I wasn't able to update that right now. Would you like me to make a note for someone to update it?"
        }

    # =========================================================================
    # CALL CONTROL
    # =========================================================================
    
    @function_tool()
    async def end_call(
        context: RunContext,
        farewell_message: str = None,
    ) -> dict:
        """
        End the phone call gracefully.
        Call when the caller says goodbye, thanks you, or indicates they're done.
        
        Args:
            farewell_message: Optional custom farewell message to say before ending
        
        Returns:
            success: Whether call was ended
        """
        logger.info(f"👋 end_call: {farewell_message}")
        
        try:
            if farewell_message and session_data.session:
                await session_data.session.say(farewell_message, allow_interruptions=False)
                await asyncio.sleep(1.5)  # Let farewell complete
            
            if session_data.room:
                await session_data.room.disconnect()
                logger.info("✅ Call disconnected")
                return {"success": True, "message": "Call ended"}
            
            return {"success": False, "message": "Could not disconnect"}
        except Exception as e:
            logger.error(f"❌ end_call error: {e}")
            return {"success": False, "message": str(e)}

    # =========================================================================
    # BUILD TOOL LIST
    # =========================================================================
    
    tools = [
        check_availability,
        book_appointment,
        get_my_appointments,
        cancel_appointment,
        reschedule_appointment,
        get_services,
        get_business_hours,
        answer_question,
        update_customer_info,
        end_call,
    ]
    
    # Add customer creation tool only for new customers
    if not is_existing_customer:
        tools.insert(0, create_new_customer)
    
    logger.info(f"🔧 Tools loaded: {len(tools)}")
    
    return tools
