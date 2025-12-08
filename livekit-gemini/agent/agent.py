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
from tools import get_tools_for_agent, format_slots_for_speech

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
    Extract the number that was called (To number) from SIP participant attributes.
    LiveKit SIP stores call info in participant attributes.
    
    Raises ValueError if phone number cannot be extracted.
    """
    import json
    
    room_name = ctx.room.name
    logger.info(f"Room name: {room_name}")
    
    def is_valid_phone(value: str) -> bool:
        """Check if value looks like a valid phone number"""
        if not value:
            return False
        # Reject template variables
        if "${" in value or "{{" in value:
            logger.warning(f"Received unexpanded template variable: {value}")
            return False
        # Check if it looks like a phone number
        cleaned = value.replace("-", "").replace(" ", "").replace("+", "")
        return cleaned.isdigit() and len(cleaned) >= 10
    
    def normalize_phone(phone: str) -> str:
        """Ensure phone has + prefix"""
        cleaned = phone.replace("-", "").replace(" ", "")
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        return cleaned
    
    # Method 1: Check SIP participant attributes (MOST RELIABLE)
    try:
        for participant in ctx.room.remote_participants.values():
            logger.info(f"Participant: identity={participant.identity}, kind={participant.kind if hasattr(participant, 'kind') else 'N/A'}")
            
            # Check participant attributes (LiveKit SIP stores data here)
            if hasattr(participant, 'attributes') and participant.attributes:
                attrs = participant.attributes
                logger.info(f"Participant attributes: {attrs}")
                
                # LiveKit SIP attribute keys for called number (the number that was called, not the caller)
                # Priority order: trunkPhoneNumber is the called number, toUser is also the called number
                for key in ['sip.trunkPhoneNumber', 'sip.toUser', 'sip.to_user', 'toUser', 'to_user', 'sip.calledNumber', 'sip.to']:
                    if key in attrs:
                        called = attrs[key]
                        logger.info(f"Found '{key}' in attributes: {called}")
                        if is_valid_phone(called):
                            return normalize_phone(called)
                
                # Note: sip.phoneNumber is the CALLER's number, not the called number, so we skip it
                # Only use it as a last resort fallback if nothing else is found
            
            # Check participant metadata as JSON
            if hasattr(participant, 'metadata') and participant.metadata:
                try:
                    meta = json.loads(participant.metadata) if isinstance(participant.metadata, str) else participant.metadata
                    logger.info(f"Participant metadata: {meta}")
                    for key in ['to_user', 'to', 'called_number', 'toUser', 'sip.toUser']:
                        if key in meta and is_valid_phone(str(meta[key])):
                            return normalize_phone(str(meta[key]))
                except Exception as e:
                    logger.warning(f"Failed to parse participant metadata: {e}")
                    
    except Exception as e:
        logger.error(f"Error checking participants: {e}")
    
    # Method 2: Check room metadata
    try:
        if ctx.room.metadata:
            logger.info(f"Room metadata: {ctx.room.metadata}")
            meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
            for key in ['to_user', 'to', 'called_number', 'toUser', 'sip.toUser']:
                if key in meta and is_valid_phone(str(meta[key])):
                    return normalize_phone(str(meta[key]))
    except Exception as e:
        logger.warning(f"Error parsing room metadata: {e}")
    
    # Method 3: Extract from room name if it contains a phone number
    import re
    phone_pattern = r'\+?\d{10,15}'
    match = re.search(phone_pattern, room_name)
    if match:
        called = match.group(0)
        logger.info(f"Extracted phone from room name: {called}")
        return normalize_phone(called)
    
    # Method 4: Check if room name itself is a valid phone
    if is_valid_phone(room_name):
        return normalize_phone(room_name)
    
    # Log all available data for debugging
    logger.error("=== DEBUG: Could not find called number ===")
    logger.error(f"Room name: {room_name}")
    logger.error(f"Room metadata: {ctx.room.metadata}")
    for p in ctx.room.remote_participants.values():
        logger.error(f"Participant {p.identity}: attrs={getattr(p, 'attributes', {})}, meta={getattr(p, 'metadata', '')}")
    logger.error("=== END DEBUG ===")
    
    raise ValueError(f"Unable to determine called phone number. Check agent logs for available SIP data.")


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
    
    # Track if this is an existing customer (used for tool selection)
    is_existing_customer = False
    
    if lookup_result["exists"]:
        is_existing_customer = True
        session_data.customer = lookup_result["customer"]
        customer = session_data.customer
        customer_name = customer["first_name"]
        logger.info(f"Existing customer: {customer_name}")
        
        # Build customer context so AI knows what's already stored
        customer_info = f"""

