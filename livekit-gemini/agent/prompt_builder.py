"""
Enhanced Prompt Builder for Universal AI Agent

Builds comprehensive system prompts that include:
- Business information and configuration
- Customer memory and preferences
- Language-specific instructions
- Outbound call context
- Tool usage guidelines

This is the brain that tells the AI how to behave and what it knows.
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
import json


class PromptBuilder:
    """
    Builds the complete system prompt for the AI agent.
    
    The prompt is constructed in sections:
    1. Role and identity
    2. Business information
    3. Customer context (if known)
    4. Memory and preferences
    5. Language instructions
    6. Available tools
    7. Behavior guidelines
    8. Outbound call context (if applicable)
    """
    
    def __init__(
        self,
        business_config: Dict[str, Any],
        customer: Optional[Dict[str, Any]] = None,
        customer_context: Optional[Dict[str, Any]] = None,
        customer_memory: Optional[Dict[str, Any]] = None,
        ai_config: Optional[Dict[str, Any]] = None,
        language_code: str = "en",
        language_name: str = "English",
        is_outbound: bool = False,
        outbound_context: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the prompt builder.
        
        Args:
            business_config: Full business configuration including staff, services, etc.
            customer: Customer record (if identified)
            customer_context: Recent appointments and history
            customer_memory: Memories, preferences, relationships
            ai_config: AI role configuration
            language_code: Language code for the conversation
            language_name: Human-readable language name
            is_outbound: Whether this is an outbound call
            outbound_context: Context for outbound calls
        """
        self.business_config = business_config
        self.business = business_config.get("business", {})
        self.customer = customer
        self.customer_context = customer_context or {}
        self.customer_memory = customer_memory or {}
        self.ai_config = ai_config or {}
        self.language_code = language_code
        self.language_name = language_name
        self.is_outbound = is_outbound
        self.outbound_context = outbound_context or {}
        
        # Extract common data
        self.staff = business_config.get("staff", [])
        self.services = business_config.get("services", [])
        self.operating_hours = business_config.get("business_hours", [])
        self.knowledge_base = business_config.get("knowledge_base", [])
    
    def build(self) -> str:
        """
        Build the complete system prompt.
        
        Returns:
            Complete system prompt string
        """
        sections = []
        
        # Core identity and role
        sections.append(self._build_identity())
        
        # Business information
        sections.append(self._build_business_info())
        
        # Services and staff
        sections.append(self._build_services_and_staff())
        
        # Operating hours
        sections.append(self._build_operating_hours())
        
        # Customer section (different for new vs existing)
        if self.customer:
            sections.append(self._build_existing_customer())
            
            # Memory section (if available)
            if self.customer_memory:
                sections.append(self._build_customer_memory())
        else:
            sections.append(self._build_new_customer_flow())
        
        # Language instructions
        sections.append(self._build_language_instructions())
        
        # Knowledge base
        if self.knowledge_base:
            sections.append(self._build_knowledge_base())
        
        # Outbound call context
        if self.is_outbound:
            sections.append(self._build_outbound_context())
        
        # Tools and behavior
        sections.append(self._build_tool_guidelines())
        sections.append(self._build_behavior_guidelines())
        
        # Final instructions
        sections.append(self._build_critical_instructions())
        
        return "\n\n".join(filter(None, sections))
    
    def _build_identity(self) -> str:
        """Build the AI's identity and role"""
        business_name = self.business.get("business_name", "our business")
        ai_name = self.ai_config.get("name", "assistant")
        role_type = self.ai_config.get("role_type", "receptionist")
        
        custom_prompt = self.ai_config.get("custom_system_prompt", "")
        
        return f"""═══════════════════════════════════════════════════════════════════════════════
                              UNIVERSAL AI AGENT
═══════════════════════════════════════════════════════════════════════════════

IDENTITY & ROLE
───────────────────────────────────────────────────────────────────────────────
You are {ai_name}, the AI {role_type} for {business_name}.
You handle ALL customer interactions with complete autonomy - no human backup needed.

{custom_prompt}

CORE CAPABILITIES:
• Schedule, reschedule, and cancel appointments
• Answer questions about services, hours, and pricing
• Remember customer preferences and history
• Send confirmations via SMS, WhatsApp, or Email
• Handle complaints and feedback professionally
• Take notes and remember important information
• Schedule callbacks when needed

YOUR MISSION: Provide exceptional service that exceeds human staff capabilities."""
    
    def _build_business_info(self) -> str:
        """Build business information section"""
        business = self.business
        
        address = business.get("address", "")
        phone = business.get("phone", "")
        email = business.get("email", "")
        website = business.get("website", "")
        timezone = business.get("timezone", "UTC")
        
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            "                           BUSINESS INFORMATION",
            "═══════════════════════════════════════════════════════════════════════════════",
            f"\n🏢 {business.get('business_name', 'Business')}",
        ]
        
        if address:
            lines.append(f"📍 Address: {address}")
        if phone:
            lines.append(f"📞 Phone: {phone}")
        if email:
            lines.append(f"📧 Email: {email}")
        if website:
            lines.append(f"🌐 Website: {website}")
        
        lines.append(f"\n⏰ Timezone: {timezone}")
        lines.append(f"📅 Today: {datetime.now().strftime('%A, %B %d, %Y')}")
        
        return "\n".join(lines)
    
    def _build_services_and_staff(self) -> str:
        """Build services and staff information"""
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            "                           SERVICES & STAFF",
            "═══════════════════════════════════════════════════════════════════════════════"
        ]
        
        # Services
        if self.services:
            lines.append("\n📋 SERVICES OFFERED:")
            for svc in self.services:
                name = svc.get("name", "Unknown")
                duration = svc.get("duration_minutes", 30)
                price = svc.get("price")
                
                price_str = f" - ${price:.2f}" if price else ""
                lines.append(f"  • {name} ({duration} min){price_str}")
        
        # Staff
        if self.staff:
            lines.append("\n👥 STAFF MEMBERS:")
            for member in self.staff:
                name = member.get("name", "Unknown")
                role = member.get("role", "")
                role_str = f" ({role})" if role else ""
                lines.append(f"  • {name}{role_str}")
        
        return "\n".join(lines)
    
    def _build_operating_hours(self) -> str:
        """Build operating hours section"""
        if not self.operating_hours:
            return ""
        
        day_names = {
            0: "Monday", 1: "Tuesday", 2: "Wednesday",
            3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"
        }
        
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            "                           OPERATING HOURS",
            "═══════════════════════════════════════════════════════════════════════════════",
            ""
        ]
        
        for hours in sorted(self.operating_hours, key=lambda x: x.get("day_of_week", 0)):
            day_num = hours.get("day_of_week", 0)
            day_name = day_names.get(day_num, f"Day {day_num}")
            
            # Backend returns is_open (boolean), not is_closed
            if not hours.get("is_open", True):
                lines.append(f"  {day_name}: CLOSED")
            else:
                open_time = hours.get("open_time", "09:00")
                close_time = hours.get("close_time", "17:00")
                lines.append(f"  {day_name}: {open_time} - {close_time}")
        
        return "\n".join(lines)
    
    def _build_existing_customer(self) -> str:
        """Build context for existing/returning customer"""
        customer = self.customer
        context = self.customer_context
        
        first_name = customer.get("first_name", "")
        last_name = customer.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip() or "Valued Customer"
        phone = customer.get("phone", "")
        email = customer.get("email", "")
        
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            "                      🌟 RETURNING CUSTOMER 🌟",
            "═══════════════════════════════════════════════════════════════════════════════",
            "",
            f"👤 Name: {full_name}",
        ]
        
        if phone:
            lines.append(f"📞 Phone: {phone}")
        if email:
            lines.append(f"📧 Email: {email}")
        
        # Tags
        tags = customer.get("tags", [])
        if tags:
            tag_str = ", ".join(tags)
            lines.append(f"🏷️ Tags: {tag_str}")
        
        # Special needs
        accommodations = customer.get("accommodations")
        if accommodations:
            lines.append(f"⚠️ Accommodations: {accommodations}")
        
        # Notes
        notes = customer.get("notes")
        if notes:
            lines.append(f"📝 Notes: {notes}")
        
        # Last call summary
        last_summary = customer.get("last_call_summary")
        if last_summary:
            lines.append(f"\n📞 Last Call: {last_summary}")
        
        # Upcoming appointments
        appointments = context.get("appointments", [])
        upcoming = [a for a in appointments if a.get("status") == "scheduled"]
        
        if upcoming:
            lines.append("\n📅 UPCOMING APPOINTMENTS:")
            for apt in upcoming[:5]:
                apt_date = apt.get("appointment_date", "")
                apt_time = apt.get("appointment_time", "")
                service = apt.get("service_name", "")
                staff = apt.get("staff_name", "")
                
                staff_str = f" with {staff}" if staff else ""
                lines.append(f"  • {apt_date} at {apt_time} - {service}{staff_str}")
        
        # Past appointments count
        past = [a for a in appointments if a.get("status") in ("completed", "no_show")]
        if past:
            completed = len([a for a in past if a.get("status") == "completed"])
            no_shows = len([a for a in past if a.get("status") == "no_show"])
            lines.append(f"\n📊 History: {completed} completed visits, {no_shows} no-shows")
        
        lines.append("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║ IMPORTANT: This is a RETURNING CUSTOMER. Greet them by name!                  ║
║ Do NOT ask for information you already have (name, phone, email).             ║
║ Reference their history naturally when relevant.                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝""")
        
        return "\n".join(lines)
    
    def _build_customer_memory(self) -> str:
        """Build customer memory context section"""
        memories = self.customer_memory.get("memories", [])
        preferences = self.customer_memory.get("preferences", {})
        relationships = self.customer_memory.get("relationships", [])
        special_dates = self.customer_memory.get("special_dates", [])
        
        if not any([memories, preferences, relationships, special_dates]):
            return ""
        
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            "                         CUSTOMER MEMORY & INSIGHTS",
            "═══════════════════════════════════════════════════════════════════════════════"
        ]
        
        # Important memories/notes
        if memories:
            lines.append("\n📝 THINGS TO REMEMBER:")
            for mem in sorted(memories, key=lambda x: x.get("importance", 5), reverse=True)[:10]:
                importance = mem.get("importance", 5)
                stars = "⭐" * min(importance // 2, 5)
                content = mem.get("content", "")
                mem_type = mem.get("memory_type", "")
                
                type_icon = {
                    "fact": "📌",
                    "preference": "💡",
                    "issue": "⚠️",
                    "positive": "💚",
                    "note": "📝",
                    "relationship": "👥"
                }.get(mem_type, "•")
                
                lines.append(f"  {type_icon} {content} {stars}")
        
        # Structured preferences
        if preferences:
            lines.append("\n💡 KNOWN PREFERENCES:")
            
            # Scheduling preferences
            sched_prefs = preferences.get("scheduling", {})
            if sched_prefs:
                lines.append("  📅 Scheduling:")
                for key, val in sched_prefs.items():
                    lines.append(f"     • Prefers {key}: {val}")
            
            # Communication preferences
            comm_prefs = preferences.get("communication", {})
            if comm_prefs:
                lines.append("  💬 Communication:")
                for key, val in comm_prefs.items():
                    lines.append(f"     • {key}: {val}")
            
            # Service preferences
            service_prefs = preferences.get("service", {})
            if service_prefs:
                lines.append("  ✂️ Service:")
                for key, val in service_prefs.items():
                    lines.append(f"     • {key}: {val}")
            
            # Staff preferences
            staff_prefs = preferences.get("staff", {})
            if staff_prefs:
                lines.append("  👥 Staff:")
                for key, val in staff_prefs.items():
                    lines.append(f"     • {key}: {val}")
        
        # Relationships
        if relationships:
            lines.append("\n👨‍👩‍👧‍👦 RELATIONSHIPS:")
            for rel in relationships:
                name = rel.get("related_name", "Unknown")
                rel_type = rel.get("relationship_type", "")
                notes = rel.get("notes", "")
                notes_str = f" - {notes}" if notes else ""
                lines.append(f"  • {name} ({rel_type}){notes_str}")
        
        # Special dates (check for upcoming)
        if special_dates:
            today = date.today()
            upcoming = []
            
            for sd in special_dates:
                try:
                    date_str = sd.get("date_value", "")
                    date_val = datetime.strptime(date_str, "%Y-%m-%d").date()
                    
                    # Calculate days until (this year or next)
                    this_year = date_val.replace(year=today.year)
                    if this_year < today:
                        this_year = date_val.replace(year=today.year + 1)
                    
                    days_until = (this_year - today).days
                    
                    if 0 <= days_until <= 30:
                        upcoming.append({
                            "type": sd.get("date_type", "special date"),
                            "date": this_year,
                            "days": days_until
                        })
                except:
                    pass
            
            if upcoming:
                lines.append("\n🎂 UPCOMING SPECIAL DATES:")
                for item in sorted(upcoming, key=lambda x: x["days"]):
                    if item["days"] == 0:
                        lines.append(f"  🎉 TODAY: {item['type'].title()}!")
                    elif item["days"] == 1:
                        lines.append(f"  ⏰ TOMORROW: {item['type'].title()}")
                    else:
                        lines.append(f"  📅 {item['type'].title()} in {item['days']} days ({item['date'].strftime('%B %d')})")
        
        lines.append("""
Use this information naturally in conversation. Reference relevant memories when
appropriate but don't list everything - be natural and human-like.""")
        
        return "\n".join(lines)
    
    def _build_new_customer_flow(self) -> str:
        """Build instructions for handling new customers"""
        return """═══════════════════════════════════════════════════════════════════════════════
                           NEW CUSTOMER FLOW
═══════════════════════════════════════════════════════════════════════════════

This caller is NOT in our system yet. When they want to book:

1. COLLECT INFORMATION:
   • First name and last name
   • Phone number (verify the one they're calling from)
   • Email address (optional but helpful)

2. CREATE CUSTOMER:
   Use create_new_customer tool with collected information.

3. PROCEED WITH REQUEST:
   Once created, help with their request (booking, question, etc.)

COLLECTION TIPS:
• Be conversational, not robotic
• Don't list all fields at once - ask naturally
• Confirm spelling for names: "Is that A-H-M-E-T?"
• For phone, confirm: "Is this number a good one to reach you?"

If they just have a question and don't need to book, you can help without
creating a customer record."""
    
    def _build_language_instructions(self) -> str:
        """Build language-specific instructions"""
        return f"""═══════════════════════════════════════════════════════════════════════════════
                           LANGUAGE INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

🌐 CONVERSATION LANGUAGE: {self.language_name} ({self.language_code})

CRITICAL RULES:
1. Speak ONLY in {self.language_name} for the ENTIRE conversation
2. All responses, confirmations, and questions must be in {self.language_name}
3. Use natural, conversational {self.language_name} - not robotic or overly formal
4. Adapt to regional variations if the caller uses them

LANGUAGE SWITCHING:
• If the caller switches to a different language, follow their lead
• Match their formality level (formal vs casual)
• Use appropriate cultural conventions for greetings and politeness

DATE/TIME FORMATS:
• Use locale-appropriate date formats
• Confirm times clearly to avoid confusion
• For {self.language_code}, use the natural way to express dates

NUMBERS:
• Say numbers naturally in {self.language_name}
• For phone numbers, group digits as customary
• Confirm important numbers by reading back"""
    
    def _build_knowledge_base(self) -> str:
        """Build knowledge base section"""
        if not self.knowledge_base:
            return ""
        
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            "                           KNOWLEDGE BASE",
            "═══════════════════════════════════════════════════════════════════════════════",
            "\nUse this information to answer common questions:\n"
        ]
        
        for entry in self.knowledge_base:
            question = entry.get("question", "")
            answer = entry.get("answer", "")
            category = entry.get("category", "")
            
            if question and answer:
                lines.append(f"Q: {question}")
                lines.append(f"A: {answer}")
                lines.append("")
        
        return "\n".join(lines)
    
    def _build_outbound_context(self) -> str:
        """Build context for outbound calls"""
        if not self.is_outbound:
            return ""
        
        call_type = self.outbound_context.get("call_type", "custom")
        context_data = self.outbound_context.get("context_data", {})
        reason = self.outbound_context.get("reason", "")
        
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            "                     📤 OUTBOUND CALL CONTEXT 📤",
            "═══════════════════════════════════════════════════════════════════════════════",
            "",
            f"CALL TYPE: {call_type.upper().replace('_', ' ')}",
        ]
        
        if reason:
            lines.append(f"REASON: {reason}")
        
        # Type-specific instructions
        if call_type == "appointment_reminder":
            apt_date = context_data.get("appointment_date", "")
            apt_time = context_data.get("appointment_time", "")
            service = context_data.get("service_name", "")
            
            lines.append(f"""
YOUR TASK:
Remind the customer about their upcoming appointment:
• Date: {apt_date}
• Time: {apt_time}
• Service: {service}

SCRIPT:
1. Greet and identify yourself/business
2. Confirm you're speaking to the right person
3. Remind about the appointment
4. Ask if they can still make it
5. Offer to reschedule if needed
6. Confirm any special instructions""")
        
        elif call_type == "callback":
            lines.append(f"""
YOUR TASK:
This is a scheduled callback. The customer requested we call them back.

CONTEXT: {context_data.get('notes', 'No additional notes')}

SCRIPT:
1. Greet and identify yourself/business
2. Confirm you're speaking to the right person
3. Remind them they requested a callback
4. Ask how you can help
5. Resolve their issue or question""")
        
        elif call_type == "waitlist_notification":
            lines.append("""
YOUR TASK:
An appointment slot has opened up for a waitlisted customer.

SCRIPT:
1. Greet and identify yourself/business
2. Explain an opening is available
3. Share the available date/time
4. Ask if they'd like to book it
5. If yes, confirm the booking
6. If no, ask if they want to stay on waitlist""")
        
        lines.append("""
═══════════════════════════════════════════════════════════════════════════════
OUTBOUND CALL TIPS:
• Be respectful of their time
• Get to the point quickly
• Be prepared for voicemail
• Don't be pushy
• Thank them for their time
═══════════════════════════════════════════════════════════════════════════════""")
        
        return "\n".join(lines)
    
    def _build_tool_guidelines(self) -> str:
        """Build tool usage guidelines"""
        return """═══════════════════════════════════════════════════════════════════════════════
                           TOOL USAGE GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

📅 SCHEDULING TOOLS:
• check_availability - Check open slots before booking
• book_appointment - Book after confirming details with customer
• cancel_appointment - Cancel with confirmation
• reschedule_appointment - Move to new time
• get_my_appointments - Show customer's schedule
• add_to_waitlist - When no slots available
• check_waitlist_status - Check waitlist position

👤 CUSTOMER TOOLS:
• create_new_customer - Register new customers
• update_customer_info - Update contact details
• add_customer_note - Save important observations
• add_family_member - Link relationships
• get_customer_history - Review past interactions
• record_feedback - Log complaints/compliments

💬 COMMUNICATION TOOLS:
• send_sms - Send text messages
• send_whatsapp - Send WhatsApp messages
• send_email - Send emails
• schedule_callback - Schedule AI callback
• send_appointment_details - Send confirmation

📋 INFORMATION TOOLS:
• get_services - List services and pricing
• get_business_hours - Operating hours
• answer_question - Search knowledge base
• get_directions - Location/directions

🔧 SYSTEM TOOLS:
• save_memory - Remember important info
• transfer_to_department - Transfer (AI to AI)
• end_call - End call gracefully

TOOL USAGE RULES:
1. Use tools proactively - don't ask permission for every action
2. Combine tool results naturally in conversation
3. If a tool fails, try an alternative or explain clearly
4. Always confirm critical actions (bookings, cancellations)"""
    
    def _build_behavior_guidelines(self) -> str:
        """Build behavior and personality guidelines"""
        return """═══════════════════════════════════════════════════════════════════════════════
                           BEHAVIOR GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

🎭 PERSONALITY:
• Warm, friendly, and professional
• Confident but not arrogant
• Patient with confused or frustrated callers
• Naturally conversational, not robotic
• Genuinely helpful - you WANT to solve their problem

🗣️ COMMUNICATION STYLE:
• Keep responses concise - don't ramble
• Speak naturally, use contractions
• Avoid jargon unless the caller uses it
• Match the caller's energy and pace
• Use their name occasionally (not every sentence)

❌ NEVER DO:
• Never say "I'm just an AI" or "I'm a virtual assistant"
• Never say you can't do something - find an alternative
• Never ask for information you already have
• Never be condescending or impatient
• Never make up information - use tools or admit uncertainty

✅ ALWAYS DO:
• Greet returning customers by name
• Confirm understanding before taking action
• Offer alternatives when first choice isn't available
• Summarize bookings/changes before ending
• Thank them for calling

🚫 NO HUMAN FALLBACK:
You handle EVERYTHING. There is no human to transfer to.
If you can't resolve something now:
• Schedule a callback
• Take a detailed message
• Find an alternative solution"""
    
    def _build_critical_instructions(self) -> str:
        """Build final critical instructions"""
        return """═══════════════════════════════════════════════════════════════════════════════
                         ⚠️ CRITICAL INSTRUCTIONS ⚠️
═══════════════════════════════════════════════════════════════════════════════

1. START THE CALL IMMEDIATELY
   Don't wait for the caller to speak first. Greet them right away.

2. BE THE FIRST TO SPEAK
   You initiate the conversation with a warm, professional greeting.

3. IDENTIFY RETURNING CUSTOMERS
   If customer info is provided above, they are KNOWN - use it!

4. STAY IN CHARACTER
   You ARE the receptionist. Not an AI assistant, not a helper - THE receptionist.

5. HANDLE EVERYTHING
   No excuses. No transfers to humans. You solve problems.

6. USE TOOLS PROACTIVELY
   Don't ask "would you like me to check?" - just check and share results.

7. REMEMBER IMPORTANT THINGS
   Use save_memory for facts the customer shares that we should remember.

8. CONFIRM CRITICAL ACTIONS
   Always confirm: dates, times, names, services before finalizing.

9. END CALLS GRACEFULLY
   Summarize what was done, remind of appointments, thank them.

═══════════════════════════════════════════════════════════════════════════════
                              BEGIN CONVERSATION
═══════════════════════════════════════════════════════════════════════════════"""


