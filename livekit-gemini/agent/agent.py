#!/usr/bin/env python3

"""
Multi-tenant AI Receptionist Agent

Updated to LiveKit Agents v1.3.x patterns:

- AgentServer with @server.rtc_session() decorator

- Stable google.realtime import (not beta)

- Fixed greeting via generate_reply() after session.start()

"""

import asyncio
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    AutoSubscribe,
    JobContext,
    JobProcess,
    cli,
)
from livekit.plugins import google, silero

from backend_client import BackendClient
from prompt_builder import PromptBuilder, build_greeting
from tools import get_tools_for_agent

load_dotenv()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ai-receptionist")

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
backend = BackendClient(BACKEND_URL)

# Create AgentServer instance
server = AgentServer()


class SessionData:
    """Stores state for a single call session"""
    
    def __init__(self, business_id: str, business_config: dict):
        self.business_id = business_id
        self.business_config = business_config
        self.customer = None
        self.caller_phone = None
        self.available_slots = []
        self.default_staff_id = None
        self.call_log_id = None
        self.call_start_time = None
        self.call_outcome = "general_inquiry"
        self.session = None
        self.room = None
        
        # Set default staff if only one exists
        staff = business_config.get("staff", [])
        if len(staff) == 1:
            self.default_staff_id = staff[0]["id"]


def extract_caller_phone(identity: str) -> str:
    """Extract phone number from SIP identity string"""
    if identity.startswith("sip:"):
        identity = identity.replace("sip:", "")
    
    if identity.startswith("sip_"):
        phone = "+" + identity.replace("sip_", "")
    else:
        if "@" in identity:
            identity = identity.split("@")[0]
        phone = identity.strip()
    
    logger.info(f"Extracted caller phone: {phone}")
    return phone


def extract_called_number(ctx: JobContext) -> str:
    """Extract the number that was called (business AI number)"""
    for participant in ctx.room.remote_participants.values():
        attrs = participant.attributes
        
        if attrs and 'sip.trunkPhoneNumber' in attrs:
            called = attrs['sip.trunkPhoneNumber']
            if not called.startswith('+'):
                called = '+' + called
            logger.info(f"Called number: {called}")
            return called
    
    raise ValueError("Could not extract called number from participant attributes")


# Define prewarm function (NOT a decorator)
def prewarm(proc: JobProcess):
    """Preload VAD model for faster call handling"""
    logger.info("Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD ready")


# Assign prewarm via property - this is the key change
server.setup_fnc = prewarm


@server.rtc_session(agent_name="ai-receptionist")
async def entrypoint(ctx: JobContext):
    """Main entry point for each incoming call"""
    logger.info("=" * 50)
    logger.info(f"NEW CALL - Room: {ctx.room.name}")
    logger.info("=" * 50)
    
    call_start = datetime.utcnow()
    
    # Connect and wait for caller
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    
    # Extract phone numbers
    caller_phone = extract_caller_phone(participant.identity)
    called_number = extract_called_number(ctx)
    
    logger.info(f"Caller: {caller_phone} → Called: {called_number}")
    
    # =========================================================================
    # LOAD BUSINESS CONFIG
    # =========================================================================
    
    try:
        business_config = await backend.lookup_business_by_phone(called_number)
    except Exception as e:
        logger.error(f"Failed to load business config: {e}")
        return
    
    business = business_config["business"]
    business_id = business["id"]
    business_name = business["business_name"]
    
    logger.info(f"Business: {business_name} ({business_id})")
    
    # Create session data
    session_data = SessionData(business_id, business_config)
    session_data.caller_phone = caller_phone
    session_data.call_start_time = call_start
    session_data.room = ctx.room
    
    # =========================================================================
    # LOOKUP CUSTOMER
    # =========================================================================
    
    lookup = await backend.lookup_customer(caller_phone, business_id)
    is_existing = lookup.get("exists", False)
    customer_context = None
    
    if is_existing:
        session_data.customer = lookup["customer"]
        logger.info(f"Existing customer: {session_data.customer.get('first_name', 'Unknown')}")
        
        customer_context = await backend.get_customer_context(session_data.customer["id"])
        if customer_context:
            logger.info(f"Customer context loaded: {len(customer_context.get('recent_appointments', []))} recent appointments")
    else:
        logger.info("New customer")
    
    # =========================================================================
    # GET AI CONFIG
    # =========================================================================
    
    ai_roles = business_config.get("ai_roles", [])
    ai_config = None
    
    for role in ai_roles:
        if role.get("role_type") == "receptionist" and role.get("is_enabled"):
            ai_config = role
            break
    
    if not ai_config and ai_roles:
        ai_config = ai_roles[0]
    
    voice = ai_config.get("voice_style", "Kore") if ai_config else "Kore"
    
    # =========================================================================
    # BUILD PROMPT
    # =========================================================================
    
    prompt_builder = PromptBuilder(
        business_config=business_config,
        customer=session_data.customer,
        customer_context=customer_context,
        ai_config=ai_config
    )
    system_prompt = prompt_builder.build()
    
    logger.info(f"System prompt built ({len(system_prompt)} chars)")
    
    # Build greeting
    greeting = build_greeting(business_config, session_data.customer, ai_config)
    
    # =========================================================================
    # LOG CALL START
    # =========================================================================
    
    try:
        call_log = await backend.log_call_start(
            business_id=business_id,
            caller_phone=caller_phone,
            customer_id=session_data.customer["id"] if session_data.customer else None,
            role_id=ai_config["id"] if ai_config else None
        )
        if call_log:
            session_data.call_log_id = call_log["id"]
    except Exception as e:
        logger.warning(f"Failed to log call start: {e}")
    
    # =========================================================================
    # CREATE AGENT WITH TOOLS
    # =========================================================================
    
    tools = get_tools_for_agent(
        session_data=session_data,
        backend=backend,
        is_existing_customer=is_existing
    )
    
    agent = Agent(
        instructions=system_prompt,
        tools=tools,
    )
    
    # =========================================================================
    # CREATE MODEL (Stable google.realtime import - NOT beta)
    # =========================================================================
    
    model = google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice=voice,
        temperature=0.8,
    )
    
    # =========================================================================
    # CREATE AND START SESSION
    # =========================================================================
    
    session = AgentSession(
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # Store session reference for tools (e.g., end_call)
    session_data.session = session
    
    # Start the session
    await session.start(
        agent=agent,
        room=ctx.room,
    )
    
    logger.info(f"Agent session started - Voice: {voice}")
    
    # =========================================================================
    # SEND GREETING - MUST be AFTER session.start()
    # Using generate_reply with instructions forces immediate response
    # Add small delay to allow realtime session to fully establish (fixes timeout)
    # =========================================================================
    
    # Wait for the realtime session to fully establish
    await asyncio.sleep(0.5)  # Small delay to prevent timeout
    
    await session.generate_reply(
        instructions=f"Greet the caller immediately with: {greeting}"
    )
    
    logger.info("Greeting sent")


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("  AI RECEPTIONIST AGENT")
    logger.info("=" * 50)
    logger.info(f"Backend: {BACKEND_URL}")
    logger.info("Waiting for calls...")
    
    # Using AgentServer pattern (v1.3.x)
    cli.run_app(server)
    
    # Legacy pattern (still works in v1.3.x but not used here)
    # cli.run_app(WorkerOptions(
    #     entrypoint_fnc=entrypoint,
    #     prewarm_fnc=prewarm,
    #     agent_name="ai-receptionist",
    # ))
