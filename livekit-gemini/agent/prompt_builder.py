"""
Prompt Builder - Optimized for Robust Tool Calling

Key Improvements:
1. Explicit tool calling rules with examples
2. "Hold on" phrases for async operations  
3. Strong anti-hallucination constraints
4. Chain-of-thought style tool selection guidance
5. Clear data collection flows
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional


# Pre-computed constants
_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
_DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


class PromptBuilder:
    """Builds highly-optimized system prompts for reliable tool calling"""
    
    def __init__(
        self, 
        business_config: Dict, 
        customer: Optional[Dict] = None, 
        customer_context: Optional[Dict] = None,
        ai_config: Optional[Dict] = None
    ):
        self.business = business_config.get("business", {})
        self.staff = business_config.get("staff", [])
        self.services = business_config.get("services", [])
        self.hours = business_config.get("business_hours", [])
        self.closures = business_config.get("business_closures", [])
        self.knowledge = business_config.get("knowledge_base", [])
        self.customer = customer
        self.customer_context = customer_context
        self.ai_config = ai_config or {}
        
        # Build lookups once
        self._service_map = {s["id"]: s for s in self.services}
        self._staff_map = {s["id"]: s for s in self.staff}
    
    def build(self) -> str:
        """Build the complete system prompt with robust tool calling"""
        sections = [
            self._build_identity(),
            self._build_business_compact(),
            self._build_hours_compact(),
            self._build_team_compact(),
            self._build_services_compact(),
            self._build_caller(),
            self._build_tool_calling_rules(),  # NEW: Explicit tool calling section
            self._build_conversation_flow(),   # NEW: Conversation flow guidance
            self._build_critical_rules(),      # Enhanced rules
        ]
        
        # Only add knowledge if it exists
        if self.knowledge:
            sections.insert(-3, self._build_knowledge_compact())
        
        # Only add closures if upcoming
        closures = self._build_closures_compact()
        if closures:
            sections.insert(3, closures)
        
        return "\n\n".join(s for s in sections if s)
    
    # =========================================================================
    # IDENTITY SECTION
    # =========================================================================
    
    def _build_identity(self) -> str:
        """Build AI identity with clear role definition"""
        name = self.ai_config.get("ai_name", "Assistant")
        biz_name = self.business.get("business_name", "the business")
        
        now = datetime.now()
        current_date = now.strftime("%A, %B %d, %Y")
        current_time = now.strftime("%I:%M %p")
        
        custom = self.ai_config.get("system_prompt", "")
        if custom and "{" not in custom:
            return custom
        
        return f"""You are {name}, the AI receptionist at {biz_name}.

CURRENT DATE/TIME: {current_date}, {current_time}
This is crucial for scheduling - always use this as "today".

YOUR ROLE:
- Answer phone calls professionally
- Help callers book, reschedule, or cancel appointments
- Answer questions about the business
- Collect information from new customers

COMMUNICATION STYLE:
- Speak naturally as if on a phone call
- Keep responses SHORT (1-2 sentences typically)
- Be warm, professional, and efficient
- Never use markdown, bullets, or formatting - this is VOICE
- Speak dates and times naturally (e.g., "Tuesday at 2 PM" not "2025-01-15 at 14:00")"""
    
    # =========================================================================
    # NEW: EXPLICIT TOOL CALLING RULES
    # =========================================================================
    
    def _build_tool_calling_rules(self) -> str:
        """Build explicit tool calling rules - this is critical for reliability"""
        return """
═══════════════════════════════════════════════════════════════════════════════
                         MANDATORY TOOL CALLING RULES
═══════════════════════════════════════════════════════════════════════════════

YOU MUST USE TOOLS. Never answer from memory or make assumptions about availability, appointments, or bookings.

┌─────────────────────────────────────────────────────────────────────────────┐
│ BEFORE YOU ANSWER ANYTHING ABOUT AVAILABILITY:                              │
│ → You MUST call check_availability first                                    │
│ → Say "Let me check what we have available" while the tool runs            │
│ → NEVER say "we have openings" or times without calling the tool first     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TO ACTUALLY BOOK AN APPOINTMENT:                                            │
│ → You MUST call book_appointment                                            │
│ → Say "Let me book that for you" while the tool runs                       │
│ → Confirm details BEFORE calling: date, time, provider                      │
│ → NEVER say "you're booked" without calling the tool                       │
│ → If tool fails, offer alternatives - don't pretend it worked              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TO CANCEL AN APPOINTMENT:                                                   │
│ → You MUST call cancel_appointment                                          │
│ → Say "Let me cancel that for you" while the tool runs                     │
│ → NEVER say "it's cancelled" without calling the tool                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TO RESCHEDULE AN APPOINTMENT:                                               │
│ → First call check_availability to find new times                          │
│ → Then call reschedule_appointment with confirmed new date/time            │
│ → Say "Let me check for available times" then "Let me reschedule that"    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FOR NEW CUSTOMERS:                                                          │
│ → Collect ALL required info: first name, last name, DOB, address, city,   │
│   email                                                                     │
│ → Call create_new_customer IMMEDIATELY after collecting all info           │
│ → Say "Let me save your information" while the tool runs                   │
│ → Do NOT proceed to booking until customer is saved                        │
└─────────────────────────────────────────────────────────────────────────────┘

