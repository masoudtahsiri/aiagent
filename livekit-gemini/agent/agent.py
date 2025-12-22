#!/usr/bin/env python3
"""
Universal AI Agent - Main Entry Point

This is the core agent that handles all voice interactions.
Features:
- Automatic language detection from phone prefix
- Persistent memory system integration
- 25+ tools for complete automation
- Inbound and outbound call handling
- Multi-language support (45+ languages)

Usage:
    python agent.py dev    # Development mode
    python agent.py start  # Production mode
"""

import os
import asyncio
import logging
import time
from datetime import datetime
from typing import Optional, Tuple
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    ConversationItemAddedEvent,
    JobContext,
    JobProcess,
    cli,
)
from livekit.agents.llm import function_tool
from livekit.plugins import google, silero
from google.genai import types  # For Gemini realtime configuration

from backend_client import BackendClient
from language_detector import detect_language, get_localized_greeting
from prompt_builder import PromptBuilder, build_greeting
from tools import get_tools_for_agent, set_tool_context

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("universal-ai-agent")

# Reduce noise from libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("livekit").setLevel(logging.WARNING)

# Initialize backend client
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
backend = BackendClient(BACKEND_URL)

# Agent server
from livekit.agents import AgentServer
server = AgentServer()


# ═══════════════════════════════════════════════════════════════════════════════
# LATENCY TRACKER - Measures timing through entire call flow
# ═══════════════════════════════════════════════════════════════════════════════

class LatencyTracker:
    """
    Tracks latency through the entire call flow:
    
    INBOUND PATH:
    Phone → SIP → LiveKit → Agent → Gemini → Backend → DB
    
    OUTBOUND PATH:  
    Gemini → Agent → LiveKit → SIP → Phone
    """
    
    def __init__(self, call_id: str = ""):
        self.call_id = call_id
        self.checkpoints: dict[str, float] = {}
        self.start_time = time.perf_counter()
        self._last_checkpoint = self.start_time
        
    def checkpoint(self, name: str, details: str = "") -> float:
        """
        Record a checkpoint and log the time since last checkpoint.
        Returns time in milliseconds since last checkpoint.
        """
        now = time.perf_counter()
        elapsed_total = (now - self.start_time) * 1000  # ms
        elapsed_since_last = (now - self._last_checkpoint) * 1000  # ms
        
        self.checkpoints[name] = now
        self._last_checkpoint = now
        
        # Format the log message
        detail_str = f" | {details}" if details else ""
        logger.info(f"⏱️ [{elapsed_total:7.1f}ms total | +{elapsed_since_last:6.1f}ms] {name}{detail_str}")
        
        return elapsed_since_last
    
    def measure(self, name: str):
        """
        Context manager to measure duration of a code block.
        Usage:
            with tracker.measure("Backend API call"):
                result = await backend.some_call()
        """
        return _LatencyMeasure(self, name)
    
    def summary(self) -> str:
        """Get a summary of all checkpoints."""
        if not self.checkpoints:
            return "No checkpoints recorded"
        
        lines = ["═══ LATENCY SUMMARY ═══"]
        prev_time = self.start_time
        for name, timestamp in self.checkpoints.items():
            delta = (timestamp - prev_time) * 1000
            total = (timestamp - self.start_time) * 1000
            lines.append(f"  {name}: +{delta:.1f}ms (total: {total:.1f}ms)")
            prev_time = timestamp
        
        total_time = (time.perf_counter() - self.start_time) * 1000
        lines.append(f"  ─────────────────────")
        lines.append(f"  TOTAL: {total_time:.1f}ms")
        return "\n".join(lines)


