#!/usr/bin/env python3
import asyncio
import logging
import os
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    Agent,
    AgentSession,
)
from livekit.plugins.google import beta as google_beta
from livekit.plugins import silero

from backend_client import BackendClient
from tools import get_tools_declaration, format_slots_for_speech

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("multi-tenant-agent")

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Initialize backend client
backend = BackendClient(BACKEND_URL)

# Session storage
sessions = {}


class SessionData:
    def __init__(self, business_id: str, business_config: dict):
        self.business_id = business_id
        self.business_config = business_config
        self.customer = None
        self.caller_phone = None
        self.available_slots = []
        self.default_staff_id = None
        
        # Set default staff if only one
        staff = business_config.get("staff", [])
        if len(staff) == 1:
            self.default_staff_id = staff[0]["id"]


def extract_phone_from_identity(identity: str) -> str:
    """
    Extract phone number from SIP identity
    Examples:
    - "sip:+903322379153@trgw01.bulutfon.net" -> "+903322379153"
    - "+1234567890" -> "+1234567890"
    - "sip_905397293667" -> "+905397293667"
    """
    # Remove sip: prefix if present
    if identity.startswith("sip:"):
        identity = identity.replace("sip:", "")
    
    # Handle "sip_XXXXXXXX" format (from LiveKit participant identity)
    if identity.startswith("sip_"):
        phone = "+" + identity.replace("sip_", "")
    else:
        # Extract everything before @ if present
        if "@" in identity:
            identity = identity.split("@")[0]
        
        # Clean up
        phone = identity.strip()
    
    logger.info(f"Extracted caller phone: {phone}")
    return phone


def extract_called_number(ctx: JobContext) -> str:
    """
    Extract the number that was called (To number)
    This tells us which business to route to
    
    LiveKit SIP can pass the called number via:
    1. Room name (if configured in dispatch rules to use phone number)
    2. Room metadata (if SIP headers are stored there)
    3. Participant metadata (if available)
    
    Raises ValueError if phone number cannot be extracted.
    """
    # Method 1: Try room name (most common with dispatch rules)
    room_name = ctx.room.name
    logger.info(f"Room name: {room_name}")
    
    # If room name looks like a phone number, use it
    # Phone numbers typically start with + or contain digits
    if room_name.startswith("+") or (room_name.replace("-", "").replace(" ", "").isdigit() and len(room_name) >= 10):
        logger.info(f"Using room name as called number: {room_name}")
        return room_name
    
    # Method 2: Try room metadata for SIP "To" header (PRIORITY - this is set by dispatch rule)
    try:
        metadata = ctx.room.metadata
        logger.info(f"Room metadata (raw): {metadata}")
        if metadata:
            # Look for "to_user", "to", or "called_number" in metadata
            import json
            if isinstance(metadata, str):
                try:
                    metadata_dict = json.loads(metadata)
                except:
                    logger.warning(f"Failed to parse metadata as JSON: {metadata}")
                    metadata_dict = {}
            else:
                metadata_dict = metadata
            
            logger.info(f"Room metadata (parsed): {metadata_dict}")
            
            # Check for "to_user" first (set by dispatch rule)
            if "to_user" in metadata_dict:
                called = metadata_dict["to_user"]
                logger.info(f"Found called number in room metadata (to_user): {called}")
                # Ensure it has + prefix if it's a phone number
                if called and not called.startswith("+") and called.isdigit():
                    called = "+" + called
                return called
            if "to" in metadata_dict:
                called = metadata_dict["to"]
                logger.info(f"Found called number in room metadata (to): {called}")
                if called and not called.startswith("+") and called.isdigit():
                    called = "+" + called
                return called
            if "called_number" in metadata_dict:
                called = metadata_dict["called_number"]
                logger.info(f"Found called number in room metadata (called_number): {called}")
                if called and not called.startswith("+") and called.isdigit():
                    called = "+" + called
                return called
        else:
            logger.warning("Room metadata is empty or None")
    except Exception as e:
        logger.error(f"Could not extract from room metadata: {e}")
    
    # Method 3: Try to extract from room name if it contains phone-like pattern
    # Some SIP configurations use formats like "sip-room-+1234567890"
    import re
    phone_pattern = r'\+?\d{10,15}'  # Match phone numbers
    match = re.search(phone_pattern, room_name)
    if match:
        called = match.group(0)
        logger.info(f"Extracted called number from room name: {called}")
        return called
    
    # Method 4: Try to get from participant metadata (check for to_user, to, or called_number)
    try:
        participants = ctx.room.remote_participants.values()
        for participant in participants:
            logger.info(f"Checking participant: identity={participant.identity}, metadata={participant.metadata if hasattr(participant, 'metadata') else 'N/A'}")
            # Check participant metadata first
            if hasattr(participant, 'metadata') and participant.metadata:
                import json
                try:
                    part_metadata = json.loads(participant.metadata) if isinstance(participant.metadata, str) else participant.metadata
                    logger.info(f"Participant metadata (parsed): {part_metadata}")
                    if "to_user" in part_metadata:
                        called = part_metadata["to_user"]
                        if called and not called.startswith("+") and called.isdigit():
                            called = "+" + called
                        logger.info(f"Found called number in participant metadata (to_user): {called}")
                        return called
                    if "to" in part_metadata:
                        called = part_metadata["to"]
                        if called and not called.startswith("+") and called.isdigit():
                            called = "+" + called
                        logger.info(f"Found called number in participant metadata (to): {called}")
                        return called
                    if "called_number" in part_metadata:
                        called = part_metadata["called_number"]
                        if called and not called.startswith("+") and called.isdigit():
                            called = "+" + called
                        logger.info(f"Found called number in participant metadata (called_number): {called}")
                        return called
                except Exception as e:
                    logger.warning(f"Failed to parse participant metadata: {e}")
    except Exception as e:
        logger.error(f"Could not extract from participant metadata: {e}")
    
    # If we couldn't extract the phone number, raise an error
    logger.error(f"Could not extract called number from room name '{room_name}' or metadata")
    raise ValueError(f"Unable to determine called phone number from room '{room_name}'. Configure SIP dispatch rules to use phone number as room name.")


