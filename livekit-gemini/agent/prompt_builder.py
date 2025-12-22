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
        long_term_memory: Optional[Dict[str, Any]] = None,
        short_term_memory: Optional[Dict[str, Any]] = None,
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
            customer_memory: Memories, preferences, relationships (LEGACY)
            long_term_memory: Consolidated long-term memory (preferences, facts, relationships)
            short_term_memory: Consolidated short-term memory (active deals, issues, context)
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
        self.customer_memory = customer_memory or {}  # Legacy
        self.long_term_memory = long_term_memory or {}
        self.short_term_memory = short_term_memory or {}
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
        
        OPTIMIZED: Removed redundant sections, compact formatting.
        ~30% smaller for faster Gemini responses.
        
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
            
            # Consolidated memory section (new system)
            if self.long_term_memory or self.short_term_memory:
                sections.append(self._build_consolidated_memory())
            # Legacy memory section (fallback)
            elif self.customer_memory:
                sections.append(self._build_customer_memory())
        else:
            sections.append(self._build_new_customer_flow())
        
        # Language (minimal - just enforce the language)
        sections.append(self._build_language_instructions())
        
        # Knowledge base
        if self.knowledge_base:
            sections.append(self._build_knowledge_base())
        
        # Outbound call context
        if self.is_outbound:
            sections.append(self._build_outbound_context())
        
        # Behavior guidelines (tools are known via function calling - no need to list)
        sections.append(self._build_behavior_guidelines())
        
        return "\n\n".join(filter(None, sections))
    
    def _build_identity(self) -> str:
        """Build the AI's identity and role - COMPACT"""
        business_name = self.business.get("business_name", "our business")
        ai_name = self.ai_config.get("name", "assistant")
        role_type = self.ai_config.get("role_type", "receptionist")
        custom_prompt = self.ai_config.get("custom_system_prompt", "")
        
        custom_line = f"\n{custom_prompt}" if custom_prompt else ""
        
        return f"""IDENTITY: You are {ai_name}, the AI {role_type} for {business_name}.
You handle ALL customer interactions autonomously - no human backup.{custom_line}

You can: schedule/reschedule/cancel appointments, answer questions, remember preferences, send confirmations (SMS/WhatsApp/Email), handle complaints, take notes, schedule callbacks."""
    
    def _build_business_info(self) -> str:
        """Build business information section - COMPACT"""
        business = self.business
        timezone = business.get("timezone", "UTC")
        
        parts = [f"BUSINESS: {business.get('business_name', 'Business')}"]
        
        if business.get("address"):
            parts.append(f"Address: {business['address']}")
        if business.get("phone"):
            parts.append(f"Phone: {business['phone']}")
        
        parts.append(f"Timezone: {timezone} | Today: {datetime.now().strftime('%A, %B %d, %Y')}")
        
        return "\n".join(parts)
    
    def _build_services_and_staff(self) -> str:
        """Build services and staff information - COMPACT"""
        lines = []
        
        # Services - one line each
        if self.services:
            lines.append("SERVICES:")
            for svc in self.services:
                name = svc.get("name", "Unknown")
                duration = svc.get("duration_minutes", 30)
                price = svc.get("price")
                price_str = f" - ${price:.2f}" if price else ""
                lines.append(f"  • {name} ({duration}min){price_str}")
        
        # Staff - compact with exceptions inline
        if self.staff:
            lines.append("\nSTAFF:")
            for member in self.staff:
                name = member.get("name", "Unknown")
                role = member.get("title", member.get("role", ""))
                role_str = f" ({role})" if role else ""
                
                # Check for time off
                exceptions = member.get("availability_exceptions", [])
                off_dates = [e.get("date") for e in exceptions if e.get("type") == "closed"]
                off_str = f" [OFF: {', '.join(off_dates)}]" if off_dates else ""
                
                lines.append(f"  • {name}{role_str}{off_str}")
        
        return "\n".join(lines)
    
    def _build_operating_hours(self) -> str:
        """Build operating hours section - COMPACT (single line per day)"""
        if not self.operating_hours:
            return ""
        
        day_abbrev = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
        
        hours_parts = []
        for hours in sorted(self.operating_hours, key=lambda x: x.get("day_of_week", 0)):
            day = day_abbrev.get(hours.get("day_of_week", 0), "?")
            if not hours.get("is_open", True):
                hours_parts.append(f"{day}:CLOSED")
            else:
                hours_parts.append(f"{day}:{hours.get('open_time', '09:00')}-{hours.get('close_time', '17:00')}")
        
        return "HOURS: " + " | ".join(hours_parts)
    
    def _build_existing_customer(self) -> str:
        """Build context for existing/returning customer - COMPACT"""
        customer = self.customer
        context = self.customer_context
        
        first_name = customer.get("first_name", "")
        last_name = customer.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip() or "Customer"
        
        lines = [f"RETURNING CUSTOMER: {full_name}"]
        
        # Basic info on one line
        info_parts = []
        if customer.get("phone"):
            info_parts.append(f"Phone: {customer['phone']}")
        if customer.get("email"):
            info_parts.append(f"Email: {customer['email']}")
        if info_parts:
            lines.append(" | ".join(info_parts))
        
        # Tags, accommodations, notes - only if present
        if customer.get("tags"):
            lines.append(f"Tags: {', '.join(customer['tags'])}")
        if customer.get("accommodations"):
            lines.append(f"⚠️ Accommodations: {customer['accommodations']}")
        if customer.get("notes"):
            lines.append(f"Notes: {customer['notes']}")
        if customer.get("last_call_summary"):
            lines.append(f"Last call: {customer['last_call_summary']}")
        
        # Upcoming appointments - compact
        appointments = context.get("appointments", [])
        upcoming = [a for a in appointments if a.get("status") == "scheduled"]
        if upcoming:
            lines.append("Upcoming:")
            for apt in upcoming[:3]:
                staff_str = f" w/{apt.get('staff_name')}" if apt.get('staff_name') else ""
                lines.append(f"  • {apt.get('appointment_date')} {apt.get('appointment_time')} - {apt.get('service_name', '')}{staff_str}")
        
        # History count
        past = [a for a in appointments if a.get("status") in ("completed", "no_show")]
        if past:
            completed = len([a for a in past if a.get("status") == "completed"])
            lines.append(f"History: {completed} visits")
        
        lines.append("\n→ Greet by name. Don't ask for info you already have.")
        
        return "\n".join(lines)
    
    def _build_customer_memory(self) -> str:
        """Build customer memory context section - COMPACT (legacy)"""
        memories = self.customer_memory.get("memories", [])
        preferences = self.customer_memory.get("preferences", {})
        relationships = self.customer_memory.get("relationships", [])
        
        if not any([memories, preferences, relationships]):
            return ""
        
        lines = ["CUSTOMER MEMORY:"]
        
        # Important memories - limit to 5
        if memories:
            for mem in sorted(memories, key=lambda x: x.get("importance", 5), reverse=True)[:5]:
                lines.append(f"  • {mem.get('content', '')}")
        
        # Flatten preferences
        if preferences:
            pref_parts = []
            for category, prefs in preferences.items():
                if isinstance(prefs, dict):
                    for k, v in prefs.items():
                        pref_parts.append(f"{k}: {v}")
            if pref_parts:
                lines.append(f"  Preferences: {', '.join(pref_parts[:5])}")
        
        # Relationships - compact
        if relationships:
            rel_parts = [f"{r.get('related_name')} ({r.get('relationship_type')})" for r in relationships[:3]]
            lines.append(f"  Relationships: {', '.join(rel_parts)}")
        
        lines.append("→ Use this naturally, don't list everything.")
        return "\n".join(lines)
    
    def _build_consolidated_memory(self) -> str:
        """Build consolidated memory section - COMPACT"""
        lines = ["MEMORY:"]
        
        # Long-term memory (who they ARE)
        if self.long_term_memory:
            # Preferences - flatten
            preferences = self.long_term_memory.get("preferences", {})
            if preferences:
                pref_parts = [f"{k}: {v}" for k, v in list(preferences.items())[:5]]
                lines.append(f"  Preferences: {', '.join(pref_parts)}")
            
            # Facts - limit to 5
            facts = self.long_term_memory.get("facts", [])
            if facts:
                for fact in facts[:5]:
                    lines.append(f"  • {fact}")
            
            # Relationships - inline
            relationships = self.long_term_memory.get("relationships", {})
            if relationships:
                rel_parts = [f"{name} ({info.get('type', 'contact')})" for name, info in list(relationships.items())[:3]]
                lines.append(f"  Relationships: {', '.join(rel_parts)}")
        
        # Short-term memory (what's happening NOW)
        if self.short_term_memory:
            # Open issues - highlight
            open_issues = self.short_term_memory.get("open_issues", [])
            if open_issues:
                lines.append("  ⚠️ Open issues:")
                for issue in open_issues[:3]:
                    if isinstance(issue, dict):
                        lines.append(f"    • {issue.get('context', issue)}")
                    else:
                        lines.append(f"    • {issue}")
            
            # Recent context
            recent_context = self.short_term_memory.get("recent_context", [])
            if recent_context:
                lines.append(f"  Recent: {'; '.join(recent_context[:3])}")
        
        if len(lines) <= 1:
            return ""
        
        lines.append("→ Use naturally, don't list everything.")
        return "\n".join(lines)
    
    def _build_new_customer_flow(self) -> str:
        """Build instructions for handling new customers - COMPACT"""
        return """NEW CUSTOMER (not in system)

To book, collect: first name, last name, phone (confirm the one they're calling from).
Then use create_new_customer tool and proceed with their request.

Be conversational when collecting info - don't list all fields at once.
For questions only (no booking needed), you can help without creating a record."""
    
    def _build_language_instructions(self) -> str:
        """Build language-specific instructions - MINIMAL"""
        return f"""LANGUAGE: Speak in {self.language_name} for the entire conversation.
If the caller switches language, follow their lead naturally."""
    
    def _build_knowledge_base(self) -> str:
        """Build knowledge base section - LIMITED to 15 entries"""
        if not self.knowledge_base:
            return ""
        
        lines = ["FAQ:"]
        
        # Limit to 15 entries to avoid prompt bloat
        for entry in self.knowledge_base[:15]:
            question = entry.get("question", "")
            answer = entry.get("answer", "")
            if question and answer:
                lines.append(f"Q: {question}")
                lines.append(f"A: {answer}")
        
        return "\n".join(lines)
    
    def _build_outbound_context(self) -> str:
        """Build context for outbound calls - COMPACT"""
        if not self.is_outbound:
            return ""
        
        call_type = self.outbound_context.get("call_type", "custom")
        context_data = self.outbound_context.get("context_data", {})
        reason = self.outbound_context.get("reason", "")
        
        lines = [f"OUTBOUND CALL: {call_type.replace('_', ' ').upper()}"]
        if reason:
            lines.append(f"Reason: {reason}")
        
        if call_type == "appointment_reminder":
            lines.append(f"Appointment: {context_data.get('appointment_date', '')} at {context_data.get('appointment_time', '')} - {context_data.get('service_name', '')}")
            lines.append("Task: Confirm identity, remind about appointment, ask if they can make it, offer reschedule if needed.")
        
        elif call_type == "callback":
            lines.append(f"Context: {context_data.get('notes', 'Customer requested callback')}")
            lines.append("Task: Confirm identity, remind they requested callback, help with their issue.")
        
        elif call_type == "waitlist_notification":
            lines.append("Task: Confirm identity, explain slot opened, offer to book, confirm or keep on waitlist.")
        
        lines.append("→ Be respectful of their time. Get to the point. Be prepared for voicemail.")
        
        return "\n".join(lines)
    
    # Tool guidelines removed - Gemini already knows tools via function calling
    
    def _build_behavior_guidelines(self) -> str:
        """Build behavior guidelines - COMPACT, merged with critical instructions"""
        return """BEHAVIOR:

BE NATURAL: Warm, friendly, professional. Keep responses concise. Match the caller's energy.

BEFORE USING TOOLS: Always say something first like "Let me check that..." or "One moment..." 
Never leave dead silence while looking something up.

CRITICAL RULES:
• Start the call immediately - greet them right away, don't wait
• You ARE the receptionist (never say "I'm an AI")
• No human fallback - you handle everything (schedule callback if you can't resolve now)
• Use tools proactively - don't ask "would you like me to check?" - just check
• Confirm dates/times/services before booking
• Use save_memory for important facts customers share
• When conversation ends (customer says goodbye/thanks/done), use the end_call tool to hang up

BEGIN CONVERSATION"""


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