class _LatencyMeasure:
    """Context manager for measuring code block duration."""
    
    def __init__(self, tracker: LatencyTracker, name: str):
        self.tracker = tracker
        self.name = name
        self.start = None
        
    def __enter__(self):
        self.start = time.perf_counter()
        return self
    
    def __exit__(self, *args):
        elapsed = (time.perf_counter() - self.start) * 1000
        now = time.perf_counter()
        elapsed_total = (now - self.tracker.start_time) * 1000
        self.tracker.checkpoints[self.name] = now
        self.tracker._last_checkpoint = now
        logger.info(f"⏱️ [{elapsed_total:7.1f}ms total | +{elapsed:6.1f}ms] {self.name}")
        
    async def __aenter__(self):
        self.start = time.perf_counter()
        return self
    
    async def __aexit__(self, *args):
        elapsed = (time.perf_counter() - self.start) * 1000
        now = time.perf_counter()
        elapsed_total = (now - self.tracker.start_time) * 1000
        self.tracker.checkpoints[self.name] = now
        self.tracker._last_checkpoint = now
        logger.info(f"⏱️ [{elapsed_total:7.1f}ms total | +{elapsed:6.1f}ms] {self.name}")


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION DATA CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class SessionData:
    """
    Complete session state for a call.
    
    This object holds all context needed during the call:
    - Business configuration
    - Customer information and memory
    - Language settings
    - Call tracking
    - Outbound call context (if applicable)
    """
    
    def __init__(self, business_id: str, business_config: dict):
        # Business context
        self.business_id = business_id
        self.business_config = business_config
        
        # Customer data
        self.customer = None
        self.customer_memory = None  # Legacy
        self.long_term_memory = {}   # New consolidated long-term memory
        self.short_term_memory = {}  # New consolidated short-term memory
        self.caller_phone = None
        
        # Language settings
        self.detected_language = None
        self.language_code = "en"
        self.language_name = "English"
        
        # Call type
        self.is_outbound = False
        self.outbound_call_id = None
        self.outbound_context = None
        
        # Scheduling helpers
        self.available_slots = []
        self.default_staff_id = None
        
        # Call tracking
        self.call_log_id = None
        self.call_start_time = None
        self.call_outcome = "general_inquiry"
        self.current_role_id = None
        
        # Session references
        self.session = None
        self.room = None
        
        # Latency tracking
        self.latency_tracker = None
        self._user_speech_start = None  # Track when user starts speaking
        
        # Transcript collection
        self.transcript_lines = []
        
        # Set default staff if only one
        staff = business_config.get("staff", [])
        if len(staff) == 1:
            self.default_staff_id = staff[0]["id"]
    
    def add_to_transcript(self, speaker: str, text: str):
        """Add a line to the transcript."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.transcript_lines.append(f"[{timestamp}] {speaker}: {text}")
    
    def get_transcript(self) -> str:
        """Get the full transcript as a string."""
        return "\n".join(self.transcript_lines)


# N8N Webhook URL for post-call processing
N8N_CALL_ENDED_WEBHOOK = os.getenv(
    "N8N_CALL_ENDED_WEBHOOK",
    "https://n8n.algorityai.com/webhook/call-ended"
)


async def trigger_post_call_processing(session_data: SessionData):
    """
    Send call data to n8n for post-call memory processing.
    
    This triggers the workflow that:
    1. Analyzes the transcript with Gemini
    2. Extracts memories and preferences
    3. Saves them to the customer profile
    """
    import httpx
    
    if not session_data.customer:
        logger.info("⏭️ Skipping post-call processing - no customer associated")
        return
    
    transcript = session_data.get_transcript()
    if not transcript or len(transcript) < 50:
        logger.info("⏭️ Skipping post-call processing - transcript too short")
        return
    
    payload = {
        "call_log_id": session_data.call_log_id,
        "customer_id": session_data.customer.get("id"),
        "business_id": session_data.business_id,
        "transcript": transcript,
        "language": session_data.language_code,
        "is_outbound": session_data.is_outbound,
        "call_outcome": session_data.call_outcome
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                N8N_CALL_ENDED_WEBHOOK,
                json=payload
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Post-call processing triggered successfully")
            else:
                logger.warning(f"⚠️ Post-call webhook returned {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"❌ Failed to trigger post-call processing: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def extract_caller_phone(identity: str) -> str:
    """
    Extract phone number from SIP participant identity.
    
    SIP identities come in various formats:
    - sip:+905551234567@domain
    - sip_905551234567
    - +905551234567
    
    Args:
        identity: The participant identity string
    
    Returns:
        Normalized phone number with + prefix
    """
    if not identity:
        return ""
    
    # Remove sip: prefix
    if identity.startswith("sip:"):
        identity = identity.replace("sip:", "")
    
    # Handle sip_ format (common in LiveKit)
    if identity.startswith("sip_"):
        phone = "+" + identity.replace("sip_", "")
    else:
        # Extract phone from sip URI (before @)
        if "@" in identity:
            identity = identity.split("@")[0]
        phone = identity.strip()
    
    # Ensure + prefix
    if phone and not phone.startswith("+"):
        phone = "+" + phone
    
    # Clean up any remaining non-phone characters
    phone = "".join(c for c in phone if c.isdigit() or c == "+")
    
    return phone


def extract_called_number(ctx: JobContext) -> str:
    """
    Extract the number that was dialed (the business's AI number).
    
    Args:
        ctx: The job context from LiveKit
    
    Returns:
        The called number with + prefix
    
    Raises:
        ValueError: If called number cannot be determined
    """
    for participant in ctx.room.remote_participants.values():
        attrs = participant.attributes
        if attrs:
            # Try different attribute names
            for key in ['sip.trunkPhoneNumber', 'sip.calledNumber', 'calledNumber']:
                if key in attrs:
                    called = attrs[key]
                    if not called.startswith('+'):
                        called = '+' + called
                    return called
    
    # Try room metadata
    if ctx.room.metadata:
        try:
            import json
            metadata = json.loads(ctx.room.metadata)
            if 'calledNumber' in metadata:
                called = metadata['calledNumber']
                if not called.startswith('+'):
                    called = '+' + called
                return called
        except:
            pass
    
    raise ValueError("Could not extract called number from SIP attributes")


def is_outbound_call(ctx: JobContext) -> Tuple[bool, Optional[str]]:
    """
    Determine if this is an outbound call and extract the outbound call ID.
    
    Outbound calls have room names following the pattern:
    - outbound-{uuid}
    - out-{uuid}
    
    Args:
        ctx: The job context from LiveKit
    
    Returns:
        Tuple of (is_outbound, outbound_call_id)
    """
    room_name = ctx.room.name
    
    if room_name.startswith("outbound-"):
        outbound_id = room_name.replace("outbound-", "")
        return True, outbound_id
    
    if room_name.startswith("out-"):
        outbound_id = room_name.replace("out-", "")
        return True, outbound_id
    
    # Check room metadata for outbound flag
    if ctx.room.metadata:
        try:
            import json
            metadata = json.loads(ctx.room.metadata)
            if metadata.get("is_outbound"):
                return True, metadata.get("outbound_call_id")
        except:
            pass
    
    return False, None


# ═══════════════════════════════════════════════════════════════════════════════
# PREWARM - Load models before calls
# ═══════════════════════════════════════════════════════════════════════════════

def prewarm(proc: JobProcess):
    """
    Prewarm the agent process by loading models.
    Called once when the worker starts.
    """
    logger.info("🔄 Prewarming agent process...")
    
    # Load VAD model with PHONE-OPTIMIZED settings
    # These settings are tuned for SIP/phone audio quality
    logger.info("   Loading VAD model (phone-optimized)...")
    proc.userdata["vad"] = silero.VAD.load(
        # Lower threshold = more sensitive to speech (phone audio is often quieter)
        activation_threshold=0.35,
        
        # Wait longer before deciding speech ended (people pause mid-sentence)
        min_silence_duration=0.8,
        
        # Shorter minimum speech = detect short utterances like "yes", "no"
        min_speech_duration=0.05,
        
        # Include more audio before detected speech (catches word beginnings)
        prefix_padding_duration=0.4,
    )
    
    logger.info("✅ Agent process ready (VAD: threshold=0.35, silence=0.8s)")


server.setup_fnc = prewarm


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

@server.rtc_session(agent_name="universal-ai-agent")
async def entrypoint(ctx: JobContext):
    """
    Main entry point for all calls (inbound and outbound).
    
    This function:
    1. Determines call type (inbound vs outbound)
    2. Loads business configuration
    3. Detects language from phone prefix
    4. Loads customer and memory context
    5. Builds system prompt
    6. Creates and starts the AI agent
    """
    
    call_start = datetime.utcnow()
    
    # ═══════════════════════════════════════════════════════════════════════
    # LATENCY TRACKING - Initialize tracker for this call
    # ═══════════════════════════════════════════════════════════════════════
    tracker = LatencyTracker(call_id=ctx.room.name)
    
    # ─────────────────────────────────────────────────────────────────────────
    # LOGGING HEADER
    # ─────────────────────────────────────────────────────────────────────────
    
    logger.info("=" * 70)
    logger.info("🔔 INCOMING CALL - LATENCY TRACKING ENABLED")
    logger.info(f"   Room: {ctx.room.name}")
    logger.info(f"   Time: {call_start.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    logger.info("=" * 70)
    tracker.checkpoint("📞 CALL_RECEIVED", "SIP → LiveKit notification received")
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONNECT TO ROOM (LiveKit Server connection)
    # ─────────────────────────────────────────────────────────────────────────
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    tracker.checkpoint("🔌 ROOM_CONNECTED", "Agent connected to LiveKit room")
    
    participant = await ctx.wait_for_participant()
    tracker.checkpoint("👤 PARTICIPANT_JOINED", f"SIP participant: {participant.identity[:20]}...")
    
    logger.info(f"👤 Participant connected: {participant.identity}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # DETERMINE CALL TYPE
    # ─────────────────────────────────────────────────────────────────────────
    
    is_outbound, outbound_id = is_outbound_call(ctx)
    
    if is_outbound:
        # ═══════════════════════════════════════════════════════════════════
        # OUTBOUND CALL FLOW
        # ═══════════════════════════════════════════════════════════════════
        
        logger.info(f"📤 OUTBOUND CALL: {outbound_id}")
        
        # Load outbound call context
        async with tracker.measure("📡 API: get_outbound_call"):
            outbound_context = await backend.get_outbound_call(outbound_id)
        if not outbound_context:
            logger.error("❌ Outbound call context not found")
            return
        
        caller_phone = outbound_context.get("phone_number", "")
        business_id = outbound_context.get("business_id", "")
        customer_id = outbound_context.get("customer_id")
        
        # Load business configuration
        async with tracker.measure("📡 API: get_business_config"):
            business_config = await backend.get_business_config(business_id)
        if not business_config:
            logger.error("❌ Business configuration not found")
            return
        
    else:
        # ═══════════════════════════════════════════════════════════════════
        # INBOUND CALL FLOW
        # ═══════════════════════════════════════════════════════════════════
        
        logger.info("📥 INBOUND CALL")
        
        # Extract phone numbers
        caller_phone = extract_caller_phone(participant.identity)
        
        try:
            called_number = extract_called_number(ctx)
        except ValueError as e:
            logger.error(f"❌ {e}")
            return
        
        logger.info(f"📞 {caller_phone} → {called_number}")
        
        # Load business by called number (Backend API call)
        try:
            async with tracker.measure("📡 API: lookup_business_by_phone"):
                business_config = await backend.lookup_business_by_phone(called_number)
        except Exception as e:
            logger.error(f"❌ Failed to load business for {called_number}: {e}")
            return
        
        if not business_config:
            logger.error(f"❌ No business found for number: {called_number}")
            return
        
        outbound_context = None
        customer_id = None
    
    # ─────────────────────────────────────────────────────────────────────────
    # EXTRACT BUSINESS INFO
    # ─────────────────────────────────────────────────────────────────────────
    
    business = business_config.get("business", {})
    business_id = business.get("id", "")
    business_name = business.get("business_name", "Business")
    
    logger.info(f"🏢 Business: {business_name} ({business_id})")
    
    # Create session data
    session_data = SessionData(business_id, business_config)
    session_data.caller_phone = caller_phone
    session_data.call_start_time = call_start
    session_data.room = ctx.room
    session_data.is_outbound = is_outbound
    session_data.outbound_context = outbound_context
    session_data.outbound_call_id = outbound_id
    
    # ─────────────────────────────────────────────────────────────────────────
    # CUSTOMER LOOKUP & MEMORY (Backend API calls)
    # ─────────────────────────────────────────────────────────────────────────
    # OPTIMIZED: Use combined endpoint that returns customer + memory in ONE call
    # This eliminates one API round-trip (~230ms savings)
    
    # For outbound, we already know the customer
    if is_outbound and customer_id:
        async with tracker.measure("📡 API: get_customer_with_memory"):
            customer_data = await backend.get_customer_with_memory(customer_id, business_id)
        is_existing = bool(customer_data)
        if customer_data:
            session_data.customer = customer_data.get("customer")
            session_data.customer_memory = customer_data.get("memory")
            # Also load consolidated memory for outbound
            async with tracker.measure("📡 API: get_consolidated_memory"):
                consolidated = await backend.get_consolidated_memory(customer_id)
            if consolidated:
                session_data.long_term_memory = consolidated.get("long_term", {})
                session_data.short_term_memory = consolidated.get("short_term", {})
    else:
        # For inbound, use COMBINED lookup that returns customer + memory in one call
        async with tracker.measure("📡 API: lookup_customer_with_memory"):
            lookup_result = await backend.lookup_customer_with_memory(
                caller_phone, business_id
            )
        is_existing = lookup_result.get("exists", False)
        
        if is_existing:
            session_data.customer = lookup_result.get("customer")
            # Memory is already included in the response - no second API call needed!
            session_data.long_term_memory = lookup_result.get("long_term_memory", {})
            session_data.short_term_memory = lookup_result.get("short_term_memory", {})
    
    customer_name = ""
    if session_data.customer:
        customer_name = session_data.customer.get("first_name", "")
        logger.info(f"👤 Customer: {customer_name} {session_data.customer.get('last_name', '')} (ID: {session_data.customer.get('id', '')})")
    else:
        logger.info("👤 Customer: NEW (not in system)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # LANGUAGE DETECTION
    # ─────────────────────────────────────────────────────────────────────────
    
    tracker.checkpoint("🌐 LANGUAGE_DETECTION", "Detecting caller language")
    
    business_default_lang = business.get("default_language", "en")
    
    lang_info = detect_language(
        caller_phone=caller_phone,
        customer=session_data.customer,
        business_default=business_default_lang
    )
    
    session_data.detected_language = lang_info
    session_data.language_code = lang_info["code"]
    session_data.language_name = lang_info["name"]
    
    logger.info(f"🌐 Language: {lang_info['name']} ({lang_info['code']})")
    logger.info(f"   Source: {lang_info['source']}")
    logger.info(f"   Voice: {lang_info['voice']}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # LOAD AI CONFIGURATION
    # ─────────────────────────────────────────────────────────────────────────
    
    ai_roles = business_config.get("ai_roles", [])
    ai_config = None
    
    # For outbound calls, use specific role if specified
    if is_outbound and outbound_context:
        script_type = outbound_context.get("script_type", "receptionist")
        for role in ai_roles:
            if role.get("role_type") == script_type and role.get("is_enabled"):
                ai_config = role
                break
    
    # Default to receptionist role
    if not ai_config:
        for role in ai_roles:
            if role.get("role_type") == "receptionist" and role.get("is_enabled"):
                ai_config = role
                break
    
    # Fallback to first available role
    if not ai_config and ai_roles:
        for role in ai_roles:
            if role.get("is_enabled"):
                ai_config = role
                break
    
    if ai_config:
        session_data.current_role_id = ai_config.get("id")
        voice = ai_config.get("voice_style", lang_info.get("voice", "Kore"))
        logger.info(f"🤖 AI Role: {ai_config.get('name', 'Default')}")
    else:
        voice = lang_info.get("voice", "Kore")
        logger.info("🤖 AI Role: Default (no role configured)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # BUILD SYSTEM PROMPT
    # ─────────────────────────────────────────────────────────────────────────
    
    tracker.checkpoint("📝 PROMPT_BUILDING", "Building system prompt")
    
    prompt_builder = PromptBuilder(
        business_config=business_config,
        customer=session_data.customer,
        customer_context=session_data.customer_memory,
        customer_memory=session_data.customer_memory,
        long_term_memory=session_data.long_term_memory,
        short_term_memory=session_data.short_term_memory,
        ai_config=ai_config,
        language_code=session_data.language_code,
        language_name=session_data.language_name,
        is_outbound=is_outbound,
        outbound_context=outbound_context
    )
    
    system_prompt = prompt_builder.build()
    tracker.checkpoint("📝 PROMPT_BUILT", f"Prompt size: {len(system_prompt)} chars")
    
    # Build greeting
    greeting = build_greeting(
        business_config=business_config,
        customer=session_data.customer,
        ai_config=ai_config,
        language_code=session_data.language_code,
        is_outbound=is_outbound,
        outbound_context=outbound_context
    )
    
    # Add greeting instruction to prompt
    system_prompt = f"""{system_prompt}

═══════════════════════════════════════════════════════════════════════════════
                              START THE CALL
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Speak FIRST. Say this greeting IMMEDIATELY when the call connects:

"{greeting}"

Then wait for their response and continue naturally in {session_data.language_name}.
═══════════════════════════════════════════════════════════════════════════════"""
    
    logger.info(f"💬 Greeting: {greeting[:60]}...")
    
    # ─────────────────────────────────────────────────────────────────────────
    # LOG CALL START (Backend API - fire and forget, don't block)
    # ─────────────────────────────────────────────────────────────────────────
    
    try:
        async with tracker.measure("📡 API: log_call_start"):
            call_log = await backend.log_call_start(
                business_id=business_id,
                caller_phone=caller_phone,
                customer_id=session_data.customer.get("id") if session_data.customer else None,
                role_id=session_data.current_role_id,
                is_outbound=is_outbound,
                outbound_call_id=outbound_id,
                language_code=session_data.language_code,
                language_source=lang_info.get("source")
            )
        if call_log:
            session_data.call_log_id = call_log.get("id")
            logger.info(f"📝 Call logged: {session_data.call_log_id}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to log call start: {e}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # CREATE TOOLS
    # ─────────────────────────────────────────────────────────────────────────
    
    tracker.checkpoint("🔧 TOOLS_LOADING", "Initializing agent tools")
    
    tools = get_tools_for_agent(
        session_data=session_data,
        backend=backend,
        is_existing_customer=is_existing
    )
    
    logger.info(f"🔧 Tools loaded: {len(tools)} tools available")
    
    # ─────────────────────────────────────────────────────────────────────────
    # CREATE AGENT
    # ─────────────────────────────────────────────────────────────────────────
    
    tracker.checkpoint("🤖 AGENT_CREATION", "Creating AI agent")
    
    agent = Agent(
        instructions=system_prompt,
        tools=tools,
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # CREATE MODEL & SESSION
    # ─────────────────────────────────────────────────────────────────────────
    
    tracker.checkpoint("🧠 GEMINI_MODEL_INIT", "Initializing Gemini Realtime Model")
    
    # Configure Gemini Realtime Model with optimized settings for phone calls
    model = google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice=voice,
        temperature=0.6,  # Slightly lower = more consistent responses
        
        # Enable input audio transcription - helps debug what Gemini hears
        input_audio_transcription=types.AudioTranscriptionConfig(),
        
        # Enable output transcription for logging
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )
    
    tracker.checkpoint("🎙️ SESSION_INIT", "Creating AgentSession with phone-optimized timing")
    
    # Configure AgentSession with phone-optimized timing
    session = AgentSession(
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
        
        # ═══ TURN DETECTION & TIMING ═══
        # Wait a bit longer before deciding user stopped speaking
        # (phone calls have more natural pauses)
        min_endpointing_delay=0.6,  # Default was 0.5s
        
        # Maximum time to wait for user to continue speaking
        max_endpointing_delay=4.0,  # Default was 3.0s
        
        # ═══ INTERRUPTION HANDLING ═══
        # Allow interruptions (user can cut off AI mid-sentence)
        allow_interruptions=True,
        
        # User must speak at least 300ms to count as interruption
        # (prevents noise from interrupting AI)
        min_interruption_duration=0.3,  # Default was 0.5s
        
        # ═══ FALSE INTERRUPTION RECOVERY ═══
        # If user interrupts but says nothing, resume after 2.5s
        false_interruption_timeout=2.5,  # Default was 2.0s
        resume_false_interruption=True,
    )
    
    session_data.session = session
    
    # Store tracker in session_data for use in event handlers
    session_data.latency_tracker = tracker
    
    # ─────────────────────────────────────────────────────────────────────────
    # EVENT HANDLERS - Transcript Collection & Debug Logging
    # ─────────────────────────────────────────────────────────────────────────
    
    @session.on("conversation_item_added")
    def on_conversation_item_added(event: ConversationItemAddedEvent):
        """Capture conversation items (both user and agent) for transcript."""
        # Get the text content from the conversation item
        text_content = event.item.text_content if hasattr(event.item, 'text_content') else None
        
        if text_content:
            # Determine speaker based on role
            if event.item.role == "assistant" or event.item.role == "agent":
                speaker = "AI"
            elif event.item.role == "user":
                speaker = "Customer"
            else:
                speaker = event.item.role  # Fallback to role name
            
            session_data.add_to_transcript(speaker, text_content)
    
    # ═══ DEBUG: Log what the AI hears from user ═══
    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event):
        """Debug: Log what Gemini transcribed from user speech."""
        transcript = event.transcript if hasattr(event, 'transcript') else str(event)
        is_final = event.is_final if hasattr(event, 'is_final') else True
        
        if is_final:
            logger.info(f"🎤 USER SAID: \"{transcript}\"")
        else:
            logger.debug(f"🎤 [interim]: \"{transcript}\"")
    
    # ═══ DEBUG: Log speech detection events with timing ═══
    @session.on("user_state_changed")
    def on_user_state_changed(event):
        """Debug: Log when user starts/stops speaking with timing."""
        new_state = event.new_state if hasattr(event, 'new_state') else str(event)
        if new_state == "speaking":
            logger.info("🗣️ User started speaking")
            # Track when user starts speaking for response latency
            session_data._user_speech_start = time.perf_counter()
        elif new_state == "listening":
            speech_duration = 0
            if hasattr(session_data, '_user_speech_start') and session_data._user_speech_start:
                speech_duration = (time.perf_counter() - session_data._user_speech_start) * 1000
            logger.info(f"👂 User stopped speaking (duration: {speech_duration:.0f}ms)")
    
    # ═══ Track AI response latency ═══
    @session.on("agent_state_changed")
    def on_agent_state_changed(event):
        """Track when AI starts/stops speaking for latency measurement."""
        new_state = event.new_state if hasattr(event, 'new_state') else str(event)
        if new_state == "speaking":
            # Calculate time from user stopping to AI starting
            if hasattr(session_data, '_user_speech_start') and session_data._user_speech_start:
                response_latency = (time.perf_counter() - session_data._user_speech_start) * 1000
                logger.info(f"🤖 AI started speaking (response latency: {response_latency:.0f}ms)")
            else:
                logger.info("🤖 AI started speaking")
        elif new_state == "listening":
            logger.info("🤖 AI stopped speaking, listening...")
    
    # ─────────────────────────────────────────────────────────────────────────
    # ROOM EVENT HANDLERS - Call End
    # ─────────────────────────────────────────────────────────────────────────
    
    @ctx.room.on("disconnected")
    def on_room_disconnected():
        """Handle call end - log and trigger post-call processing."""
        async def _handle_disconnected():
            logger.info("")
            logger.info("═" * 70)
            logger.info("📞 CALL ENDED - Final Summary")
            logger.info("═" * 70)
            
            # Calculate call duration
            call_duration = None
            if session_data.call_start_time:
                call_duration = int((datetime.now() - session_data.call_start_time).total_seconds())
                logger.info(f"⏱️ Total call duration: {call_duration} seconds")
            
            # Get transcript
            transcript = session_data.get_transcript()
            logger.info(f"📝 Transcript length: {len(transcript)} chars")
            
            # Log call end to backend (includes transcript)
            try:
                log_start = time.perf_counter()
                await backend.log_call_end(
                    call_log_id=session_data.call_log_id,
                    duration=call_duration,
                    outcome=session_data.call_outcome,
                    transcript=transcript,
                    summary=None,  # Will be filled by n8n
                    sentiment=None  # Will be filled by n8n
                )
                log_time = (time.perf_counter() - log_start) * 1000
                logger.info(f"✅ Call logged to backend ({log_time:.0f}ms)")
            except Exception as e:
                logger.warning(f"⚠️ Failed to log call end: {e}")
            
            logger.info("═" * 70)
            logger.info("✅ Call cleanup complete")
            logger.info("═" * 70)
        
        asyncio.create_task(_handle_disconnected())
    
    @ctx.room.on("participant_disconnected")
    def on_participant_left(participant):
        """Handle when customer hangs up."""
        async def _handle_participant_left():
            if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
                logger.info(f"📱 Customer disconnected: {participant.identity}")
        
        asyncio.create_task(_handle_participant_left())
    
    # ─────────────────────────────────────────────────────────────────────────
    # START SESSION (Connect to Gemini API)
    # ─────────────────────────────────────────────────────────────────────────
    
    logger.info("🚀 Starting AI session...")
    tracker.checkpoint("🚀 SESSION_STARTING", "Connecting to Gemini Realtime API")
    
    await session.start(
        agent=agent,
        room=ctx.room,
    )
    
    tracker.checkpoint("✅ SESSION_CONNECTED", "Gemini session active")
    logger.info(f"✅ Session active | Voice: {voice} | Language: {session_data.language_name}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # INITIATE CONVERSATION (First AI speech)
    # ─────────────────────────────────────────────────────────────────────────
    
    tracker.checkpoint("💬 GENERATING_GREETING", "Requesting first AI response")
    
    # Tell the AI to start speaking
    await session.generate_reply()
    
    tracker.checkpoint("🔊 FIRST_AUDIO_SENT", "AI greeting audio sent to LiveKit")
    
    # Log the full setup latency summary
    logger.info("")
    logger.info("═" * 70)
    logger.info("                    CALL SETUP COMPLETE - LATENCY SUMMARY")
    logger.info("═" * 70)
    logger.info(tracker.summary())
    logger.info("═" * 70)
    logger.info("")
    
    logger.info("✅ Conversation started - AI is speaking")
    
    # The session will continue until the call ends
    # LiveKit handles the audio streaming automatically


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    logger.info("")
    logger.info("=" * 70)
    logger.info("  🤖 UNIVERSAL AI AGENT")
    logger.info("  Powered by Gemini Live + LiveKit")
    logger.info("=" * 70)
    logger.info("")
    
    cli.run_app(server)