async def get_business_config(called_number: str) -> dict:
    """
    Lookup business configuration by the number that was called
    """
    try:
        # Call backend to lookup business by AI phone number
        config = await backend.lookup_business_by_phone(called_number)
        logger.info(f"Found business: {config['business']['business_name']}")
        return config
    except Exception as e:
        logger.error(f"Error looking up business: {e}")
        raise Exception(f"No business found for number: {called_number}")


async def handle_tool_call(session_data: SessionData, function_name: str, arguments: dict):
    """Handle Gemini function calls"""
    logger.info(f"Tool called: {function_name} with args: {arguments}")
    
    if function_name == "create_new_customer":
        customer = await backend.create_customer(
            business_id=session_data.business_id,
            phone=session_data.caller_phone,
            first_name=arguments.get("first_name"),
            last_name=arguments.get("last_name"),
            email=arguments.get("email")
        )
        
        if customer:
            session_data.customer = customer
            logger.info(f"Created customer: {customer['id']}")
            return {
                "success": True,
                "message": f"Thank you {customer['first_name']}! I've saved your information."
            }
        else:
            return {
                "success": False,
                "message": "I'm sorry, there was an error saving your information."
            }
    
    elif function_name == "check_availability":
        staff_id = session_data.default_staff_id
        
        # If multiple staff, try to find by name
        if arguments.get("staff_name") and len(session_data.business_config.get("staff", [])) > 1:
            for staff in session_data.business_config["staff"]:
                if arguments["staff_name"].lower() in staff["name"].lower():
                    staff_id = staff["id"]
                    break
        
        if not staff_id:
            return {
                "success": False,
                "message": "I need to know which staff member you'd like to see."
            }
        
        start_date = arguments.get("start_date") or datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=7)).strftime("%Y-%m-%d")
        
        slots = await backend.get_available_slots(
            staff_id=staff_id,
            start_date=start_date,
            end_date=end_date
        )
        
        session_data.available_slots = slots
        session_data.default_staff_id = staff_id  # Remember selected staff
        
        if slots:
            formatted = format_slots_for_speech(slots)
            return {
                "success": True,
                "message": f"Here are the available times: {formatted}"
            }
        else:
            return {
                "success": True,
                "message": "I don't have any available appointments in the next week. Would you like me to check further out?"
            }
    
    elif function_name == "book_appointment":
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to get your information first before booking."
            }
        
        staff_id = session_data.default_staff_id
        
        if not staff_id:
            return {
                "success": False,
                "message": "I need to know which staff member you'd like to see."
            }
        
        appointment = await backend.book_appointment(
            business_id=session_data.business_id,
            customer_id=session_data.customer["id"],
            staff_id=staff_id,
            appointment_date=arguments["appointment_date"],
            appointment_time=arguments["appointment_time"]
        )
        
        if appointment:
            date_obj = datetime.strptime(arguments["appointment_date"], "%Y-%m-%d")
            formatted_date = date_obj.strftime("%A, %B %d")
            
            # Get staff name
            staff_name = "your provider"
            for staff in session_data.business_config.get("staff", []):
                if staff["id"] == staff_id:
                    staff_name = staff["name"]
                    break
            
            return {
                "success": True,
                "message": f"Perfect! I've booked your appointment for {formatted_date} at {arguments['appointment_time']} with {staff_name}. You'll receive a confirmation email and a reminder call the day before."
            }
        else:
            return {
                "success": False,
                "message": "I'm sorry, that time slot is no longer available. Would you like to choose another time?"
            }
    
    return {"success": False, "message": "Unknown function"}