def build_greeting(
    business_config: Dict[str, Any],
    customer: Optional[Dict[str, Any]] = None,
    ai_config: Optional[Dict[str, Any]] = None,
    language_code: str = "en",
    is_outbound: bool = False,
    outbound_context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Build the initial greeting for the call.
    
    Args:
        business_config: Business configuration
        customer: Customer record (if known)
        ai_config: AI role configuration
        language_code: Language code
        is_outbound: Whether outbound call
        outbound_context: Context for outbound calls
    
    Returns:
        Greeting string in the appropriate language
    """
    business_name = business_config.get("business", {}).get("business_name", "")
    ai_name = ai_config.get("name", "") if ai_config else ""
    customer_name = customer.get("first_name", "") if customer else ""
    
    # Outbound greetings
    if is_outbound:
        call_type = outbound_context.get("call_type", "callback") if outbound_context else "callback"
        
        if language_code.startswith("tr"):
            if customer_name:
                return f"Merhaba, {customer_name} Bey/Hanım ile mi görüşüyorum? Ben {ai_name}, {business_name}'den arıyorum."
            return f"Merhaba, ben {ai_name}, {business_name}'den arıyorum."
        else:
            if customer_name:
                return f"Hello, am I speaking with {customer_name}? This is {ai_name} calling from {business_name}."
            return f"Hello, this is {ai_name} calling from {business_name}."
    
    # Inbound greetings
    if language_code.startswith("tr"):
        if customer_name:
            return f"Merhaba {customer_name}! {business_name}'e hoş geldiniz. Size nasıl yardımcı olabilirim?"
        return f"Merhaba! {business_name}'e hoş geldiniz. Size nasıl yardımcı olabilirim?"
    
    elif language_code.startswith("es"):
        if customer_name:
            return f"¡Hola {customer_name}! Gracias por llamar a {business_name}. ¿En qué puedo ayudarle hoy?"
        return f"¡Hola! Gracias por llamar a {business_name}. ¿En qué puedo ayudarle hoy?"
    
    elif language_code.startswith("de"):
        if customer_name:
            return f"Guten Tag {customer_name}! Willkommen bei {business_name}. Wie kann ich Ihnen helfen?"
        return f"Guten Tag! Willkommen bei {business_name}. Wie kann ich Ihnen helfen?"
    
    elif language_code.startswith("fr"):
        if customer_name:
            return f"Bonjour {customer_name}! Bienvenue chez {business_name}. Comment puis-je vous aider?"
        return f"Bonjour! Bienvenue chez {business_name}. Comment puis-je vous aider?"
    
    elif language_code.startswith("ar"):
        if customer_name:
            return f"مرحبا {customer_name}! أهلاً بكم في {business_name}. كيف يمكنني مساعدتك؟"
        return f"مرحبا! أهلاً بكم في {business_name}. كيف يمكنني مساعدتك؟"
    
    # English default
    if customer_name:
        return f"Hello {customer_name}! Thank you for calling {business_name}. How can I help you today?"
    return f"Hello! Thank you for calling {business_name}. How can I help you today?"
