"""
Prompt Builder - Clean, modular system prompt generation

Builds a well-organized prompt from business configuration.
Works with any business type (dental, salon, legal, etc.)
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional


class PromptBuilder:
    """Builds clean, organized system prompts from business data"""
    
    def __init__(self, business_config: Dict, customer: Optional[Dict] = None, ai_config: Optional[Dict] = None):
        self.business = business_config.get("business", {})
        self.staff = business_config.get("staff", [])
        self.services = business_config.get("services", [])
        self.hours = business_config.get("business_hours", [])
        self.knowledge = business_config.get("knowledge_base", [])
        self.customer = customer
        self.ai_config = ai_config or {}
        
        # Build service lookup for staff mapping
        self.service_map = {s["id"]: s for s in self.services}
    
    def build(self) -> str:
        """Build the complete system prompt"""
        sections = [
            self._build_identity(),
            self._build_business(),
            self._build_hours(),
            self._build_team(),
            self._build_services(),
            self._build_knowledge(),
            self._build_caller(),
            self._build_behavior(),
        ]
        
        # Filter empty sections and join
        return "\n\n".join(s for s in sections if s)
    
    # =========================================================================
    # SECTION BUILDERS
    # =========================================================================
    
    def _build_identity(self) -> str:
        """Build AI identity section"""
        name = self.ai_config.get("ai_name", "Assistant")
        business_name = self.business.get("business_name", "the business")
        
        # Use custom prompt if provided, otherwise build default
        custom_prompt = self.ai_config.get("system_prompt", "")
        if custom_prompt and "{" not in custom_prompt:
            # Custom prompt without placeholders - use as-is
            return custom_prompt
        
        role_type = self.ai_config.get("role_type", "receptionist")
        
        if role_type == "receptionist":
            return f"""You are {name}, the receptionist at {business_name}.

Your job: Help callers with appointments, answer questions, provide information.
Your style: Friendly, professional, efficient. Keep responses concise for phone conversation."""
        
        elif role_type == "sales":
            return f"""You are {name}, handling sales inquiries at {business_name}.

Your job: Help potential customers understand services, answer questions, book consultations.
Your style: Helpful, informative, not pushy. Focus on customer needs."""
        
        else:
            return f"""You are {name} at {business_name}.

