"""
AI Agent Tools - Functions the AI can call during conversations

Clean, focused tools with clear responses for natural conversation.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from livekit.agents import function_tool, RunContext
import logging
import asyncio

logger = logging.getLogger("agent-tools")


# =============================================================================
# FORMATTERS - Convert data to natural speech
# =============================================================================

def format_date(date_str: str) -> str:
    """Format date for speech: 2025-01-15 -> Wednesday, January 15"""
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        return date_obj.strftime("%A, %B %d")
    except ValueError:
        return date_str


def format_time(time_str: str) -> str:
    """Format time for speech: 14:30 -> 2:30 PM"""
    try:
        # Handle HH:MM and HH:MM:SS
        parts = time_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        
        period = "AM" if hour < 12 else "PM"
        display_hour = hour if hour <= 12 else hour - 12
        if display_hour == 0:
            display_hour = 12
        
        if minute == 0:
            return f"{display_hour} {period}"
        else:
            return f"{display_hour}:{minute:02d} {period}"
    except (ValueError, IndexError):
        return time_str


def format_slots_for_speech(slots: List[Dict], max_days: int = 3, max_times_per_day: int = 4) -> str:
    """Format available slots into natural speech"""
    if not slots:
        return "I don't see any available appointments in that time range."
    
    # Group by date
    by_date = {}
    for slot in slots:
        date = slot["date"]
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(format_time(slot["time"]))
    
    # Build response
    lines = []
    for date_str in sorted(by_date.keys())[:max_days]:
        times = by_date[date_str][:max_times_per_day]
        more = len(by_date[date_str]) - max_times_per_day
        
        time_list = ", ".join(times)
        if more > 0:
            time_list += f", and {more} more"
        
        lines.append(f"{format_date(date_str)}: {time_list}")
    
    remaining_days = len(by_date) - max_days
    if remaining_days > 0:
        lines.append(f"Plus {remaining_days} more days with availability.")
    
    return ". ".join(lines)


def format_appointments_for_speech(appointments: List[Dict]) -> str:
    """Format appointments list for natural speech"""
    if not appointments:
        return "You don't have any upcoming appointments."
    
    lines = []
    for apt in appointments[:5]:
        date = format_date(apt["appointment_date"])
        time = format_time(apt["appointment_time"])
        
        # Get staff name
        staff_name = "your provider"
        if apt.get("staff") and isinstance(apt["staff"], dict):
            staff_name = apt["staff"].get("name", "your provider")
        
        # Get service name if available
        service_info = ""
        if apt.get("service") and isinstance(apt["service"], dict):
            service_info = f" for {apt['service'].get('name', '')}"
        elif apt.get("service_name"):
            service_info = f" for {apt['service_name']}"
        
        # Get status
        status = apt.get("status", "scheduled")
        status_note = ""
        if status == "confirmed":
            status_note = " (confirmed)"
        elif status == "cancelled":
            status_note = " (cancelled)"
        
        lines.append(f"{date} at {time} with {staff_name}{service_info}{status_note}")
    
    if len(appointments) > 5:
        lines.append(f"and {len(appointments) - 5} more")
    
    return ". ".join(lines)


# =============================================================================
# STAFF RESOLUTION
# =============================================================================

def resolve_staff(staff_name: str, staff_list: List[Dict]) -> tuple:
    """
    Resolve staff name to (staff_id, staff_name) or (None, None) if not found.
    Handles: "Dr. Smith", "Sarah", "smith", "Dr Smith", etc.
    """
    if not staff_name or not staff_list:
        return None, None
    
    # Normalize input
    search = staff_name.lower().replace(".", "").replace("dr ", "").strip()
    
    for staff in staff_list:
        name = staff.get("name", "").lower()
        
        # Exact match
        if search == name:
            return staff["id"], staff["name"]
        
        # Partial match (first name, last name, or contained)
        if search in name or name in search:
            return staff["id"], staff["name"]
        
        # Check individual parts
        for part in name.split():
            if search == part:
                return staff["id"], staff["name"]
    
    return None, None


# =============================================================================
# TOOL FACTORY
# =============================================================================

def get_tools_for_agent(session_data, backend, is_existing_customer: bool = False):
    """Create function tools for the Agent"""
    
    # Helper to get staff list
    def get_staff_list():
        return session_data.business_config.get("staff", [])
    
    # Helper to get default staff
    def get_default_staff_id():
        staff = get_staff_list()
        if len(staff) == 1:
            return staff[0]["id"], staff[0]["name"]
        if session_data.default_staff_id:
            for s in staff:
                if s["id"] == session_data.default_staff_id:
                    return s["id"], s["name"]
        return None, None

    # =========================================================================
    # CUSTOMER TOOLS
    # =========================================================================
    
    @function_tool()
    async def create_new_customer(
        context: RunContext,
        first_name: str,
        last_name: str,
        email: str = None,
    ) -> dict:
        """Save a new customer's information.
        
        Args:
            first_name: Customer's first name
            last_name: Customer's last name
            email: Customer's email address (optional)
        """
        logger.info(f"Tool: create_new_customer({first_name} {last_name})")
        
        try:
            customer = await backend.create_customer(
                business_id=session_data.business_id,
                phone=session_data.caller_phone,
                first_name=first_name,
                last_name=last_name,
                email=email
            )
            
            if customer:
                session_data.customer = customer
                return {
                    "success": True,
                    "message": f"Got it, {first_name}. I've saved your information."
                }
            else:
                return {
                    "success": False,
                    "message": "I had trouble saving that. Could you repeat your name?"
                }
        except Exception as e:
            logger.error(f"create_new_customer error: {e}")
            return {
                "success": False,
                "message": "Sorry, I couldn't save your information right now."
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
        """Check available appointment times.
        
        Args:
            staff_name: Staff member name (optional - uses default if only one)
            start_date: Date to start checking, YYYY-MM-DD (optional - uses today)
            time_preference: 'morning', 'afternoon', or 'evening' (optional)
        """
        staff_list = get_staff_list()
        
        # Resolve staff
        staff_id, resolved_name = None, None
        if staff_name:
            staff_id, resolved_name = resolve_staff(staff_name, staff_list)
            if not staff_id:
                names = [s["name"] for s in staff_list]
                return {
                    "success": False,
                    "message": f"I don't have anyone named {staff_name}. We have: {', '.join(names)}. Who would you like?"
                }
        else:
            staff_id, resolved_name = get_default_staff_id()
        
        # If multiple staff and none specified, ask
        if not staff_id and len(staff_list) > 1:
            names = [s["name"] for s in staff_list]
            return {
                "success": True,
                "message": f"We have {', '.join(names)}. Who would you like to see?"
            }
        
        # Use first staff if only one
        if not staff_id and len(staff_list) == 1:
            staff_id = staff_list[0]["id"]
            resolved_name = staff_list[0]["name"]
        
        if not staff_id:
            return {
                "success": False,
                "message": "I need to know which provider you'd like to see."
            }
        
        # Set date range
        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")
        
        end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=14)).strftime("%Y-%m-%d")
        
        logger.info(f"Tool: check_availability(staff={resolved_name}, {start_date} to {end_date})")
        
        # Get slots from backend
        slots = await backend.get_available_slots(
            staff_id=staff_id,
            start_date=start_date,
            end_date=end_date
        )
        
        if not slots:
            # Check WHY no availability - provide context
            staff_info = None
            for s in staff_list:
                if s["id"] == staff_id:
                    staff_info = s
                    break
            
            # Check for staff exceptions in the date range
            unavailable_reasons = []
            if staff_info:
                exceptions = staff_info.get("availability_exceptions", [])
                for exc in exceptions:
                    exc_date = exc.get("date", "")
                    exc_reason = exc.get("reason", "")
                    if exc_reason:
                        unavailable_reasons.append(f"{exc_date}: {exc_reason}")
            
            # Check business closures
            closures = session_data.business_config.get("business_closures", [])
            for closure in closures:
                closure_reason = closure.get("reason", "closed")
                unavailable_reasons.append(f"{closure.get('date', '')}: {closure_reason}")
            
            if unavailable_reasons:
                reasons_text = "; ".join(unavailable_reasons[:3])
                return {
                    "success": True,
                    "message": f"I don't see availability with {resolved_name} in that time range. Note: {reasons_text}. Would you like me to check further out, or with someone else?"
                }
            else:
                return {
                    "success": True,
                    "message": f"I don't see any availability with {resolved_name} in the next two weeks. Would you like me to check further out, or with someone else?"
                }
        
        # Filter by time preference
        if time_preference:
            pref = time_preference.lower()
            filtered = []
            for slot in slots:
                hour = int(slot["time"].split(":")[0])
                if pref in ["morning", "am"] and hour < 12:
                    filtered.append(slot)
                elif pref in ["afternoon", "pm"] and 12 <= hour < 17:
                    filtered.append(slot)
                elif pref in ["evening", "late"] and hour >= 17:
                    filtered.append(slot)
            
            if filtered:
                slots = filtered
            else:
                formatted = format_slots_for_speech(slots)
                return {
                    "success": True,
                    "message": f"No {time_preference} slots available. Here's what I have with {resolved_name}: {formatted}"
                }
        
        # Store for potential booking
        session_data.available_slots = slots
        
        formatted = format_slots_for_speech(slots)
        return {
            "success": True,
            "message": f"Here's availability with {resolved_name}: {formatted}. Which works for you?"
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
        """Book an appointment.
        
        Args:
            appointment_date: Date in YYYY-MM-DD format
            appointment_time: Time in HH:MM format (24-hour)
            staff_name: Staff member name (optional)
            service_name: Service name (optional)
            notes: Any notes for the appointment (optional)
        """
        # Require customer info
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need your name first. What's your first and last name?"
            }
        
        staff_list = get_staff_list()
        
        # Resolve staff
        staff_id, resolved_name = None, None
        if staff_name:
            staff_id, resolved_name = resolve_staff(staff_name, staff_list)
        
        if not staff_id:
            staff_id, resolved_name = get_default_staff_id()
        
        if not staff_id and len(staff_list) == 1:
            staff_id = staff_list[0]["id"]
            resolved_name = staff_list[0]["name"]
        
        if not staff_id:
            return {
                "success": False,
                "message": "Which provider would you like to see?"
            }
        
        # Resolve service to ID
        service_id = None
        if service_name:
            services = session_data.business_config.get("services", [])
            service_lower = service_name.lower()
            for svc in services:
                if service_lower in svc.get("name", "").lower():
                    service_id = svc["id"]
                    break
        
        logger.info(f"Tool: book_appointment({appointment_date} {appointment_time} with {resolved_name})")
        
        result = await backend.book_appointment(
            business_id=session_data.business_id,
            customer_id=session_data.customer["id"],
            staff_id=staff_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            service_id=service_id,
            notes=notes
        )
        
        if result and result.get("success"):
            session_data.call_outcome = "appointment_booked"
            
            date_formatted = format_date(appointment_date)
            time_formatted = format_time(appointment_time)
            staff_display = result.get("staff_name", resolved_name)
            
            return {
                "success": True,
                "message": f"You're all set for {date_formatted} at {time_formatted} with {staff_display}. We'll send you a reminder. Anything else I can help with?"
            }
        else:
            return {
                "success": False,
                "message": "That time isn't available anymore. Want me to check other times?"
            }

    @function_tool()
    async def get_my_appointments(context: RunContext) -> dict:
        """Get the customer's upcoming appointments."""
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to verify who you are. What's your name?"
            }
        
        logger.info(f"Tool: get_my_appointments(customer={session_data.customer['id']})")
        
        appointments = await backend.get_customer_appointments(
            customer_id=session_data.customer["id"],
            upcoming_only=True
        )
        
        if appointments:
            formatted = format_appointments_for_speech(appointments)
            return {
                "success": True,
                "message": f"Your upcoming appointments: {formatted}"
            }
        else:
            return {
                "success": True,
                "message": "You don't have any upcoming appointments. Would you like to schedule one?"
            }

    @function_tool()
    async def cancel_appointment(
        context: RunContext,
        appointment_date: str = None,
        reason: str = None,
    ) -> dict:
        """Cancel an appointment.
        
        Args:
            appointment_date: Date of appointment to cancel, YYYY-MM-DD (cancels next if not specified)
            reason: Reason for cancellation (optional)
        """
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to verify who you are first. What's your name?"
            }
        
        logger.info(f"Tool: cancel_appointment(date={appointment_date})")
        
        # Get appointments
        appointments = await backend.get_customer_appointments(
            customer_id=session_data.customer["id"],
            upcoming_only=True
        )
        
        if not appointments:
            return {
                "success": False,
                "message": "I don't see any upcoming appointments to cancel."
            }
        
        # Find appointment to cancel
        apt_to_cancel = None
        if appointment_date:
            for apt in appointments:
                if apt["appointment_date"] == appointment_date:
                    apt_to_cancel = apt
                    break
            if not apt_to_cancel:
                formatted = format_appointments_for_speech(appointments)
                return {
                    "success": False,
                    "message": f"I don't see an appointment on that date. Your appointments: {formatted}"
                }
        else:
            apt_to_cancel = appointments[0]
        
        result = await backend.cancel_appointment(
            appointment_id=apt_to_cancel["id"],
            cancellation_reason=reason
        )
        
        if result and result.get("success"):
            session_data.call_outcome = "appointment_cancelled"
            date_formatted = format_date(apt_to_cancel["appointment_date"])
            return {
                "success": True,
                "message": f"I've cancelled your {date_formatted} appointment. Would you like to reschedule?"
            }
        else:
            return {
                "success": False,
                "message": "I couldn't cancel that appointment. Let me connect you with someone who can help."
            }

    @function_tool()
    async def reschedule_appointment(
        context: RunContext,
        new_date: str,
        new_time: str,
        current_date: str = None,
    ) -> dict:
        """Reschedule an existing appointment.
        
        Args:
            new_date: New date in YYYY-MM-DD format
            new_time: New time in HH:MM format
            current_date: Date of current appointment to reschedule (reschedules next if not specified)
        """
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to verify who you are. What's your name?"
            }
        
        logger.info(f"Tool: reschedule_appointment(to {new_date} {new_time})")
        
        # Get appointments
        appointments = await backend.get_customer_appointments(
            customer_id=session_data.customer["id"],
            upcoming_only=True
        )
        
        if not appointments:
            return {
                "success": False,
                "message": "I don't see any appointments to reschedule. Want to book a new one?"
            }
        
        # Find appointment
        apt = None
        if current_date:
            for a in appointments:
                if a["appointment_date"] == current_date:
                    apt = a
                    break
        else:
            apt = appointments[0]
        
        if not apt:
            return {
                "success": False,
                "message": "I couldn't find that appointment. Want me to list your appointments?"
            }
        
        result = await backend.reschedule_appointment(
            appointment_id=apt["id"],
            new_date=new_date,
            new_time=new_time
        )
        
        if result and result.get("success"):
            session_data.call_outcome = "appointment_rescheduled"
            date_formatted = format_date(new_date)
            time_formatted = format_time(new_time)
            return {
                "success": True,
                "message": f"Done! You're now scheduled for {date_formatted} at {time_formatted}. Anything else?"
            }
        else:
            return {
                "success": False,
                "message": "That time isn't available. Want me to check other options?"
            }

    # =========================================================================
    # INFORMATION TOOLS
    # =========================================================================
    
    @function_tool()
    async def get_services(context: RunContext) -> dict:
        """Get list of services offered."""
        logger.info("Tool: get_services()")
        
        services = session_data.business_config.get("services", [])
        
        if not services:
            return {
                "success": True,
                "message": "Let me check what services we offer and get back to you."
            }
        
        lines = []
        for svc in services[:8]:
            name = svc.get("name", "")
            price = svc.get("price")
            duration = svc.get("duration_minutes", 30)
            
            if price:
                lines.append(f"{name} - ${price:.0f}, {duration} minutes")
            else:
                lines.append(f"{name} - {duration} minutes")
        
        return {
            "success": True,
            "message": f"We offer: {'; '.join(lines)}. Want details on any of these?"
        }

    @function_tool()
    async def get_business_hours(context: RunContext) -> dict:
        """Get business hours."""
        logger.info("Tool: get_business_hours()")
        
        hours = session_data.business_config.get("business_hours", [])
        
        if not hours:
            return {
                "success": True,
                "message": "I don't have our hours right now. Is there something else I can help with?"
            }
        
        days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        lines = []
        
        for h in sorted(hours, key=lambda x: x.get("day_of_week", 0)):
            day_idx = h.get("day_of_week", 0)
            day = days[day_idx] if 0 <= day_idx < 7 else "Unknown"
            
            if h.get("is_open"):
                open_t = format_time(h.get("open_time", ""))
                close_t = format_time(h.get("close_time", ""))
                lines.append(f"{day} {open_t} to {close_t}")
            else:
                lines.append(f"{day} closed")
        
        return {
            "success": True,
            "message": f"Our hours: {', '.join(lines)}."
        }

    @function_tool()
    async def answer_question(
        context: RunContext,
        question: str,
    ) -> dict:
        """Search knowledge base to answer a question.
        
        Args:
            question: The customer's question
        """
        logger.info(f"Tool: answer_question({question[:50]}...)")
        
        # Search local knowledge base first
        knowledge = session_data.business_config.get("knowledge_base", [])
        question_lower = question.lower()
        
        for kb in knowledge:
            kb_question = kb.get("question", "").lower()
            # Simple keyword matching
            if any(word in question_lower for word in kb_question.split() if len(word) > 3):
                session_data.call_outcome = "question_answered"
                return {
                    "success": True,
                    "message": kb["answer"]
                }
        
        # Try backend search
        results = await backend.search_knowledge_base(session_data.business_id, question)
        
        if results:
            session_data.call_outcome = "question_answered"
            return {
                "success": True,
                "message": results[0]["answer"]
            }
        
        return {
            "success": False,
            "message": "I don't have that information, but I can take a message and have someone call you back. Would that help?"
        }

    @function_tool()
    async def update_customer_info(
        context: RunContext,
        field: str,
        value: str,
    ) -> dict:
        """Update customer's contact information.
        
        Args:
            field: Field to update - 'email', 'phone', 'address'
            value: New value
        """
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to verify who you are first."
            }
        
        allowed = ['email', 'phone', 'address', 'city', 'state', 'zip_code', 'preferred_contact_method', 'accommodations', 'language']
        field_clean = field.lower().replace(" ", "_")
        
        if field_clean not in allowed:
            return {
                "success": False,
                "message": f"I can update your email, phone, or address. Which would you like to change?"
            }
        
        logger.info(f"Tool: update_customer_info({field_clean}={value})")
        
        result = await backend.update_customer(
            customer_id=session_data.customer["id"],
            update_data={field_clean: value}
        )
        
        if result:
            session_data.customer[field_clean] = value
            return {
                "success": True,
                "message": f"Updated your {field}. Anything else?"
            }
        else:
            return {
                "success": False,
                "message": "I couldn't update that right now. Is there anything else I can help with?"
            }

    # =========================================================================
    # CALL CONTROL TOOLS
    # =========================================================================
    
    @function_tool()
    async def end_call(
        context: RunContext,
        farewell_message: str = None,
    ) -> dict:
        """End the phone call gracefully. Use this when the conversation is complete.
        
        Args:
            farewell_message: Optional final message before hanging up
        """
        logger.info("Tool: end_call()")
        
        try:
            # Say goodbye if message provided
            if farewell_message and session_data.session:
                await session_data.session.say(farewell_message, allow_interruptions=False)
                await asyncio.sleep(1.0)  # Let the message finish
            
            # Disconnect from room (ends the call)
            if session_data.room:
                await session_data.room.disconnect()
                logger.info("Call ended successfully")
                return {"success": True, "message": "Call ended"}
            
            return {"success": False, "message": "Could not end call"}
        except Exception as e:
            logger.error(f"end_call error: {e}")
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
    
    # Only add create_new_customer for new customers
    if not is_existing_customer:
        tools.insert(0, create_new_customer)
    
    logger.info(f"Tools loaded: {len(tools)} tools (existing_customer={is_existing_customer})")
    
    return tools