HOLD PHRASES - Say these while tools are running:
- "One moment while I check that for you..."
- "Let me look into that..."
- "Bear with me while I check our schedule..."
- "Just a moment while I pull that up..."
- "Let me see what we have available..."

CRITICAL ANTI-HALLUCINATION RULES:
1. If you haven't called a tool, you DON'T KNOW the answer
2. If check_availability hasn't run, you don't know what's available
3. If book_appointment hasn't run, nothing is booked
4. If cancel_appointment hasn't run, nothing is cancelled
5. ALWAYS verify tool success before confirming to caller"""
    
    # =========================================================================
    # NEW: CONVERSATION FLOW GUIDANCE
    # =========================================================================
    
    def _build_conversation_flow(self) -> str:
        """Build conversation flow examples"""
        is_new = self.customer is None
        
        if is_new:
            return """
CONVERSATION FLOW FOR NEW CUSTOMERS:

1. GREETING → You say the greeting
2. CUSTOMER STATES NEED → Listen to what they want
3. COLLECT INFO → Before doing ANYTHING else, you must collect:
   - "May I have your first name?"
   - "And your last name?"
   - "Your date of birth?"
   - "What's your address?"
   - "And which city?"
   - "Finally, your email address?"
   
   Be conversational, not robotic. Example:
   "I'd be happy to help with that! Since this is your first time calling, 
    let me get a few details. What's your first name?"
   
4. SAVE CUSTOMER → Call create_new_customer tool
   Say: "Perfect, let me save your information..."
   
5. PROCEED WITH REQUEST → Now help with their original need
   - If booking: call check_availability, then book_appointment
   - If question: answer or call answer_question tool

EXAMPLE FLOW:
Caller: "Hi, I'd like to book an appointment"
You: "I'd be happy to help you book an appointment! Since this is your first time 
      calling, let me get a few details. What's your first name?"
Caller: "John"
You: "Thanks John! And your last name?"
Caller: "Smith"
You: "Got it. And your date of birth?"
... continue until all 6 fields collected ...
You: "Perfect, let me save your information..."
[CALL create_new_customer TOOL]
You: "Great, you're all set in our system! Now, let me check our availability. 
      Did you have a particular day in mind?"
... continue with booking flow ..."""
        else:
            customer_name = self.customer.get("last_name", "")
            return f"""
CONVERSATION FLOW FOR RETURNING CUSTOMERS:

You already know this customer. Their info is loaded.
Address them as Mr. or Mrs. {customer_name}.

1. GREETING → You say the personalized greeting with their name
2. LISTEN → Customer states their need
3. HELP IMMEDIATELY → No need to collect info

COMMON SCENARIOS:

Booking:
Caller: "I need to schedule an appointment"
You: "Of course! Let me check what we have available. Did you have a day in mind?"
[CALL check_availability]
... offer times from tool result ...
[CALL book_appointment when they confirm]

Cancelling:
Caller: "I need to cancel my appointment"
You: "I can help with that. Let me pull up your appointments..."
[CALL get_my_appointments to see what they have]
You: "I see you have an appointment on [date]. Is that the one you'd like to cancel?"
[CALL cancel_appointment when confirmed]

Rescheduling:
Caller: "I need to reschedule"
You: "No problem! Let me see your current appointments and what else is available..."
[CALL get_my_appointments to see current]
[CALL check_availability for new options]
... confirm new date/time ...
[CALL reschedule_appointment]

Questions:
Caller: "What are your hours?"
[CALL get_business_hours] OR answer from your knowledge if simple
You: "We're open Monday through Friday, 9 AM to 5 PM..."

