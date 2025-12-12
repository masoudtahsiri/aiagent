#!/usr/bin/env python3

"""
Multi-tenant AI Receptionist Agent - Optimized Version

Key Optimizations:
1. Persistent HTTP client with connection pooling
2. Parallel data fetching where possible
3. Optimized logging (reduced overhead in hot paths)
4. Better error recovery
5. Graceful shutdown handling

Compatible with LiveKit Agents v1.3.x patterns.
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

# =============================================================================
# LOGGING CONFIGURATION - Optimized 
# =============================================================================

# Reduce log level for production performance
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("ai-receptionist")

# Reduce noise from libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


# =============================================================================
# CONFIGURATION
# =============================================================================

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Global persistent backend client (connection pooled)
backend = BackendClient(BACKEND_URL)

# Create AgentServer instance
server = AgentServer()


# =============================================================================
# SESSION DATA
# =============================================================================

class SessionData:
    """Stores state for a single call session"""
    
    __slots__ = [
        'business_id', 'business_config', 'customer', 'caller_phone',
        'available_slots', 'default_staff_id', 'call_log_id',
        'call_start_time', 'call_outcome', 'session', 'room'
    ]
    
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


# =============================================================================
# PHONE NUMBER EXTRACTION - Optimized
# =============================================================================

def extract_caller_phone(identity: str) -> str:
    """Extract phone number from SIP identity string - optimized"""
    # Remove sip: prefix
    if identity.startswith("sip:"):
        identity = identity[4:]
    
    # Handle sip_ format
    if identity.startswith("sip_"):
        return "+" + identity[4:]
    
    # Remove @domain
    at_idx = identity.find("@")
    if at_idx != -1:
        identity = identity[:at_idx]
    
    return identity.strip()


def extract_called_number(ctx: JobContext) -> str:
    """Extract the number that was called (business AI number)"""
    for participant in ctx.room.remote_participants.values():
        attrs = participant.attributes
        
        if attrs and 'sip.trunkPhoneNumber' in attrs:
            called = attrs['sip.trunkPhoneNumber']
            return called if called.startswith('+') else '+' + called
    
    raise ValueError("Could not extract called number from participant attributes")


# =============================================================================
# PREWARM
# =============================================================================

def prewarm(proc: JobProcess):
    """Preload VAD model for faster call handling"""
    logger.info("Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD ready")


server.setup_fnc = prewarm


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

@server.rtc_session(agent_name="ai-receptionist")
async def entrypoint(ctx: JobContext):
    """Main entry point for each incoming call - optimized"""
    call_start = datetime.utcnow()
    
    logger.info(f"=== NEW CALL: {ctx.room.name} ===")
    
    # Connect and wait for caller
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    
    # Extract phone numbers
    caller_phone = extract_caller_phone(participant.identity)
    called_number = extract_called_number(ctx)
    
    logger.info(f"Call: {caller_phone} → {called_number}")
    
    # =========================================================================
    # LOAD BUSINESS CONFIG (cached in backend)
    # =========================================================================
    
    try:
        business_config = await backend.lookup_business_by_phone(called_number)
    except Exception as e:
        logger.error(f"Business lookup failed: {e}")
        return
    
    business = business_config["business"]
    business_id = business["id"]
    
    logger.info(f"Business: {business['business_name']}")
    
    # Create session data
    session_data = SessionData(business_id, business_config)
    session_data.caller_phone = caller_phone
    session_data.call_start_time = call_start
    session_data.room = ctx.room
    
    # =========================================================================
    # LOOKUP CUSTOMER - Optimized with parallel context fetch
    # =========================================================================
    
    lookup, customer_context = await backend.lookup_customer_with_context(
        caller_phone, business_id
    )
    
    is_existing = lookup.get("exists", False)
    if is_existing:
        session_data.customer = lookup["customer"]
        logger.info(f"Customer: {session_data.customer.get('first_name', 'Unknown')}")
        if customer_context:
            logger.info(f"Context: {len(customer_context.get('recent_appointments', []))} appointments")
    else:
        logger.info("New customer")
    
    # =========================================================================
    # GET AI CONFIG
    # =========================================================================
    
    ai_roles = business_config.get("ai_roles", [])
    ai_config = None
    
    # Find receptionist role (or first enabled role)
    for role in ai_roles:
        if role.get("role_type") == "receptionist" and role.get("is_enabled"):
            ai_config = role
            break
    
    if not ai_config and ai_roles:
        ai_config = ai_roles[0]
    
    voice = ai_config.get("voice_style", "Kore") if ai_config else "Kore"
    
    # =========================================================================
    # BUILD PROMPT - Optimized
    # =========================================================================
    
    greeting = build_greeting(business_config, session_data.customer, ai_config)
    
    prompt_builder = PromptBuilder(
        business_config=business_config,
        customer=session_data.customer,
        customer_context=customer_context,
        ai_config=ai_config
    )
    system_prompt = prompt_builder.build()
    
    # Add greeting instruction
    system_prompt = f"""{system_prompt}

GREETING INSTRUCTION:
When caller says "Hello" or starts, say this EXACTLY:
"{greeting}"
Then continue naturally."""
    
    logger.debug(f"Prompt: {len(system_prompt)} chars")
    
    # =========================================================================
    # LOG CALL START - Fire and forget
    # =========================================================================
    
    # Non-blocking call logging
    asyncio.create_task(_log_call_start(
        backend, business_id, caller_phone,
        session_data.customer.get("id") if session_data.customer else None,
        ai_config.get("id") if ai_config else None,
        session_data
    ))
    
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
    # CREATE MODEL
    # =========================================================================
    
    model = google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice=voice,
        temperature=0.8,
    )
    
    # =========================================================================
    # START SESSION
    # =========================================================================
    
    session = AgentSession(
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
    )
    
    session_data.session = session
    
    await session.start(
        agent=agent,
        room=ctx.room,
    )
    
    logger.info(f"Session started - Voice: {voice}")
    
    # =========================================================================
    # SEND GREETING
    # =========================================================================
    
    logger.debug(f"Greeting: {greeting}")
    await session.generate_reply(user_input="Hello")
    
    logger.info("✓ Call ready")


async def _log_call_start(backend, business_id, caller_phone, customer_id, role_id, session_data):
    """Non-blocking call logging"""
    try:
        call_log = await backend.log_call_start(
            business_id=business_id,
            caller_phone=caller_phone,
            customer_id=customer_id,
            role_id=role_id
        )
        if call_log:
            session_data.call_log_id = call_log["id"]
    except Exception as e:
        logger.warning(f"Call log failed: {e}")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    logger.info("=" * 40)
    logger.info("  AI RECEPTIONIST AGENT")
    logger.info("=" * 40)
    logger.info(f"Backend: {BACKEND_URL}")
    logger.info("Waiting for calls...")
    
    cli.run_app(server)
