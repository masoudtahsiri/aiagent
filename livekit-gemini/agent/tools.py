"""AI Agent Tools - Functions the AI can call during conversations"""

from datetime import datetime, timedelta

from typing import List, Dict, Optional

from livekit.agents import function_tool, RunContext

import logging

logger = logging.getLogger("multi-tenant-agent")

def format_slots_for_speech(slots: List[Dict], limit: int = 10) -> str:

    """Format available slots into natural speech"""

    if not slots:

        return "I don't see any available appointments in that time range."

    

    by_date = {}

    for slot in slots[:limit]:

        date = slot["date"]

        if date not in by_date:

            by_date[date] = []

        # Convert time to readable format

        time_str = slot["time"]

        if len(time_str) > 5:

            time_str = time_str[:5]

        by_date[date].append(time_str)

    

    lines = []

    for date_str in sorted(by_date.keys())[:3]:

        date_obj = datetime.strptime(date_str, "%Y-%m-%d")

        day_name = date_obj.strftime("%A, %B %d")

        times = ", ".join(by_date[date_str][:5])

        

        if len(by_date[date_str]) > 5:

            times += f", and {len(by_date[date_str]) - 5} more times"

        

        lines.append(f"{day_name}: {times}")

    

    return ". ".join(lines)

def format_appointments_for_speech(appointments: List[Dict]) -> str:

    """Format appointments list for speech"""

    if not appointments:

        return "You don't have any upcoming appointments."

    

    lines = []

    for apt in appointments[:5]:

        date_obj = datetime.strptime(apt["appointment_date"], "%Y-%m-%d")

        day_name = date_obj.strftime("%A, %B %d")

        time_str = apt["appointment_time"][:5] if len(apt["appointment_time"]) > 5 else apt["appointment_time"]

        

        staff_name = "your provider"

        if apt.get("staff") and apt["staff"].get("name"):

            staff_name = apt["staff"]["name"]

        

        lines.append(f"{day_name} at {time_str} with {staff_name}")

    

    if len(appointments) > 5:

        lines.append(f"and {len(appointments) - 5} more appointments")

    

    return ". ".join(lines)

def resolve_staff_by_name(staff_name: str, staff_list: List[Dict]) -> tuple:

    """

    Resolve staff name to ID. Returns (staff_id, staff_name) or (None, None) if not found.

    Handles various formats: "Dr. Smith", "Sarah", "sarah_johnson", "Johnson", etc.

    """

    if not staff_name or not staff_list:

        return None, None

    

    # Normalize the input name

    staff_name_lower = staff_name.lower().replace("_", " ").replace(".", "").strip()

    

    # Try exact match first, then partial match

    for staff in staff_list:

        name_lower = staff.get("name", "").lower()

        title_lower = staff.get("title", "").lower()

        

        # Check if input matches name or is contained in name

        if (staff_name_lower == name_lower or

            staff_name_lower in name_lower or

            name_lower in staff_name_lower):

            return staff["id"], staff["name"]

        

        # Check title match (e.g., "doctor", "hygienist")

        if staff_name_lower in title_lower:

            return staff["id"], staff["name"]

        

        # Check individual name parts (first name, last name)

        name_parts = name_lower.split()

        for part in name_parts:

            if staff_name_lower == part or part in staff_name_lower:

                return staff["id"], staff["name"]

    

    return None, None

