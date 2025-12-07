#!/usr/bin/env python3
import asyncio
import logging
import os
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

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("dental-receptionist")

SYSTEM_INSTRUCTIONS = """
You are Sarah, a friendly receptionist for Bright Smile Dental Clinic.
Keep responses SHORT for phone conversation.
Always greet callers warmly when they call.
"""


async def entrypoint(ctx: JobContext):
    logger.info(f"New call in room: {ctx.room.name}")
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    
    logger.info(f"Caller connected: {participant.identity}")
    
    # Create the Agent with instructions
    agent = Agent(
        instructions=SYSTEM_INSTRUCTIONS,
    )
    
    # Create the Gemini realtime model
    model = google_beta.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice="Kore",
        temperature=0.8,
    )
    
    # Create session with the realtime model and VAD
    session = AgentSession(
        llm=model,  # Pass realtime model here
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # Start the session
    await session.start(agent=agent, room=ctx.room)
    
    logger.info("Agent session started")
    
    # Use generate_reply for realtime models (not say!)
    await asyncio.sleep(0.5)
    logger.info("Triggering greeting...")
    
    # This is the correct way to trigger speech with realtime models
    await session.generate_reply(
        instructions="Greet the caller warmly. Say: Hello, thank you for calling Bright Smile Dental Clinic, this is Sarah speaking. How may I help you today?"
    )
    
    logger.info("Greeting sent")


def prewarm(proc: JobProcess):
    logger.info("Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD model ready")


if __name__ == "__main__":
    logger.info("Starting Dental Receptionist Agent...")
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            num_idle_processes=2,
        ),
    )