async def entrypoint(ctx: JobContext):
    logger.info(f"========== NEW CALL ==========")
    logger.info(f"Room: {ctx.room.name}")
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    
    # Extract caller and called numbers
    caller_phone = extract_phone_from_identity(participant.identity)
    called_number = extract_called_number(ctx)
    
    logger.info(f"Caller: {caller_phone}")
    logger.info(f"Called number: {called_number}")
    
    # Lookup business configuration
    try:
        business_config = await get_business_config(called_number)
    except Exception as e:
        logger.error(f"Failed to get business config: {e}")
        # Could play error message here
        return
    
    business = business_config["business"]
    business_id = business["id"]
    business_name = business["business_name"]
    
    logger.info(f"Routing to business: {business_name} (ID: {business_id})")
    
    # Create session data
    session_data = SessionData(business_id, business_config)
    session_data.caller_phone = caller_phone
    sessions[ctx.room.name] = session_data
    
    # Lookup customer
    lookup_result = await backend.lookup_customer(caller_phone, business_id)
    
    # Get AI configuration
    ai_roles = business_config.get("ai_roles", [])
    
    # Use first enabled receptionist role or create default
    ai_config = None
    for role in ai_roles:
        if role["role_type"] == "receptionist" and role["is_enabled"]:
            ai_config = role
            break
    
    if lookup_result["exists"]:
        session_data.customer = lookup_result["customer"]
        customer_name = session_data.customer["first_name"]
        logger.info(f"Existing customer: {customer_name}")
        
        if ai_config:
            base_instructions = ai_config["system_prompt"].format(
                business_name=business_name,
                customer_name=customer_name
            )
            # Add staff information dynamically
            staff_list = business_config.get("staff", [])
            if staff_list:
                staff_info = "\n\nAvailable Staff Members:\n"
                for staff in staff_list:
                    staff_info += f"- {staff.get('name', 'Unknown')} ({staff.get('title', 'Staff')})\n"
                system_instructions = base_instructions + staff_info
            else:
                system_instructions = base_instructions
            
            greeting = ai_config["greeting_message"].format(
                customer_name=customer_name
            )
            voice = ai_config["voice_style"]
            ai_name = ai_config["ai_name"]
        else:
            # Default for existing customer
            system_instructions = f"""
You are a friendly receptionist for {business_name}.
You are speaking with {customer_name}, a returning customer.
Be warm and help them book appointments.
"""
            greeting = f"Hello {customer_name}! Thank you for calling {business_name}. How may I help you today?"
            voice = "Kore"
            ai_name = "receptionist"
        
    else:
        logger.info("New customer")
        
        if ai_config:
            base_instructions = ai_config["system_prompt"].format(
                business_name=business_name,
                customer_name="new customer"
            )
            # Add staff information dynamically
            staff_list = business_config.get("staff", [])
            if staff_list:
                staff_info = "\n\nAvailable Staff Members:\n"
                for staff in staff_list:
                    staff_info += f"- {staff.get('name', 'Unknown')} ({staff.get('title', 'Staff')})\n"
                system_instructions = base_instructions + staff_info
            else:
                system_instructions = base_instructions
            
            greeting = ai_config["greeting_message"].format(
                customer_name="there"
            )
            voice = ai_config["voice_style"]
            ai_name = ai_config["ai_name"]
        else:
            # Default for new customer
            system_instructions = f"""
You are a friendly receptionist for {business_name}.
This is a new customer. Collect their information and help them book an appointment.
"""
            greeting = f"Hello! Thank you for calling {business_name}. I see this is your first time calling. May I get your name please?"
            voice = "Kore"
            ai_name = "receptionist"
    
    logger.info(f"AI Configuration: {ai_name}, Voice: {voice}")
    
    # Create Agent
    agent = Agent(instructions=system_instructions)
    
    # Create Gemini model with function calling
    model = google_beta.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice=voice,
        temperature=0.8,
        tools=get_tools_declaration(),
    )
    
    # Create session
    session = AgentSession(
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # Handle function calls
    @session.on("function_call")
    async def on_function_call(function_call):
        logger.info(f"Function call: {function_call.name}")
        result = await handle_tool_call(
            session_data,
            function_call.name,
            function_call.arguments
        )
        await function_call.create_response(result)
    
    # Start session
    await session.start(agent=agent, room=ctx.room)
    
    logger.info("Agent session started")
    
    # Send greeting
    await asyncio.sleep(0.5)
    await session.generate_reply(instructions=f"Say: {greeting}")
    
    logger.info(f"Greeting sent for {business_name}")


def prewarm(proc: JobProcess):
    logger.info("Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD model ready")


if __name__ == "__main__":
    logger.info("========================================")
    logger.info("  MULTI-TENANT AI RECEPTIONIST AGENT   ")
    logger.info("========================================")
    logger.info(f"Backend: {BACKEND_URL}")
    logger.info("Waiting for calls...")
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            num_idle_processes=2,
            agent_name="ai-receptionist",  # Explicit agent name for SIP dispatch
        ),
    )
