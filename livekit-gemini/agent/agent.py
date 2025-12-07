#!/usr/bin/env python3
"""
Bright Smile Dental Clinic - AI Receptionist
Powered by Gemini Live API via LiveKit
"""

import asyncio
import logging
import os
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
)
from livekit.plugins.google import beta as google_beta
from livekit.plugins import silero

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("dental-receptionist")

# Dental Clinic Receptionist Instructions
SYSTEM_INSTRUCTIONS = """
You are Sarah, a friendly and professional receptionist for "Bright Smile Dental Clinic".

## Clinic Information
- Name: Bright Smile Dental Clinic
- Hours: Monday-Friday 9:00 AM - 5:00 PM, Saturday 10:00 AM - 2:00 PM, Closed Sundays
- Location: 123 Dental Way, Springfield
- Emergency: Available during business hours

## Services and Pricing
- General Cleaning: $100
- Teeth Whitening: $300
- Root Canal: $800-1500 (consultation required)
- Dental X-Ray: $50
- Filling: $150-300
- Crown: $800-1200
- Emergency Visit: $150 (plus treatment)

## Available Appointments
When asked about appointments, offer these example slots:
- Tuesday at 10:00 AM
- Tuesday at 2:30 PM
- Wednesday at 9:00 AM
- Thursday at 11:00 AM
- Thursday at 3:00 PM
- Friday at 1:00 PM

## Your Capabilities
1. Schedule new appointments
2. Answer questions about services and pricing
3. Provide clinic hours and location
4. Take messages for Dr. Smith
5. Handle emergency inquiries

## Communication Style
- Keep responses SHORT and conversational (this is a phone call)
- Be warm, friendly, and professional
- Do not use bullet points or lists when speaking
- Confirm important details (dates, times, phone numbers)
- If unsure, offer to have Dr. Smith call them back

## Important Rules
- Never say you are an AI or assistant
- You ARE Sarah, the receptionist
- If asked something you do not know, say "Let me check with Dr. Smith and call you back"
- Always end scheduling calls by confirming: date, time, and asking for callback number
"""


async def entrypoint(ctx: JobContext):
    """
    Main entry point - called when a new call connects.
    """
    logger.info(f"New call in room: {ctx.room.name}")
    
    # Connect to the LiveKit room (audio only for phone calls)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # Wait for the caller to connect
    participant = await ctx.wait_for_participant()
    
    # Log caller info
    caller_id = participant.identity
    is_sip_call = participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
    
    logger.info(f"Caller connected: {caller_id}")
    logger.info(f"Is phone call: {is_sip_call}")
    
    # Initialize the Gemini Live agent
    agent = google_beta.RealtimeAgent(
        model="gemini-2.0-flash-exp",
        voice="Kore",  # Options: Puck, Charon, Kore, Fenrir, Aoede
        instructions=SYSTEM_INSTRUCTIONS,
        # Voice Activity Detection for natural turn-taking
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # Start the agent
    agent.start(ctx.room, participant)
    logger.info("Agent started")
    
    # Generate greeting after a brief pause
    await asyncio.sleep(0.5)
    
    await agent.generate_reply(
        instructions=(
            "Greet the caller warmly and professionally. Say something like: "
            "Hello, thank you for calling Bright Smile Dental Clinic, "
            "this is Sarah speaking. How may I help you today?"
        )
    )
    
    logger.info("Greeting sent, agent is now handling the call")


def prewarm(proc: JobProcess):
    """
    Prewarm function - loads models before calls come in.
    This reduces latency for the first response.
    """
    logger.info("Prewarming: Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD model loaded and ready")


if __name__ == "__main__":
    logger.info("Starting Dental Receptionist Agent...")
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            # Keep 2 idle processes ready for quick response
            num_idle_processes=2,
        ),
    )

