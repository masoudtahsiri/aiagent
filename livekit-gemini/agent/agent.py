#!/usr/bin/env python3

"""
Multi-tenant AI Receptionist Agent

Clean, focused implementation using:
- PromptBuilder for system prompts
- Modular tools for actions
- Backend client for API calls
"""

import asyncio
import logging
import os
from datetime import datetime
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
        self.session = None  # Store session reference for end_call tool
        self.room = None     # Store room reference for end_call tool
        
        # Set default staff if only one exists
        staff = business_config.get("staff", [])
        if len(staff) == 1:
            self.default_staff_id = staff[0]["id"]


def extract_caller_phone(identity: str) -> str:
    """Extract phone number from SIP identity string"""
    # Remove sip: prefix
    if identity.startswith("sip:"):
        identity = identity.replace("sip:", "")
    
    # Handle sip_ format
    if identity.startswith("sip_"):
        phone = "+" + identity.replace("sip_", "")
    else:
        # Remove @domain if present
        if "@" in identity:
            identity = identity.split("@")[0]
        phone = identity.strip()
    
    logger.info(f"Extracted caller phone: {phone}")
    return phone


def extract_called_number(ctx: JobContext) -> str:
    """Extract the number that was called (business AI number)"""
    for participant in ctx.room.remote_participants.values():
        attrs = getattr(participant, 'attributes', {})
        
        if attrs and 'sip.trunkPhoneNumber' in attrs:
            called = attrs['sip.trunkPhoneNumber']
            if not called.startswith('+'):
                called = '+' + called
            logger.info(f"Called number: {called}")
            return called
    
    raise ValueError("Could not extract called number from participant attributes")


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
    
    # Create session
    session_data = SessionData(business_id, business_config)
    session_data.caller_phone = caller_phone
    session_data.call_start_time = call_start
    session_data.room = ctx.room  # Store room reference
    
    # =========================================================================
    # LOOKUP CUSTOMER
    # =========================================================================
    
    lookup = await backend.lookup_customer(caller_phone, business_id)
    is_existing = lookup.get("exists", False)
    customer_context = None
    
    if is_existing:
        session_data.customer = lookup["customer"]
        logger.info(f"Existing customer: {session_data.customer.get('first_name', 'Unknown')}")
        
        # Fetch customer context (history, tags)
        customer_context = await backend.get_customer_context(session_data.customer["id"])
        if customer_context:
            logger.info(f"Customer context loaded: {len(customer_context.get('recent_appointments', []))} recent appointments, tags: {customer_context.get('tags', [])}")
    else:
        logger.info("New customer")
    
    # =========================================================================
    # GET AI CONFIG
    # =========================================================================
    
    ai_roles = business_config.get("ai_roles", [])
    ai_config = None
    
    # Find receptionist role or use first enabled
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
    # CREATE AGENT
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
    
    model = google_beta.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice=voice,
        temperature=0.8,
    )
    
    session = AgentSession(
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # =========================================================================
    # START SESSION
    # =========================================================================
    
    await session.start(agent=agent, room=ctx.room)
    logger.info("Agent session started")
    session_data.session = session  # Store session reference for end_call
    
    # Wait for audio track subscription (native LiveKit pattern)
    if hasattr(session, 'room_io') and session.room_io and hasattr(session.room_io, 'subscribed_fut'):
        try:
            await asyncio.wait_for(session.room_io.subscribed_fut, timeout=10.0)
            logger.info("Audio track subscribed - ready to speak")
        except asyncio.TimeoutError:
            logger.warning("Audio subscription timeout - proceeding anyway")
    
    # Industry-standard delay for RTP stream stabilization (1s)
    await asyncio.sleep(1.0)
    
    # Send greeting
    await session.generate_reply(
        instructions=f"Greet the caller: {greeting}"
    )
    
    logger.info(f"Greeting sent - Voice: {voice}")


def prewarm(proc: JobProcess):
    """Preload VAD model for faster call handling"""
    logger.info("Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD ready")


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("  AI RECEPTIONIST AGENT")
    logger.info("=" * 50)
    logger.info(f"Backend: {BACKEND_URL}")
    logger.info("Waiting for calls...")
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            num_idle_processes=2,
            agent_name="ai-receptionist",
        ),
    )
