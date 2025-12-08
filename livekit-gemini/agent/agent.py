#!/usr/bin/env python3
import asyncio
import logging
import os
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
logger = logging.getLogger("dental-receptionist")

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
BUSINESS_ID = os.getenv("BUSINESS_ID")
STAFF_ID = os.getenv("STAFF_ID")

# Initialize backend client
backend = BackendClient(BACKEND_URL)

# Session storage
sessions = {}


class SessionData:
    def __init__(self):
        self.customer = None
        self.caller_phone = None
        self.available_slots = []


async def get_caller_phone(participant) -> str:
    """Extract phone number from participant identity or metadata"""
    # Try to get from participant identity
    identity = participant.identity
    
    # Common formats: "sip:+1234567890@..." or just "+1234567890"
    if identity.startswith("sip:"):
        phone = identity.split("@")[0].replace("sip:", "")
    else:
        phone = identity
    
    # Clean up the phone number
    phone = phone.strip().replace(" ", "")
    
    logger.info(f"Extracted caller phone: {phone}")
    return phone


async def handle_tool_call(session_data: SessionData, function_name: str, arguments: dict):
    """Handle Gemini function calls"""
    logger.info(f"Tool called: {function_name} with args: {arguments}")
    
    if function_name == "create_new_customer":
        # Create customer in backend
        customer = await backend.create_customer(
            business_id=BUSINESS_ID,
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
        # Get available slots
        start_date = arguments.get("start_date")
        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")
        
        end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=7)).strftime("%Y-%m-%d")
        
        slots = await backend.get_available_slots(
            staff_id=STAFF_ID,
            start_date=start_date,
            end_date=end_date
        )
        
        session_data.available_slots = slots
        
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
        # Book appointment
        if not session_data.customer:
            return {
                "success": False,
                "message": "I need to get your information first before booking."
            }
        
        appointment = await backend.book_appointment(
            business_id=BUSINESS_ID,
            customer_id=session_data.customer["id"],
            staff_id=STAFF_ID,
            appointment_date=arguments["appointment_date"],
            appointment_time=arguments["appointment_time"]
        )
        
        if appointment:
            # Format confirmation
            date_obj = datetime.strptime(arguments["appointment_date"], "%Y-%m-%d")
            formatted_date = date_obj.strftime("%A, %B %d")
            
            return {
                "success": True,
                "message": f"Perfect! I've booked your appointment for {formatted_date} at {arguments['appointment_time']}. You'll receive a confirmation email and a reminder call the day before."
            }
        else:
            return {
                "success": False,
                "message": "I'm sorry, that time slot is no longer available. Would you like to choose another time?"
            }
    
    return {"success": False, "message": "Unknown function"}