DO NOT ask for: name, phone, email, address - you already have all of this."""
    
    # =========================================================================
    # BUSINESS INFO SECTIONS (Optimized from original)
    # =========================================================================
    
    def _build_business_compact(self) -> str:
        """Build business info"""
        b = self.business
        parts = [f"BUSINESS: {b.get('business_name', '')}"]
        
        if b.get("industry"):
            parts.append(f"Industry: {b['industry']}")
        
        addr_parts = [b.get("address"), b.get("city"), b.get("state"), b.get("zip_code")]
        addr = ", ".join(p for p in addr_parts if p)
        if addr:
            parts.append(f"Location: {addr}")
        
        if b.get("phone_number"):
            parts.append(f"Phone: {b['phone_number']}")
        if b.get("website"):
            parts.append(f"Website: {b['website']}")
        
        return "\n".join(parts)
    
    def _build_hours_compact(self) -> str:
        """Build hours"""
        if not self.hours:
            return ""
        
        open_days = []
        closed_days = []
        
        for h in sorted(self.hours, key=lambda x: x.get("day_of_week", 0)):
            day = _DAYS_FULL[h.get("day_of_week", 0)]
            if h.get("is_open"):
                t1 = self._fmt_time_speech(h.get("open_time", ""))
                t2 = self._fmt_time_speech(h.get("close_time", ""))
                open_days.append(f"{day}: {t1} to {t2}")
            else:
                closed_days.append(day)
        
        result = "BUSINESS HOURS:\n" + "\n".join(open_days)
        if closed_days:
            result += f"\nClosed: {', '.join(closed_days)}"
        
        return result
    
    def _build_closures_compact(self) -> str:
        """Build closures - only if upcoming"""
        if not self.closures:
            return ""
        
        today = datetime.now().date()
        max_date = today + timedelta(days=30)
        
        upcoming = []
        for c in self.closures:
            try:
                d = datetime.strptime(c["date"], "%Y-%m-%d").date()
                if today <= d <= max_date:
                    upcoming.append(f"{self._format_date_speech(c['date'])}: {c.get('reason', 'Closed')}")
            except (ValueError, KeyError):
                continue
        
        if not upcoming:
            return ""
        
        lines = ["UPCOMING CLOSURES:"]
        for c in upcoming[:5]:
            lines.append(f"- {c}")
        lines.append("→ When these dates are requested, explain why unavailable and offer alternatives.")
        
        return "\n".join(lines)
    
    def _build_team_compact(self) -> str:
        """Build staff info with availability"""
        if not self.staff:
            return ""
        
        lines = ["STAFF/PROVIDERS:"]
        
        for s in self.staff:
            line = f"• {s.get('name', '')}"
            if s.get("title"):
                line += f" ({s['title']})"
            
            service_ids = s.get("service_ids", [])
            if service_ids:
                svc_names = [self._service_map[sid]["name"] 
                            for sid in service_ids if sid in self._service_map]
                if svc_names:
                    line += f" - Services: {', '.join(svc_names[:3])}"
            elif s.get("specialty"):
                line += f" - {s['specialty']}"
            
            schedule = s.get("availability_schedule", [])
            if schedule:
                schedule_parts = []
                for avail in schedule:
                    day_idx = avail.get("day_of_week", 0)
                    day = _DAYS[day_idx]
                    start = self._fmt_time_speech(avail.get("start_time", ""))
                    end = self._fmt_time_speech(avail.get("end_time", ""))
                    schedule_parts.append(f"{day} {start}-{end}")
                if schedule_parts:
                    line += f" | Schedule: {', '.join(schedule_parts)}"
            
            lines.append(line)
            
            exceptions = s.get("availability_exceptions", [])
            if exceptions:
                exc_notes = []
                for exc in exceptions:
                    if exc.get("type") == "closed":
                        exc_date = self._format_date_speech(exc.get("date", ""))
                        exc_reason = exc.get("reason", "Unavailable")
                        exc_notes.append(f"{exc_date}: {exc_reason}")
                if exc_notes:
                    lines.append(f"  ⚠️ Time off: {'; '.join(exc_notes)}")
        
        return "\n".join(lines)
    
    def _build_services_compact(self) -> str:
        """Build services list"""
        if not self.services:
            return ""
        
        by_category = {}
        for svc in self.services:
            cat = svc.get("category", "General")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(svc)
        
        lines = ["SERVICES OFFERED:"]
        for category, services in by_category.items():
            if len(by_category) > 1:
                lines.append(f"  {category}:")
            
            for svc in services[:8]:
                name = svc.get("name", "")
                dur = svc.get("duration_minutes", 30)
                price = svc.get("price")
                
                if price:
                    lines.append(f"  - {name}: ${price:.0f}, {dur} minutes")
                else:
                    lines.append(f"  - {name}: {dur} minutes")
        
        return "\n".join(lines)
    
    def _build_knowledge_compact(self) -> str:
        """Build FAQ section"""
        if not self.knowledge:
            return ""
        
        lines = ["FREQUENTLY ASKED QUESTIONS:"]
        for faq in self.knowledge[:10]:
            q = faq.get("question", "")
            a = faq.get("answer", "")
            if q and a:
                if len(a) > 250:
                    a = a[:247] + "..."
                lines.append(f"Q: {q}")
                lines.append(f"A: {a}")
                lines.append("")
        
        return "\n".join(lines)
    
    # =========================================================================
    # CALLER CONTEXT
    # =========================================================================
    
    def _build_caller(self) -> str:
        """Build caller context"""
        if self.customer:
            return self._build_existing_customer()
        return self._build_new_customer()
    
    def _build_existing_customer(self) -> str:
        """Build returning customer context"""
        c = self.customer
        ctx = self.customer_context or {}
        
        first_name = c.get("first_name", "")
        last_name = c.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip() or "Customer"
        
        lines = [
            "═══════════════════════════════════════════════════════════════════════════════",
            f"                    CALLER: {full_name.upper()} (RETURNING CUSTOMER)",
            "═══════════════════════════════════════════════════════════════════════════════"
        ]
        
        lines.append("\nCONTACT INFORMATION ON FILE (DO NOT ASK FOR THESE):")
        if c.get("phone"):
            lines.append(f"  📞 Phone: {c['phone']}")
        if c.get("email"):
            lines.append(f"  ✉️ Email: {c['email']}")
        if c.get("address"):
            addr_parts = [c.get("address"), c.get("city"), c.get("state"), c.get("zip_code")]
            address = ", ".join(p for p in addr_parts if p)
            if address:
                lines.append(f"  🏠 Address: {address}")
        if c.get("date_of_birth"):
            lines.append(f"  🎂 Date of birth: {c['date_of_birth']}")
        
        # Preferences
        if c.get("preferred_contact_method") and c.get("preferred_contact_method") != "any":
            lines.append(f"  Prefers: {c['preferred_contact_method']} contact")
        
        # IMPORTANT: Accommodations
        if c.get("accommodations"):
            lines.append("")
            lines.append(f"⚠️ ACCOMMODATIONS NEEDED: {c['accommodations']}")
            lines.append("  → Be mindful of this throughout the conversation")
        
        # Preferred staff
        if c.get("preferred_staff_id") and c["preferred_staff_id"] in self._staff_map:
            pref = self._staff_map[c["preferred_staff_id"]]
            lines.append(f"  Preferred provider: {pref.get('name', '')}")
        
        # History summary
        lines.append("\nCUSTOMER HISTORY:")
        if c.get("customer_since"):
            try:
                since = datetime.fromisoformat(c["customer_since"].replace("Z", "+00:00"))
                tenure = (datetime.now(since.tzinfo) - since).days // 365
                if tenure >= 1:
                    lines.append(f"  Customer for {tenure} year(s)")
            except:
                pass
        
        if c.get("total_appointments"):
            lines.append(f"  Total visits: {c['total_appointments']}")
        if c.get("last_visit_date"):
            lines.append(f"  Last visit: {c['last_visit_date']}")
        
        # Tags
        tags = ctx.get("tags", [])
        if tags:
            lines.append(f"  Tags: {', '.join(tags)}")
        
        # Recent appointments
        recent = ctx.get("recent_appointments", [])
        if recent:
            lines.append("\nRECENT APPOINTMENTS:")
            for apt in recent[:5]:
                date = apt.get("date", "")
                status = apt.get("status", "")
                staff_name = apt.get("staff_name", "")
                service_name = apt.get("service_name", "")
                
                apt_desc = f"  {date}: {status}"
                if service_name:
                    apt_desc += f" - {service_name}"
                if staff_name:
                    apt_desc += f" with {staff_name}"
                lines.append(apt_desc)
        
        # No-show warning
        stats = ctx.get("stats", {})
        if stats.get("recent_no_shows", 0) >= 2:
            lines.append(f"\n⚠️ NOTE: {stats['recent_no_shows']} recent no-shows")
        
        # Notes
        if c.get("notes"):
            lines.append(f"\nNOTES: {c['notes']}")
        
        # Clear instructions
        lines.append("\n" + "─" * 50)
        lines.append(f"ADDRESS AS: Mr. or Mrs. {last_name}")
        lines.append("DO NOT ASK FOR: name, phone, email, address, DOB")
        lines.append("If they want to update info, use update_customer_info tool")
        
        return "\n".join(lines)
    
    def _build_new_customer(self) -> str:
        """Build new customer context with clear data collection requirements"""
        return """