def get_tools_for_agent(session_data, backend, is_existing_customer: bool = False):

    """Create function tools for the Agent"""

    

    # ==================== CUSTOMER MANAGEMENT ====================

    

    @function_tool()

    async def create_new_customer(

        context: RunContext,

        first_name: str,

        last_name: str,

        date_of_birth: str = None,

        address: str = None,

        city: str = None,

        email: str = None,

    ) -> dict:

        """Save information for a new customer calling for the first time.

        

        Args:

            first_name: Customer's first name

            last_name: Customer's last name

            date_of_birth: Customer's date of birth (YYYY-MM-DD format) - optional

            address: Customer's street address - optional

            city: Customer's city - optional

            email: Customer's email - optional

        """

        logger.info(f"🔧 Tool: create_new_customer - {first_name} {last_name}")

        

        try:

            customer = await backend.create_customer(

                business_id=session_data.business_id,

                phone=session_data.caller_phone,

                first_name=first_name,

                last_name=last_name,

                date_of_birth=date_of_birth,

                address=address,

                city=city,

                email=email

            )

            

            if customer:

                logger.info(f"✅ Customer created: {customer.get('id')}")

                session_data.customer = customer

                return {"success": True, "message": f"Thank you {first_name}! I've saved your information."}

            else:

                logger.error("❌ Customer creation returned None")

                return {"success": False, "message": "I'm sorry, there was an error saving your information. Let me try again."}

        except Exception as e:

            logger.error(f"❌ Exception in create_new_customer: {e}", exc_info=True)

            return {"success": False, "message": "I'm sorry, there was an error. Could you repeat your information?"}

    # ==================== APPOINTMENT MANAGEMENT ====================

    @function_tool()

    async def check_availability(

        context: RunContext,

        start_date: str = None,

        staff_name: str = None,

        service_name: str = None,

        time_preference: str = None,

    ) -> dict:

        """Check available appointment times with smart filtering.

        

        Args:

            start_date: Date to start checking (YYYY-MM-DD format). Uses today if not specified.

            staff_name: Staff member name (e.g., "Dr. Smith", "Sarah", "Johnson"). Use the name from the staff list.

            service_name: Service name to filter by duration (e.g., "cleaning", "whitening").

            time_preference: Preferred time - 'morning' (before 12pm), 'afternoon' (12pm-5pm), 'evening' (after 5pm).

        """

        staff_list = session_data.business_config.get("staff", [])

        target_staff_id = None

        resolved_staff_name = None

        # Resolve staff by name if provided

        if staff_name:

            target_staff_id, resolved_staff_name = resolve_staff_by_name(staff_name, staff_list)

            

            if not target_staff_id:

                names = [f"{s['name']} ({s.get('title', 'Staff')})" for s in staff_list]

                return {

                    "success": False, 

                    "message": f"I couldn't find {staff_name}. Our staff members are: {', '.join(names)}. Who would you like to see?"

                }

        # Use default staff if not specified

        if not target_staff_id:

            target_staff_id = session_data.default_staff_id

        # If still no staff and multiple options, ask

        if not target_staff_id:

            if len(staff_list) > 1:

                names = [f"{s['name']} ({s.get('title', 'Staff')})" for s in staff_list]

                return {

                    "success": True, 

                    "message": f"We have several providers available. Would you like to see {', or '.join(names)}?"

                }

            elif len(staff_list) == 1:

                target_staff_id = staff_list[0]["id"]

                resolved_staff_name = staff_list[0]["name"]

            else:

                return {"success": False, "message": "I'm having trouble finding available providers. Let me connect you with someone who can help."}

        # Get staff name for response if not already resolved

        if not resolved_staff_name:

            for staff in staff_list:

                if staff["id"] == target_staff_id:

                    resolved_staff_name = staff["name"]

                    break

        # Determine service duration if service specified

        service_duration = 30  # default

        if service_name:

            services = session_data.business_config.get("services", [])

            service_name_lower = service_name.lower()

            for svc in services:

                if service_name_lower in svc.get("name", "").lower():

                    service_duration = svc.get("duration_minutes", 30)

                    break

        

        # Set date range

        if not start_date:

            start_date = datetime.now().strftime("%Y-%m-%d")

        

        end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=14)).strftime("%Y-%m-%d")

        

        logger.info(f"🔧 Tool: check_availability - staff={target_staff_id}, dates={start_date} to {end_date}, preference={time_preference}")

        

        slots = await backend.get_available_slots(

            staff_id=target_staff_id,

            start_date=start_date,

            end_date=end_date

        )

        

        if not slots:

            return {

                "success": True, 

                "message": f"I don't see any available appointments with {resolved_staff_name or 'that provider'} in the next two weeks. Would you like me to check with another provider, or look further out?"

            }

        

        # Filter by time preference if specified

        if time_preference:

            time_pref_lower = time_preference.lower()

            filtered_slots = []

            

            for slot in slots:

                time_str = slot["time"]

                hour = int(time_str.split(":")[0])

                

                if time_pref_lower in ["morning", "am", "early"] and hour < 12:

                    filtered_slots.append(slot)

                elif time_pref_lower in ["afternoon", "pm", "mid"] and 12 <= hour < 17:

                    filtered_slots.append(slot)

                elif time_pref_lower in ["evening", "late", "after work"] and hour >= 17:

                    filtered_slots.append(slot)

            

            if filtered_slots:

                slots = filtered_slots

            else:

                # No slots match preference, inform customer

                formatted = format_slots_for_speech(slots[:10])

                return {

                    "success": True,

                    "message": f"I don't have any {time_preference} appointments available, but here are other times with {resolved_staff_name or 'your provider'}: {formatted}. Would any of these work?"

                }

        

        session_data.available_slots = slots

        

        # Format response

        formatted = format_slots_for_speech(slots[:10])

        

        staff_mention = f" with {resolved_staff_name}" if resolved_staff_name else ""

        

        return {

            "success": True, 

            "message": f"Here are available times{staff_mention}: {formatted}. Which would work best for you?"

        }

    @function_tool()

    async def book_appointment(

        context: RunContext,

        appointment_date: str,

        appointment_time: str,

        staff_name: str = None,

        service_name: str = None,

        notes: str = None,

    ) -> dict:

        """Book an appointment for the customer.

        

        Args:

            appointment_date: Date in YYYY-MM-DD format

            appointment_time: Time in HH:MM format (24-hour), like 09:00 or 14:30

            staff_name: Staff member name (e.g., "Dr. Smith", "Sarah"). Uses default if not specified.

            service_name: Service name if booking for specific service (e.g., "cleaning", "checkup")

            notes: Any notes about the appointment

        """

        if not session_data.customer:

            return {"success": False, "message": "I need to get your information first before booking. May I have your name?"}

        

        staff_list = session_data.business_config.get("staff", [])

        target_staff_id = None

        resolved_staff_name = None

        # Resolve staff by name if provided

        if staff_name:

            target_staff_id, resolved_staff_name = resolve_staff_by_name(staff_name, staff_list)

            

            if not target_staff_id:

                names = [f"{s['name']} ({s.get('title', 'Staff')})" for s in staff_list]

                return {

                    "success": False, 

                    "message": f"I couldn't find {staff_name}. Our staff members are: {', '.join(names)}. Who would you like to see?"

                }

        # Use default staff if not specified

        if not target_staff_id:

            target_staff_id = session_data.default_staff_id

        if not target_staff_id:

            return {"success": False, "message": "I need to know which provider you'd like to see."}

        

        # Resolve service_name to service_id if provided

        service_id = None

        if service_name:

            services = session_data.business_config.get("services", [])

            service_name_lower = service_name.lower()

            for svc in services:

                if service_name_lower in svc.get("name", "").lower():

                    service_id = svc["id"]

                    break

        logger.info(f"🔧 Tool: book_appointment - date={appointment_date}, time={appointment_time}, staff={target_staff_id}")

        

        result = await backend.book_appointment(

            business_id=session_data.business_id,

            customer_id=session_data.customer["id"],

            staff_id=target_staff_id,

            appointment_date=appointment_date,

            appointment_time=appointment_time,

            service_id=service_id,

            notes=notes

        )

        

        if result and result.get("success"):

            date_obj = datetime.strptime(appointment_date, "%Y-%m-%d")

            formatted_date = date_obj.strftime("%A, %B %d")

            staff_name_response = result.get("staff_name", resolved_staff_name or "your provider")

            

            # Track outcome for call logging

            session_data.call_outcome = "appointment_booked"

            

            return {

                "success": True, 

                "message": f"Perfect! I've booked your appointment for {formatted_date} at {appointment_time} with {staff_name_response}. You'll receive a confirmation and reminder before your appointment. Is there anything else I can help you with?"

            }

        else:

            return {"success": False, "message": "I'm sorry, that time slot is no longer available. Would you like to choose another time?"}

    @function_tool()

    async def get_my_appointments(

        context: RunContext,

        include_past: bool = False,

    ) -> dict:

        """Get the customer's appointments.

        

        Args:

            include_past: Whether to include past appointments (default: False, shows upcoming only)

        """

        if not session_data.customer:

            return {"success": False, "message": "I don't have your information yet. Could you tell me your name so I can look up your appointments?"}

        

        logger.info(f"🔧 Tool: get_my_appointments - customer={session_data.customer['id']}")

        

        appointments = await backend.get_customer_appointments(

            customer_id=session_data.customer["id"],

            upcoming_only=not include_past

        )

        

        if appointments:

            formatted = format_appointments_for_speech(appointments)

            return {"success": True, "message": f"Here are your appointments: {formatted}"}

        else:

            return {"success": True, "message": "You don't have any upcoming appointments. Would you like to schedule one?"}

    @function_tool()

    async def get_appointment_history(

        context: RunContext,

        limit: int = 5,

    ) -> dict:

        """Get the customer's past appointment history.

        

        Args:

            limit: Maximum number of past appointments to return (default: 5)

        """

        if not session_data.customer:

            return {"success": False, "message": "I don't have your information yet. Could you tell me your name so I can look up your history?"}

        

        logger.info(f"🔧 Tool: get_appointment_history - customer={session_data.customer['id']}")

        

        # Get past appointments (not upcoming)

        appointments = await backend.get_customer_appointments(

            customer_id=session_data.customer["id"],

            upcoming_only=False

        )

        

        if not appointments:

            return {"success": True, "message": "I don't see any appointment history on file. Is this your first time visiting us?"}

        

        # Filter to past appointments only and completed/no-show status

        today = datetime.now().strftime("%Y-%m-%d")

        past_appointments = [

            apt for apt in appointments 

            if apt["appointment_date"] < today or apt.get("status") in ["completed", "no_show", "cancelled"]

        ]

        

        if not past_appointments:

            return {"success": True, "message": "I don't see any past appointments. You may have upcoming appointments scheduled."}

        

        # Sort by date descending (most recent first) and limit

        past_appointments.sort(key=lambda x: x["appointment_date"], reverse=True)

        past_appointments = past_appointments[:limit]

        

        # Format for speech

        lines = []

        for apt in past_appointments:

            date_obj = datetime.strptime(apt["appointment_date"], "%Y-%m-%d")

            formatted_date = date_obj.strftime("%B %d, %Y")

            

            staff_name = "a provider"

            if apt.get("staff") and apt["staff"].get("name"):

                staff_name = apt["staff"]["name"]

            

            status = apt.get("status", "completed")

            if status == "completed":

                lines.append(f"{formatted_date} with {staff_name}")

            elif status == "cancelled":

                lines.append(f"{formatted_date} with {staff_name} (cancelled)")

            elif status == "no_show":

                lines.append(f"{formatted_date} with {staff_name} (missed)")

        

        history_text = ". ".join(lines)

        

        # Add summary

        total = session_data.customer.get("total_appointments", len(past_appointments))

        last_visit = session_data.customer.get("last_visit_date", "unknown")

        

        return {

            "success": True, 

            "message": f"Here's your recent appointment history: {history_text}. You've had {total} total appointments with us."

        }

    @function_tool()

    async def update_my_info(

        context: RunContext,

        field: str,

        new_value: str,

    ) -> dict:

        """Update customer's information.

        

        Args:

            field: The field to update - 'email', 'phone', 'address', 'city', 'state', 'zip_code'

            new_value: The new value for the field

        """

        if not session_data.customer:

            return {"success": False, "message": "I need to verify your identity first. Could you tell me your name?"}

        

        # Validate field

        allowed_fields = ['email', 'phone', 'address', 'city', 'state', 'zip_code', 'first_name', 'last_name']

        field_lower = field.lower().replace(' ', '_')

        

        if field_lower not in allowed_fields:

            return {

                "success": False, 

                "message": f"I can update your email, phone, address, city, state, or zip code. Which would you like to change?"

            }

        

        logger.info(f"🔧 Tool: update_my_info - field={field_lower}, value={new_value}")

        

        try:

            result = await backend.update_customer(

                customer_id=session_data.customer["id"],

                update_data={field_lower: new_value}

            )

            

            if result:

                # Update local session data

                session_data.customer[field_lower] = new_value

                

                field_display = field_lower.replace('_', ' ')

                return {

                    "success": True, 

                    "message": f"I've updated your {field_display} to {new_value}. Is there anything else you'd like to update?"

                }

            else:

                return {"success": False, "message": "I wasn't able to update that information. Let me connect you with someone who can help."}

        except Exception as e:

            logger.error(f"Error updating customer info: {e}")

            return {"success": False, "message": "I'm having trouble updating your information right now. Please try again later or speak with our staff directly."}

    @function_tool()

    async def cancel_appointment(

        context: RunContext,

        appointment_date: str = None,

        reason: str = None,

    ) -> dict:

        """Cancel an appointment.

        

        Args:

            appointment_date: Date of appointment to cancel (YYYY-MM-DD). If not provided, will cancel the next upcoming appointment.

            reason: Reason for cancellation

        """

        if not session_data.customer:

            return {"success": False, "message": "I need to verify your information first. Could you tell me your name?"}

        

        logger.info(f"🔧 Tool: cancel_appointment - date={appointment_date}")

        

        # Get customer's appointments to find the one to cancel

        appointments = await backend.get_customer_appointments(

            customer_id=session_data.customer["id"],

            upcoming_only=True

        )

        

        if not appointments:

            return {"success": False, "message": "I don't see any upcoming appointments to cancel."}

        

        # Find appointment to cancel

        appointment_to_cancel = None

        if appointment_date:

            for apt in appointments:

                if apt["appointment_date"] == appointment_date:

                    appointment_to_cancel = apt

                    break

            if not appointment_to_cancel:

                return {"success": False, "message": f"I don't see an appointment on {appointment_date}. Your upcoming appointments are: {format_appointments_for_speech(appointments)}"}

        else:

            # Cancel next upcoming

            appointment_to_cancel = appointments[0]

        

        result = await backend.cancel_appointment(

            appointment_id=appointment_to_cancel["id"],

            cancellation_reason=reason

        )

        

        if result and result.get("success"):

            date_obj = datetime.strptime(appointment_to_cancel["appointment_date"], "%Y-%m-%d")

            formatted_date = date_obj.strftime("%A, %B %d")

            

            session_data.call_outcome = "appointment_cancelled"

            

            return {"success": True, "message": f"I've cancelled your appointment on {formatted_date}. Would you like to reschedule for another time?"}

        else:

            return {"success": False, "message": "I'm sorry, I wasn't able to cancel that appointment. Let me connect you with someone who can help."}

    @function_tool()

    async def reschedule_appointment(

        context: RunContext,

        new_date: str,

        new_time: str,

        current_appointment_date: str = None,

        staff_name: str = None,

    ) -> dict:

        """Reschedule an existing appointment to a new time.

        

        Args:

            new_date: New date in YYYY-MM-DD format

            new_time: New time in HH:MM format

            current_appointment_date: Date of current appointment (YYYY-MM-DD). If not provided, reschedules the next upcoming appointment.

            staff_name: Staff member name if changing provider (optional)

        """

        if not session_data.customer:

            return {"success": False, "message": "I need to verify your information first. Could you tell me your name?"}

        

        logger.info(f"🔧 Tool: reschedule_appointment - new_date={new_date}, new_time={new_time}")

        

        # Get customer's appointments

        appointments = await backend.get_customer_appointments(

            customer_id=session_data.customer["id"],

            upcoming_only=True

        )

        

        if not appointments:

            return {"success": False, "message": "I don't see any upcoming appointments to reschedule. Would you like to book a new appointment?"}

        

        # Find appointment to reschedule

        appointment_to_reschedule = None

        if current_appointment_date:

            for apt in appointments:

                if apt["appointment_date"] == current_appointment_date:

                    appointment_to_reschedule = apt

                    break

        else:

            appointment_to_reschedule = appointments[0]

        

        if not appointment_to_reschedule:

            return {"success": False, "message": "I couldn't find that appointment. Would you like me to list your upcoming appointments?"}

        

        # Resolve staff if name provided

        staff_id = None

        if staff_name:

            staff_list = session_data.business_config.get("staff", [])

            staff_id, _ = resolve_staff_by_name(staff_name, staff_list)

        result = await backend.reschedule_appointment(

            appointment_id=appointment_to_reschedule["id"],

            new_date=new_date,

            new_time=new_time,

            

            staff_id=staff_id

        )

        

        if result and result.get("success"):

            date_obj = datetime.strptime(new_date, "%Y-%m-%d")

            formatted_date = date_obj.strftime("%A, %B %d")

            

            session_data.call_outcome = "appointment_rescheduled"

            

            return {"success": True, "message": f"I've rescheduled your appointment to {formatted_date} at {new_time}. You'll receive an updated confirmation. Is there anything else I can help with?"}

        else:

            return {"success": False, "message": "I'm sorry, that time slot isn't available. Would you like me to check other available times?"}

    # ==================== INFORMATION QUERIES ====================

    @function_tool()

    async def get_services(

        context: RunContext,

        category: str = None,

    ) -> dict:

        """Get list of services offered by the business.

        

        Args:

            category: Filter by service category (optional)

        """

        logger.info(f"🔧 Tool: get_services")

        

        services = session_data.business_config.get("services", [])

        

        if not services:

            return {"success": True, "message": "Let me check what services we offer. One moment please."}

        

        if category:

            services = [s for s in services if s.get("category", "").lower() == category.lower()]

        

        if not services:

            return {"success": True, "message": f"I don't see any services in the {category} category."}

        

        lines = []

        for svc in services[:10]:

            price_str = f"${svc['price']:.0f}" if svc.get("price") else "price varies"

            duration = f"{svc['duration_minutes']} minutes"

            lines.append(f"{svc['name']}: {price_str}, {duration}")

        

        return {"success": True, "message": f"Here are our services: {'. '.join(lines)}. Would you like more details on any of these?"}

    @function_tool()

    async def get_business_info(

        context: RunContext,

        info_type: str,

    ) -> dict:

        """Get business information like hours, location, or contact info.

        

        Args:

            info_type: Type of info requested - 'hours', 'location', 'address', 'phone', 'website'

        """

        logger.info(f"🔧 Tool: get_business_info - type={info_type}")

        

        business = session_data.business_config.get("business", {})

        hours = session_data.business_config.get("business_hours", [])

        

        info_type = info_type.lower()

        

        if info_type in ["hours", "schedule", "open"]:

            if not hours:

                return {"success": True, "message": "I don't have the business hours on file. Please call during regular business hours."}

            

            day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

            lines = []

            for h in hours:

                day = day_names[h["day_of_week"]]

                if h["is_open"]:

                    lines.append(f"{day}: {h['open_time']} to {h['close_time']}")

                else:

                    lines.append(f"{day}: Closed")

            

            return {"success": True, "message": f"Our hours are: {'. '.join(lines)}"}

        

        elif info_type in ["location", "address", "where"]:

            address_parts = []

            if business.get("address"):

                address_parts.append(business["address"])

            if business.get("city"):

                address_parts.append(business["city"])

            if business.get("state"):

                address_parts.append(business["state"])

            if business.get("zip_code"):

                address_parts.append(business["zip_code"])

            

            if address_parts:

                return {"success": True, "message": f"We're located at {', '.join(address_parts)}"}

            else:

                return {"success": True, "message": "I don't have the address on file."}

        

        elif info_type in ["phone", "contact", "call"]:

            if business.get("phone_number"):

                return {"success": True, "message": f"Our phone number is {business['phone_number']}"}

            else:

                return {"success": True, "message": "You've reached us! How can I help you?"}

        

        elif info_type in ["website", "web", "online"]:

            if business.get("website"):

                return {"success": True, "message": f"Our website is {business['website']}"}

            else:

                return {"success": True, "message": "I don't have a website on file."}

        

        else:

            return {"success": True, "message": "I can help you with our hours, location, phone number, or website. What would you like to know?"}

    @function_tool()

    async def answer_question(

        context: RunContext,

        question: str,

    ) -> dict:

        """Search the knowledge base to answer a customer question.

        

        Args:

            question: The customer's question

        """

        logger.info(f"🔧 Tool: answer_question - '{question}'")

        

        # First check local knowledge base

        knowledge_base = session_data.business_config.get("knowledge_base", [])

        

        # Simple keyword matching

        question_lower = question.lower()

        for kb in knowledge_base:

            if any(word in question_lower for word in kb.get("question", "").lower().split()):

                session_data.call_outcome = "question_answered"

                return {"success": True, "message": kb["answer"]}

        

        # If not found locally, search via API

        results = await backend.search_knowledge_base(session_data.business_id, question)

        

        if results:

            session_data.call_outcome = "question_answered"

            return {"success": True, "message": results[0]["answer"]}

        

        return {"success": False, "message": "I don't have that information, but I can have someone get back to you. Would you like to leave a message or speak with someone directly?"}

    # ==================== BUILD TOOL LIST ====================

    

    tools = [

        check_availability,

        book_appointment,

        get_my_appointments,

        get_appointment_history,

        cancel_appointment,

        reschedule_appointment,

        update_my_info,

        get_services,

        get_business_info,

        answer_question,

    ]

    

    # Only include create_new_customer for NEW customers

    if not is_existing_customer:

        tools.insert(0, create_new_customer)

        logger.info("Tools loaded: create_new_customer + 10 standard tools")

    else:

        logger.info("Tools loaded: 10 standard tools (existing customer)")

    

    return tools
