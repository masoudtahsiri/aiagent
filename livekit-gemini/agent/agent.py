#!/usr/bin/env python3

"""
Multi-tenant AI Receptionist Agent - Optimized Version

Key Improvements:
1. Cleaner greeting flow without redundant instructions
2. Better error handling and logging
3. Optimized session initialization
4. Proper call lifecycle management
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
    
    logger.info(f"📞 Extracted caller phone: {phone}")
    return phone


def extract_called_number(ctx: JobContext) -> str:
    """Extract the number that was called (business AI number)"""
    for participant in ctx.room.remote_participants.values():
        attrs = participant.attributes
        
        if attrs and 'sip.trunkPhoneNumber' in attrs:
            called = attrs['sip.trunkPhoneNumber']
            if not called.startswith('+'):
                called = '+' + called
            logger.info(f"📞 Called number: {called}")
            return called
    
    raise ValueError("Could not extract called number from participant attributes")


def prewarm(proc: JobProcess):
    """Preload VAD model for faster call handling"""
    logger.info("🔄 Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("✅ VAD ready")


server.setup_fnc = prewarm


@server.rtc_session(agent_name="ai-receptionist")
async def entrypoint(ctx: JobContext):
    """Main entry point for each incoming call"""
    logger.info("=" * 60)
    logger.info("🔔 NEW INCOMING CALL")
    logger.info(f"   Room: {ctx.room.name}")
    logger.info("=" * 60)
    
    call_start = datetime.utcnow()
    
    # Connect and wait for caller
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    
    # Extract phone numbers
    caller_phone = extract_caller_phone(participant.identity)
    called_number = extract_called_number(ctx)
    
    logger.info(f"📞 Call: {caller_phone} → {called_number}")
    
    # =========================================================================
    # LOAD BUSINESS CONFIG
    # =========================================================================
    
    try:
        business_config = await backend.lookup_business_by_phone(called_number)
    except Exception as e:
        logger.error(f"❌ Failed to load business config: {e}")
        return
    
    business = business_config["business"]
    business_id = business["id"]
    business_name = business["business_name"]
    
    logger.info(f"🏢 Business: {business_name} ({business_id})")
    
    # Create session data
    session_data = SessionData(business_id, business_config)
    session_data.caller_phone = caller_phone
    session_data.call_start_time = call_start
    session_data.room = ctx.room
    
    # =========================================================================
    # LOOKUP CUSTOMER (with context if exists)
    # =========================================================================
    
    lookup, customer_context = await backend.lookup_customer_with_context(
        caller_phone, business_id
    )
    is_existing = lookup.get("exists", False)
    
    if is_existing:
        session_data.customer = lookup["customer"]
        customer_name = session_data.customer.get("first_name", "Unknown")
        logger.info(f"👤 Returning customer: {customer_name}")
        if customer_context:
            apt_count = len(customer_context.get("recent_appointments", []))
            logger.info(f"   Context loaded: {apt_count} recent appointments")
    else:
        customer_context = None
        logger.info("👤 New customer (not in system)")
    
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
    # BUILD SYSTEM PROMPT (Optimized - no redundant greeting instructions)
    # =========================================================================
    
    prompt_builder = PromptBuilder(
        business_config=business_config,
        customer=session_data.customer,
        customer_context=customer_context,
        ai_config=ai_config
    )
    system_prompt = prompt_builder.build()
    
    # Build the greeting
    greeting = build_greeting(business_config, session_data.customer, ai_config)
    
    # Add greeting instruction to system prompt
    system_prompt = f"""{system_prompt}

IMPORTANT - START THE CALL:
You must speak FIRST. Immediately say this greeting when the call connects:
"{greeting}"
Then wait for the caller to respond and continue naturally."""
    
    logger.info(f"📝 System prompt built ({len(system_prompt)} chars)")
    logger.info(f"💬 Greeting: {greeting[:50]}...")
    
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
            logger.info(f"📊 Call log created: {call_log['id']}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to log call start: {e}")
    
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
    
    logger.info(f"🤖 Agent created with {len(tools)} tools")
    
    # =========================================================================
    # CREATE MODEL
    # =========================================================================
    
    model = google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice=voice,
        temperature=0.7,  # Slightly lower for more consistent tool calling
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
    
    logger.info(f"✅ Session started - Voice: {voice}")
    
    # =========================================================================
    # INITIATE GREETING
    # AI speaks FIRST when call connects - don't wait for caller
    # =========================================================================
    
    logger.info("💬 Triggering greeting...")
    
    # Trigger AI to speak immediately - no user input needed
    # The greeting instruction is in the system prompt
    await session.generate_reply()
    
    logger.info("✅ Conversation active")


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("  🤖 AI RECEPTIONIST AGENT")
    logger.info("=" * 60)
    logger.info(f"  Backend: {BACKEND_URL}")
    logger.info("  Waiting for calls...")
    logger.info("=" * 60)
    
    cli.run_app(server)
