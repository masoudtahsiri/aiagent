#!/usr/bin/env python3

"""Multi-tenant AI Receptionist Agent"""

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

from tools import get_tools_for_agent



load_dotenv()



logging.basicConfig(

    level=logging.INFO,

    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"

)

logger = logging.getLogger("multi-tenant-agent")



# Force use of GEMINI_API_KEY instead of GOOGLE_API_KEY
# Google SDK checks GOOGLE_API_KEY first, so we need to explicitly set it from GEMINI_API_KEY
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    os.environ["GOOGLE_API_KEY"] = gemini_key
    # Remove GOOGLE_API_KEY from env if it was set separately to avoid conflicts
    if "GOOGLE_API_KEY" in os.environ and os.environ.get("GOOGLE_API_KEY") != gemini_key:
        logger.warning("GOOGLE_API_KEY was set but will be overridden by GEMINI_API_KEY")



# Configuration

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")



# Initialize backend client

backend = BackendClient(BACKEND_URL)





class SessionData:

    """Stores session state for a call"""

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

        self.transcript_lines = []

        

        # Set default staff if only one

        staff = business_config.get("staff", [])

        if len(staff) == 1:

            self.default_staff_id = staff[0]["id"]





def extract_phone_from_identity(identity: str) -> str:

    """Extract phone number from SIP identity"""

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

    """Extract the number that was called from SIP participant attributes"""

    for participant in ctx.room.remote_participants.values():

        attrs = getattr(participant, 'attributes', {})

        

        if attrs and 'sip.trunkPhoneNumber' in attrs:

            called = attrs['sip.trunkPhoneNumber']

            if not called.startswith('+'):

                called = '+' + called

            logger.info(f"Called number: {called}")

            return called

    

    raise ValueError("Unable to extract called number from sip.trunkPhoneNumber")





def build_system_prompt(business_config: dict, customer: dict = None, ai_config: dict = None) -> str:

    """Build comprehensive system prompt with all business data"""

    business = business_config.get("business", {})

    business_name = business.get("business_name", "our business")

    

    # Base prompt

    if ai_config and ai_config.get("system_prompt"):

        customer_name = customer.get("first_name", "there") if customer else "there"

        base_prompt = ai_config["system_prompt"].format(

            business_name=business_name,

            customer_name=customer_name

        )

    else:

        base_prompt = f"You are a friendly receptionist for {business_name}. Help callers with appointments, questions, and information."

    

    # Add business info

    business_info = f"\n\n=== BUSINESS INFORMATION ===\nBusiness: {business_name}\n"

    if business.get("address"):

        business_info += f"Address: {business.get('address')}, {business.get('city', '')}, {business.get('state', '')} {business.get('zip_code', '')}\n"

    if business.get("phone_number"):

        business_info += f"Phone: {business.get('phone_number')}\n"

    if business.get("website"):

        business_info += f"Website: {business.get('website')}\n"

    

    # Add business hours

    hours = business_config.get("business_hours", [])

    if hours:

        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

        business_info += "\nBusiness Hours:\n"

        for h in hours:

            day = day_names[h["day_of_week"]]

            if h["is_open"]:

                business_info += f"- {day}: {h['open_time']} to {h['close_time']}\n"

            else:

                business_info += f"- {day}: Closed\n"

    

    # Add services

    services = business_config.get("services", [])

    if services:

        business_info += "\nServices Offered:\n"

        for svc in services:

            price_str = f"${svc['price']:.0f}" if svc.get("price") else "varies"

            business_info += f"- {svc['name']}: {price_str}, {svc['duration_minutes']} minutes\n"

    

    # Add staff

    staff = business_config.get("staff", [])

    if staff:

        business_info += "\nStaff Members:\n"

        for s in staff:

            business_info += f"- {s['name']} ({s.get('title', 'Staff')})"

            if s.get("specialty"):

                business_info += f" - {s['specialty']}"

            business_info += "\n"

    

    # Add FAQs

    faqs = business_config.get("knowledge_base", [])

    if faqs:

        business_info += "\nFrequently Asked Questions:\n"

        for faq in faqs[:10]:  # Limit to 10 FAQs

            business_info += f"Q: {faq['question']}\nA: {faq['answer']}\n\n"

    

    # Add customer context

    if customer:

        customer_info = f"""

=== CUSTOMER INFORMATION ===

This is a RETURNING customer. Their information:

- Name: {customer.get('first_name', '')} {customer.get('last_name', '')}

- Phone: {customer.get('phone', '')}

- Email: {customer.get('email', 'Not provided')}



IMPORTANT: Do NOT ask for their name or contact info - you already have it!

Address them by their first name: {customer.get('first_name', 'there')}

"""

        business_info += customer_info

    else:

        new_customer_info = """

=== NEW CUSTOMER ===

This is a NEW caller. Collect their information naturally during the conversation:

1. First Name

2. Last Name

3. Email (optional)



Then help them with their request. Use the create_new_customer tool to save their info.

"""

        business_info += new_customer_info

    

    return base_prompt + business_info