═══════════════════════════════════════════════════════════════════════════════
                         CALLER: NEW CUSTOMER (FIRST TIME)
═══════════════════════════════════════════════════════════════════════════════

This caller is NOT in our system. You MUST collect their information.

REQUIRED INFORMATION (collect ALL before proceeding):
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. First name        - "May I have your first name?"                      │
│ 2. Last name         - "And your last name?"                              │
│ 3. Date of birth     - "Your date of birth?" (need YYYY-MM-DD format)     │
│ 4. Address           - "What's your street address?"                      │
│ 5. City              - "And which city?"                                  │
│ 6. Email             - "And your email address?"                          │
└────────────────────────────────────────────────────────────────────────────┘

Phone number is automatically captured from caller ID.

COLLECTION APPROACH:
- Be conversational, not interrogating
- Ask one question at a time
- Acknowledge each answer warmly before asking the next
- If they seem impatient, briefly explain why you need the info:
  "I just need a few quick details so I can set up your account"

AFTER COLLECTING ALL 6 FIELDS:
1. Say "Perfect, let me save your information..."
2. IMMEDIATELY call create_new_customer tool with all collected data
3. Wait for tool success confirmation
4. ONLY THEN proceed to help with their original request

⚠️ DO NOT attempt to book appointments until customer is saved in system!"""
    
    # =========================================================================
    # CRITICAL RULES
    # =========================================================================
    
    def _build_critical_rules(self) -> str:
        """Build critical behavior rules"""
        return """