=== EXISTING CUSTOMER INFORMATION ===
This caller is a RETURNING customer. Their information is already saved in the system:

- First Name: {customer.get('first_name', 'Unknown')}
- Last Name: {customer.get('last_name', 'Not provided')}
- Email: {customer.get('email', 'Not provided')}
- Phone: {customer.get('phone', session_data.caller_phone)}

IMPORTANT RULES:
1. Do NOT ask for their name, email, or phone - you already have this information
2. Simply help them with their request (booking appointments, questions, etc.)
3. You can address them by their first name: {customer_name}
==========================================
"""
        
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
                system_instructions = base_instructions + staff_info + "\n" + customer_info
            else:
                system_instructions = base_instructions + "\n" + customer_info
            
            greeting = ai_config["greeting_message"].format(
                business_name=business_name,
                customer_name=customer_name
            )
            voice = ai_config["voice_style"]
            ai_name = ai_config["ai_name"]
        else:
            # Default for existing customer
            greeting = f"Hello {customer_name}! Thank you for calling {business_name}. How may I help you today?"
            system_instructions = f"""
You are a friendly receptionist for {business_name}.
You are speaking with {customer_name}, a returning customer.
Be warm and help them book appointments.

{customer_info}
"""
            voice = "Kore"
            ai_name = "receptionist"
        
    else:
        is_existing_customer = False
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
            
            # Add guidance for new customers
            new_customer_guidance = """

=== NEW CUSTOMER ===
This is a NEW caller. You should:
1. Warmly greet them
2. Collect their name (first and last)
3. Optionally collect their email
4. Use the create_new_customer tool to save their information
5. Then help them with their request (booking appointments, etc.)
====================
"""
            system_instructions = system_instructions + new_customer_guidance
            
            greeting = ai_config["greeting_message"].format(
                business_name=business_name,
                customer_name="there"
            )
            voice = ai_config["voice_style"]
            ai_name = ai_config["ai_name"]
        else:
            # Default for new customer
            greeting = f"Hello! Thank you for calling {business_name}. I see this is your first time calling. May I get your name please?"
            system_instructions = f"""
You are a friendly receptionist for {business_name}.
This is a new customer. Collect their information (first name, last name, optionally email) and use the create_new_customer tool to save it. Then help them book an appointment.
"""
            voice = "Kore"
            ai_name = "receptionist"
    
    logger.info(f"AI Configuration: {ai_name}, Voice: {voice}, Existing Customer: {is_existing_customer}")
    
    # Create tools with session context
    # Pass is_existing_customer to exclude create_new_customer tool for returning customers
    tools = get_tools_for_agent(session_data, backend, is_existing_customer=is_existing_customer)
    
    # Create Agent with tools
    agent = Agent(
        instructions=system_instructions,
        tools=tools,
    )
    
    # Create Gemini model - NO tools here
    model = google_beta.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice=voice,
        temperature=0.8,
    )
    
    # Create session
    session = AgentSession(
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # Start session
    await session.start(agent=agent, room=ctx.room)
    
    logger.info("Agent session started")
    
    # Trigger greeting explicitly (fixes both greeting not playing AND ticking noise)
    await asyncio.sleep(0.3)  # Brief delay for audio pipeline to stabilize
    await session.generate_reply(instructions=f"Greet the caller by saying: {greeting}")
    
    logger.info(f"Greeting triggered for {business_name}")


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