async def entrypoint(ctx: JobContext):
    logger.info(f"New call in room: {ctx.room.name}")
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()
    
    # Get caller phone number
    caller_phone = await get_caller_phone(participant)
    logger.info(f"Caller: {caller_phone}")
    
    # Create session data
    session_data = SessionData()
    session_data.caller_phone = caller_phone
    sessions[ctx.room.name] = session_data
    
    # Lookup customer in backend
    lookup_result = await backend.lookup_customer(caller_phone, BUSINESS_ID)
    
    if lookup_result["exists"]:
        session_data.customer = lookup_result["customer"]
        customer_name = session_data.customer["first_name"]
        logger.info(f"Existing customer: {customer_name}")
        
        system_instructions = f"""
You are Sarah, a friendly receptionist for Bright Smile Dental Clinic.

You are speaking with {customer_name} {session_data.customer['last_name']}, a returning customer.

Your tasks:
1. Greet them warmly by name
2. Ask how you can help them
3. If they want an appointment, use check_availability to show available times
4. Once they choose a time, use book_appointment to book it
5. Confirm the appointment clearly

Keep responses SHORT - this is a phone call.
Be warm and professional.
"""
        greeting = f"Hello {customer_name}! Thank you for calling Bright Smile Dental. How may I help you today?"
        
    else:
        logger.info("New customer")
        system_instructions = """
You are Sarah, a friendly receptionist for Bright Smile Dental Clinic.

This is a NEW customer calling for the first time.

Your tasks:
1. Welcome them warmly
2. Collect: first name, last name, and email (optional)
3. Use create_new_customer to save their info
4. Then ask how you can help
5. If they want an appointment, use check_availability and book_appointment

Keep responses SHORT - this is a phone call.
Be warm and welcoming.
"""
        greeting = "Hello! Thank you for calling Bright Smile Dental, this is Sarah speaking. I see this is your first time calling. May I get your name please?"
    
    # Create Agent with tools
    agent = Agent(
        instructions=system_instructions,
    )
    
    # Create Gemini model with function calling
    model = google_beta.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-09-2025",
        voice="Kore",
        temperature=0.8,
        tools=get_tools_declaration(),  # Enable function calling
    )
    
    # Create session
    session = AgentSession(
        llm=model,
        vad=ctx.proc.userdata.get("vad"),
    )
    
    # Handle function calls
    # Note: Function call handling API may vary by LiveKit Agents version
    # This implementation tries multiple approaches for compatibility
    async def process_function_call(function_call):
        """Process function calls from Gemini"""
        try:
            func_name = getattr(function_call, 'name', None) or getattr(function_call, 'function_name', None)
            func_args = getattr(function_call, 'arguments', None) or getattr(function_call, 'args', None) or {}
            
            logger.info(f"Function call received: {func_name} with args: {func_args}")
            
            result = await handle_tool_call(
                session_data,
                func_name,
                func_args
            )
            
            # Return result to Gemini
            if hasattr(function_call, 'create_response'):
                await function_call.create_response(result)
            elif hasattr(function_call, 'respond'):
                await function_call.respond(result)
            elif hasattr(function_call, 'return_result'):
                await function_call.return_result(result)
            else:
                logger.warning(f"Function call object type: {type(function_call)}, available methods: {dir(function_call)}")
        except Exception as e:
            logger.error(f"Error handling function call: {e}", exc_info=True)
            error_result = {
                "success": False,
                "message": "I encountered an error processing that request. Please try again."
            }
            try:
                if hasattr(function_call, 'create_response'):
                    await function_call.create_response(error_result)
                elif hasattr(function_call, 'respond'):
                    await function_call.respond(error_result)
            except:
                pass
    
    # Try to attach function call handler
    # The exact API depends on LiveKit Agents version
    handler_attached = False
    
    # Method 1: Try session.on() decorator-style
    try:
        if hasattr(session, "on") and callable(getattr(session, "on", None)):
            # Check if it's a decorator or regular method
            if hasattr(session.on, '__call__'):
                # Try as decorator
                try:
                    @session.on("function_call")
                    async def on_function_call(fc):
                        await process_function_call(fc)
                    handler_attached = True
                    logger.info("Attached function call handler via @session.on() decorator")
                except:
                    # Try as method call
                    session.on("function_call", process_function_call)
                    handler_attached = True
                    logger.info("Attached function call handler via session.on() method")
    except Exception as e:
        logger.debug(f"Method 1 (session.on) failed: {e}")
    
    # Method 2: Try model.on()
    if not handler_attached:
        try:
            if hasattr(model, "on") and callable(getattr(model, "on", None)):
                try:
                    @model.on("function_call")
                    async def on_function_call(fc):
                        await process_function_call(fc)
                    handler_attached = True
                    logger.info("Attached function call handler via @model.on() decorator")
                except:
                    model.on("function_call", process_function_call)
                    handler_attached = True
                    logger.info("Attached function call handler via model.on() method")
        except Exception as e:
            logger.debug(f"Method 2 (model.on) failed: {e}")
    
    if not handler_attached:
        logger.warning("Could not attach function call handler. Function calling may not work.")
        logger.info("Note: You may need to check LiveKit Agents documentation for the correct function calling API.")
    
    # Start session
    await session.start(agent=agent, room=ctx.room)
    
    logger.info("Agent session started")
    
    # Send greeting
    await asyncio.sleep(0.5)
    await session.generate_reply(instructions=f"Say: {greeting}")
    
    logger.info("Greeting sent")


def prewarm(proc: JobProcess):
    logger.info("Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD model ready")


if __name__ == "__main__":
    logger.info("Starting Dental Receptionist Agent...")
    
    # Validate configuration
    if not BUSINESS_ID:
        logger.error("BUSINESS_ID not set in .env!")
        exit(1)
    if not STAFF_ID:
        logger.error("STAFF_ID not set in .env!")
        exit(1)
    
    logger.info(f"Backend: {BACKEND_URL}")
    logger.info(f"Business ID: {BUSINESS_ID}")
    logger.info(f"Staff ID: {STAFF_ID}")
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            num_idle_processes=2,
        ),
    )