═══════════════════════════════════════════════════════════════════════════════
                              CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════════

RESPONSE FORMAT:
✓ Keep responses to 1-2 sentences (this is a phone call)
✓ Speak naturally, no markdown or formatting
✓ Say dates as "Tuesday, January 15th" not "2025-01-15"
✓ Say times as "2 PM" or "2:30 PM" not "14:00"

CONFIRMATION BEFORE BOOKING:
Always confirm these details BEFORE calling book_appointment:
- Date
- Time  
- Provider/staff member
Example: "Just to confirm, that's Tuesday the 15th at 2 PM with Dr. Smith. Shall I book that?"

WHEN TOOLS FAIL:
- Never pretend a failed action succeeded
- Apologize briefly and offer alternatives
- Example: "I'm sorry, that time just got taken. Would 3 PM work instead?"

ENDING CALLS:
When the caller says goodbye, thanks you, or indicates they're done:
1. Summarize any appointments booked/changed if applicable
2. Say a warm goodbye
3. Call end_call tool to disconnect

WHAT TO DO IF UNSURE:
- Availability question → call check_availability
- Business info question → call answer_question
- Can't help → offer to take a message or have someone call back

NEVER:
✗ Make up appointment times without checking availability
✗ Say something is booked without calling book_appointment
✗ Say something is cancelled without calling cancel_appointment
✗ Ask returning customers for information you already have
✗ Process booking requests from new customers before saving their info"""
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _fmt_time_speech(self, time_str: str) -> str:
        """Format time for natural speech: 14:30 -> 2:30 PM"""
        if not time_str:
            return ""
        try:
            parts = time_str.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            
            suffix = "AM" if hour < 12 else "PM"
            display = hour % 12 or 12
            
            if minute == 0:
                return f"{display} {suffix}"
            return f"{display}:{minute:02d} {suffix}"
        except (ValueError, IndexError):
            return time_str
    
    def _format_date_speech(self, date_str: str) -> str:
        """Format date for natural speech: 2025-01-15 -> Wednesday, January 15th"""
        if not date_str:
            return ""
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            day = date_obj.day
            suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
            return date_obj.strftime(f"%A, %B {day}{suffix}")
        except ValueError:
            return date_str


def build_greeting(business_config: Dict, customer: Optional[Dict], ai_config: Optional[Dict]) -> str:
    """Build personalized greeting"""
    business = business_config.get("business", {})
    biz_name = business.get("business_name", "our office")
    
    if customer and customer.get("last_name"):
        last_name = customer["last_name"]
        if ai_config and ai_config.get("greeting_message"):
            greeting = ai_config["greeting_message"]
            return greeting.replace("{business_name}", biz_name).replace("{customer_name}", f"Mr. or Mrs. {last_name}")
        return f"Hello Mr. or Mrs. {last_name}! Thank you for calling {biz_name}. How may I help you today?"
    
    if ai_config and ai_config.get("greeting_message"):
        greeting = ai_config["greeting_message"]
        return greeting.replace("{business_name}", biz_name).replace("{customer_name}", "")
    
    return f"Thank you for calling {biz_name}. How may I help you today?"