Your job: Assist callers with their needs.
Your style: Friendly, professional, helpful."""
    
    def _build_business(self) -> str:
        """Build business info section"""
        b = self.business
        name = b.get("business_name", "")
        
        lines = [f"BUSINESS: {name}"]
        
        # Address
        address_parts = [b.get("address"), b.get("city"), b.get("state"), b.get("zip_code")]
        address = ", ".join(p for p in address_parts if p)
        if address:
            lines.append(f"Location: {address}")
        
        # Contact
        if b.get("phone_number"):
            lines.append(f"Phone: {b['phone_number']}")
        if b.get("website"):
            lines.append(f"Website: {b['website']}")
        
        return "\n".join(lines)
    
    def _build_hours(self) -> str:
        """Build business hours section"""
        if not self.hours:
            return ""
        
        days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        lines = ["HOURS:"]
        
        for h in sorted(self.hours, key=lambda x: x.get("day_of_week", 0)):
            day_idx = h.get("day_of_week", 0)
            day_name = days[day_idx] if 0 <= day_idx < 7 else "Unknown"
            
            if h.get("is_open"):
                open_t = self._format_time(h.get("open_time", ""))
                close_t = self._format_time(h.get("close_time", ""))
                lines.append(f"  {day_name}: {open_t} - {close_t}")
            else:
                lines.append(f"  {day_name}: Closed")
        
        return "\n".join(lines)
    
    def _build_team(self) -> str:
        """Build staff section with their services"""
        if not self.staff:
            return ""
        
        lines = ["TEAM:"]
        
        for s in self.staff:
            name = s.get("name", "Staff")
            title = s.get("title", "")
            
            # Build staff line
            if title:
                staff_line = f"  {name} ({title})"
            else:
                staff_line = f"  {name}"
            
            # Add services this staff can perform
            service_ids = s.get("service_ids", [])
            if service_ids:
                service_names = []
                for sid in service_ids:
                    if sid in self.service_map:
                        service_names.append(self.service_map[sid]["name"])
                if service_names:
                    staff_line += f" - does: {', '.join(service_names)}"
            
            # Add specialty if no service mapping
            elif s.get("specialty"):
                staff_line += f" - {s['specialty']}"
            
            lines.append(staff_line)
        
        return "\n".join(lines)
    
    def _build_services(self) -> str:
        """Build services section"""
        if not self.services:
            return ""
        
        lines = ["SERVICES:"]
        
        # Group by category if categories exist
        by_category = {}
        for svc in self.services:
            cat = svc.get("category", "General")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(svc)
        
        for category, services in by_category.items():
            if len(by_category) > 1:
                lines.append(f"  [{category}]")
            
            for svc in services:
                name = svc.get("name", "Service")
                duration = svc.get("duration_minutes", 30)
                price = svc.get("price")
                
                if price:
                    lines.append(f"  {name}: ${price:.0f}, {duration} min")
                else:
                    lines.append(f"  {name}: {duration} min")
        
        return "\n".join(lines)
    
    def _build_knowledge(self) -> str:
        """Build FAQ/knowledge section"""
        if not self.knowledge:
            return ""
        
        # Limit to most relevant FAQs
        faqs = self.knowledge[:10]
        if not faqs:
            return ""
        
        lines = ["COMMON QUESTIONS:"]
        
        for faq in faqs:
            q = faq.get("question", "")
            a = faq.get("answer", "")
            if q and a:
                # Keep answers concise
                if len(a) > 200:
                    a = a[:197] + "..."
                lines.append(f"  Q: {q}")
                lines.append(f"  A: {a}")
        
        return "\n".join(lines)
    
    def _build_caller(self) -> str:
        """Build caller context section"""
        if self.customer:
            return self._build_existing_customer()
        else:
            return self._build_new_customer()
    
    def _build_existing_customer(self) -> str:
        """Build context for returning customer"""
        c = self.customer
        name = c.get("first_name", "")
        
        lines = [f"CALLER: {name} (returning customer)"]
        
        # Only include relevant details
        if c.get("notes"):
            lines.append(f"Notes: {c['notes']}")
        
        if c.get("total_appointments"):
            lines.append(f"Previous visits: {c['total_appointments']}")
        
        if c.get("last_visit_date"):
            lines.append(f"Last visit: {c['last_visit_date']}")
        
        # Key instruction
        lines.append("")
        lines.append("→ Address them by name. Do NOT ask for name, phone, or email - you have it.")
        
        return "\n".join(lines)
    
    def _build_new_customer(self) -> str:
        """Build context for new customer"""
        return """CALLER: New customer

→ Collect their first name and last name naturally during conversation.
→ Use create_new_customer tool to save their info before booking."""
    
    def _build_behavior(self) -> str:
        """Build behavior rules section"""
        rules = [
            "RULES:",
            "• Keep responses short - this is a phone call, not text",
            "• Confirm details before booking (date, time, staff)",
            "• If asked something you don't know, offer to take a message",
            "• Use tools to check real availability - don't guess",
            "• When slots unavailable, offer alternatives",
        ]
        
        return "\n".join(rules)
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _format_time(self, time_str: str) -> str:
        """Format time string for speech (09:00 -> 9 AM)"""
        if not time_str:
            return ""
        
        try:
            # Handle both HH:MM and HH:MM:SS
            parts = time_str.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            
            period = "AM" if hour < 12 else "PM"
            display_hour = hour if hour <= 12 else hour - 12
            if display_hour == 0:
                display_hour = 12
            
            if minute == 0:
                return f"{display_hour} {period}"
            else:
                return f"{display_hour}:{minute:02d} {period}"
        except (ValueError, IndexError):
            return time_str


def build_greeting(business_config: Dict, customer: Optional[Dict], ai_config: Optional[Dict]) -> str:
    """Build appropriate greeting message"""
    business = business_config.get("business", {})
    business_name = business.get("business_name", "our office")
    
    # Use custom greeting if provided
    if ai_config and ai_config.get("greeting_message"):
        greeting = ai_config["greeting_message"]
        # Replace placeholders
        customer_name = customer.get("first_name", "there") if customer else "there"
        return greeting.replace("{business_name}", business_name).replace("{customer_name}", customer_name)
    
    # Generate default greeting
    if customer:
        name = customer.get("first_name", "")
        if name:
            return f"Hello {name}! Thanks for calling {business_name}. How can I help you today?"
        else:
            return f"Hello! Thanks for calling {business_name}. How can I help you today?"
    else:
        return f"Hello! Thanks for calling {business_name}. How can I help you today?"