async def entrypoint(ctx: JobContext):

    """Main entry point for each call"""

    logger.info(f"========== NEW CALL ==========")

    logger.info(f"Room: {ctx.room.name}")

    

    call_start_time = datetime.utcnow()

    

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()

    

    # Extract phone numbers

    caller_phone = extract_phone_from_identity(participant.identity)

    called_number = extract_called_number(ctx)

    

    logger.info(f"Caller: {caller_phone}")

    logger.info(f"Called number: {called_number}")

    

    # Lookup business configuration

    try:

        business_config = await backend.lookup_business_by_phone(called_number)

    except Exception as e:

        logger.error(f"Failed to get business config: {e}")

        return

    

    business = business_config["business"]

    business_id = business["id"]

    business_name = business["business_name"]

    

    logger.info(f"Routing to business: {business_name} (ID: {business_id})")

    

    # Create session data

    session_data = SessionData(business_id, business_config)

    session_data.caller_phone = caller_phone

    session_data.call_start_time = call_start_time

    

    # Lookup customer

    lookup_result = await backend.lookup_customer(caller_phone, business_id)

    is_existing_customer = lookup_result.get("exists", False)

    

    if is_existing_customer:

        session_data.customer = lookup_result["customer"]

        customer_name = session_data.customer.get("first_name", "there")

        logger.info(f"Existing customer: {customer_name}")

    else:

        logger.info("New customer")

    

    # Get AI configuration

    ai_roles = business_config.get("ai_roles", [])

    ai_config = None

    for role in ai_roles:

        if role.get("role_type") == "receptionist" and role.get("is_enabled"):

            ai_config = role

            break

    

    if not ai_config and ai_roles:

        ai_config = ai_roles[0]

    

    # Log call start

    try:

        call_log = await backend.log_call_start(

            business_id=business_id,

            caller_phone=caller_phone,

            customer_id=session_data.customer["id"] if session_data.customer else None,

            role_id=ai_config["id"] if ai_config else None

        )

        if call_log:

            session_data.call_log_id = call_log["id"]

            logger.info(f"Call logged: {session_data.call_log_id}")

    except Exception as e:

        logger.warning(f"Failed to log call start: {e}")

    

    # Build system prompt with all business data

    system_instructions = build_system_prompt(

        business_config, 

        session_data.customer, 

        ai_config

    )

    

    # Determine voice and greeting

    voice = ai_config.get("voice_style", "Kore") if ai_config else "Kore"

    

    if ai_config and ai_config.get("greeting_message"):

        customer_name = session_data.customer.get("first_name", "there") if session_data.customer else "there"

        greeting = ai_config["greeting_message"].format(

            business_name=business_name,

            customer_name=customer_name

        )

    else:

        if is_existing_customer:

            greeting = f"Hello {session_data.customer.get('first_name', 'there')}! Thank you for calling {business_name}. How can I help you today?"

        else:

            greeting = f"Hello! Thank you for calling {business_name}. How can I help you today?"

    

    logger.info(f"Voice: {voice}, Existing Customer: {is_existing_customer}")

    

    # Create tools

    tools = get_tools_for_agent(session_data, backend, is_existing_customer=is_existing_customer)

    

    # Create Agent

    agent = Agent(

        instructions=system_instructions,

        tools=tools,

    )

    

    # Create Gemini model

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

    

    # Trigger greeting

    await asyncio.sleep(0.5)

    await session.generate_reply(instructions=f"Greet the caller by saying: {greeting}")

    logger.info(f"Greeting sent for {business_name}")

    

    # Wait for session to end (call to complete)

    # The session will automatically handle the conversation

    # When the call ends, we log it

    

    # Note: In production, you'd want to hook into session end events

    # For now, call logging happens when tools are used





def prewarm(proc: JobProcess):

    """Preload models"""

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

            agent_name="ai-receptionist",

        ),

    )
