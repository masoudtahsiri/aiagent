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
)
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins.google import realtime
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
    
    # Create the Gemini realtime model with specific model name
    model = realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice="Kore",
        temperature=0.8,
    )
    
    # Create the Agent with LLM and instructions
    agent = Agent(
        instructions=SYSTEM_INSTRUCTIONS,
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # Create session and start
    session = AgentSession()
    result = await session.start(agent, room=ctx.room)
    
    logger.info("Agent session started")
    
    # Explicitly trigger greeting
    await asyncio.sleep(0.5)
    logger.info("Triggering greeting...")
    await agent.say("Hello, thank you for calling Bright Smile Dental Clinic, this is Sarah speaking. How may I help you today?", allow_interruptions=True)
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
