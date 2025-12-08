from datetime import datetime, timedelta
from typing import List, Dict
from livekit.agents import function_tool, RunContext
import logging

logger = logging.getLogger("multi-tenant-agent")


def get_tools_for_agent(session_data, backend):
    """Create function tools for the Agent"""
    
    @function_tool()
    async def create_new_customer(
        context: RunContext,
        first_name: str,
        last_name: str,
        email: str = None,
    ) -> dict:
        """Save information for a new customer calling for the first time.
        
        Args:
            first_name: Customer's first name
            last_name: Customer's last name
            email: Customer's email (optional)
        """
        logger.info(f"🔧 Tool called: create_new_customer with first_name={first_name}, last_name={last_name}, email={email}")
        logger.info(f"📞 Calling backend.create_customer with business_id={session_data.business_id}, phone={session_data.caller_phone}")
        
        try:
            customer = await backend.create_customer(
                business_id=session_data.business_id,
                phone=session_data.caller_phone,
                first_name=first_name,
                last_name=last_name,
                email=email
            )
            
            if customer:
                logger.info(f"✅ Customer created successfully: {customer.get('id', 'N/A')}")
                session_data.customer = customer
                return {"success": True, "message": f"Thank you {customer['first_name']}! I've saved your information."}
            else:
                logger.error("❌ Customer creation returned None - backend.create_customer failed")
                return {"success": False, "message": "I'm sorry, there was an error saving your information."}
        except Exception as e:
            logger.error(f"❌ Exception in create_new_customer: {e}", exc_info=True)
            return {"success": False, "message": "I'm sorry, there was an error saving your information."}

    @function_tool()
    async def check_availability(
        context: RunContext,
        start_date: str = None,
    ) -> dict:
        """Check available appointment times.
        
        Args:
            start_date: Date to start checking (YYYY-MM-DD format). Use today if not specified.
        """
        staff_id = session_data.default_staff_id
        
        if not staff_id:
            return {"success": False, "message": "I need to know which staff member you'd like to see."}
        
        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")
        
        end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=7)).strftime("%Y-%m-%d")
        
        slots = await backend.get_available_slots(
            staff_id=staff_id,
            start_date=start_date,
            end_date=end_date
        )
        
        session_data.available_slots = slots
        
        if slots:
            formatted = format_slots_for_speech(slots)
            return {"success": True, "message": f"Here are the available times: {formatted}"}
        else:
            return {"success": True, "message": "I don't have any available appointments in the next week. Would you like me to check further out?"}

    @function_tool()
    async def book_appointment(
        context: RunContext,
        appointment_date: str,
        appointment_time: str,
    ) -> dict:
        """Book an appointment for the customer.
        
        Args:
            appointment_date: Date in YYYY-MM-DD format
            appointment_time: Time in HH:MM format (24-hour), like 09:00 or 14:30
        """
        if not session_data.customer:
            return {"success": False, "message": "I need to get your information first before booking."}
        
        staff_id = session_data.default_staff_id
        if not staff_id:
            return {"success": False, "message": "I need to know which staff member you'd like to see."}
        
        appointment = await backend.book_appointment(
            business_id=session_data.business_id,
            customer_id=session_data.customer["id"],
            staff_id=staff_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time
        )
        
        if appointment:
            date_obj = datetime.strptime(appointment_date, "%Y-%m-%d")
            formatted_date = date_obj.strftime("%A, %B %d")
            
            staff_name = "your provider"
            for staff in session_data.business_config.get("staff", []):
                if staff["id"] == staff_id:
                    staff_name = staff["name"]
                    break
            
            return {"success": True, "message": f"Perfect! I've booked your appointment for {formatted_date} at {appointment_time} with {staff_name}. You'll receive a confirmation email and a reminder call the day before."}
        else:
            return {"success": False, "message": "I'm sorry, that time slot is no longer available. Would you like to choose another time?"}

    return [create_new_customer, check_availability, book_appointment]


def format_slots_for_speech(slots: List[Dict], limit: int = 10) -> str:
    """Format available slots into natural speech"""
    if not slots:
        return "I don't see any available appointments in that time range."
    
    by_date = {}
    for slot in slots[:limit]:
        date = slot["date"]
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(slot["time"])
    
    lines = []
    for date_str in sorted(by_date.keys())[:3]:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_name = date_obj.strftime("%A")
        times = ", ".join(by_date[date_str][:5])
        
        if len(by_date[date_str]) > 5:
            times += f", and {len(by_date[date_str]) - 5} more times"
        
        lines.append(f"{day_name}: {times}")
    
    return ". ".join(lines)
