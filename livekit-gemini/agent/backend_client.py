"""
Backend Client for Universal AI Agent

This module provides all communication with the backend API:
- Business configuration
- Customer management
- Appointment scheduling
- Memory system
- Messaging (SMS, WhatsApp, Email)
- Outbound call management
- Call logging

All methods are async and handle errors gracefully.
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime

import httpx

logger = logging.getLogger("backend-client")


class BackendClient:
    """
    Async HTTP client for the backend API.
    
    Handles all communication with the backend server including:
    - Customer lookup and management
    - Appointment operations
    - Memory system operations
    - Message sending
    - Outbound call management
    """
    
    def __init__(self, base_url: str, timeout: float = 30.0):
        """
        Initialize the backend client.
        
        Args:
            base_url: Base URL of the backend API (e.g., http://localhost:8000)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"}
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUSINESS OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def lookup_business_by_phone(self, phone_number: str) -> Optional[Dict]:
        """
        Look up business configuration by their AI phone number.
        
        Args:
            phone_number: The phone number that was called
        
        Returns:
            Full business configuration including staff, services, hours, etc.
        """
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/ai/lookup-by-phone",
                json={"phone_number": phone_number}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"No business found for phone: {phone_number}")
                return None
            logger.error(f"lookup_business_by_phone error: {e}")
            raise
        except Exception as e:
            logger.error(f"lookup_business_by_phone error: {e}")
            raise
    
    async def get_business_config(self, business_id: str) -> Optional[Dict]:
        """
        Get full business configuration by ID.
        
        Args:
            business_id: Business UUID
        
        Returns:
            Business configuration with staff, services, hours, knowledge base
        """
        try:
            client = await self._get_client()
            response = await client.get(f"/api/businesses/{business_id}/config")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"get_business_config error: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CUSTOMER OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def lookup_customer_with_context(
        self,
        phone: str,
        business_id: str
    ) -> Dict:
        """
        Look up customer by phone and load their full context.
        
        Args:
            phone: Customer's phone number
            business_id: Business UUID
        
        Returns:
            Dict with exists, customer, and context (appointments, memory)
        """
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/customers/lookup",
                json={"phone": phone, "business_id": business_id}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return {"exists": False, "customer": None, "context": {}}
            logger.error(f"lookup_customer_with_context error: {e}")
            return {"exists": False, "customer": None, "context": {}}
        except Exception as e:
            logger.error(f"lookup_customer_with_context error: {e}")
            return {"exists": False, "customer": None, "context": {}}
    
    async def get_customer_with_memory(
        self,
        customer_id: str,
        business_id: str
    ) -> Optional[Dict]:
        """
        Get customer record with their memory context.
        
        Args:
            customer_id: Customer UUID
            business_id: Business UUID
        
        Returns:
            Customer data with memory, preferences, relationships
        """
        try:
            client = await self._get_client()
            response = await client.get(
                f"/api/customers/{customer_id}/with-memory",
                params={"business_id": business_id}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"get_customer_with_memory error: {e}")
            return None
    
    async def create_customer(
        self,
        business_id: str,
        first_name: str,
        last_name: str,
        phone: str,
        email: Optional[str] = None,
        notes: Optional[str] = None,
        language: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Create a new customer record.
        
        Args:
            business_id: Business UUID
            first_name: Customer's first name
            last_name: Customer's last name
            phone: Phone number
            email: Email address (optional)
            notes: Initial notes (optional)
            language: Preferred language code (optional)
        
        Returns:
            Created customer data with success status
        """
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/customers",
                json={
                    "business_id": business_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone,
                    "email": email,
                    "notes": notes,
                    "language": language
                }
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "customer": data}
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json().get("detail", str(e)) if e.response.content else str(e)
            logger.error(f"create_customer error: {error_detail}")
            return {"success": False, "error": error_detail}
        except Exception as e:
            logger.error(f"create_customer error: {e}")
            return {"success": False, "error": str(e)}
    
    async def update_customer(
        self,
        customer_id: str,
        **update_fields
    ) -> Optional[Dict]:
        """
        Update customer information.
        
        Args:
            customer_id: Customer UUID
            **update_fields: Fields to update (phone, email, notes, etc.)
        
        Returns:
            Updated customer data with success status
        """
        try:
            client = await self._get_client()
            response = await client.patch(
                f"/api/customers/{customer_id}",
                json=update_fields
            )
            response.raise_for_status()
            return {"success": True, "customer": response.json()}
        except Exception as e:
            logger.error(f"update_customer error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_customer_appointments(
        self,
        customer_id: str,
        business_id: str,
        status: Optional[str] = None
    ) -> List[Dict]:
        """
        Get customer's appointments.
        
        Args:
            customer_id: Customer UUID
            business_id: Business UUID
            status: Filter by status (scheduled, completed, cancelled, no_show)
        
        Returns:
            List of appointments
        """
        try:
            client = await self._get_client()
            params = {"business_id": business_id}
            if status:
                params["status"] = status
            
            response = await client.get(
                f"/api/customers/{customer_id}/appointments",
                params=params
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"get_customer_appointments error: {e}")
            return []
    
    async def get_customer_history(
        self,
        customer_id: str,
        business_id: str
    ) -> Optional[Dict]:
        """
        Get customer's full history with the business.
        
        Returns:
            Dict with appointments, feedback, interactions
        """
        try:
            client = await self._get_client()
            response = await client.get(
                f"/api/customers/{customer_id}/history",
                params={"business_id": business_id}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"get_customer_history error: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # APPOINTMENT OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def check_availability(
        self,
        business_id: str,
        date: str,
        service_name: Optional[str] = None,
        staff_name: Optional[str] = None,
        staff_id: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Check available appointment slots.
        
        Args:
            business_id: Business UUID
            date: Date to check (YYYY-MM-DD)
            service_name: Optional service to filter by (not used in API, for filtering results)
            staff_name: Optional staff member name to filter by (used to find staff_id)
            staff_id: Optional staff ID (if provided, used directly; otherwise looked up from staff_name)
        
        Returns:
            Dict with available_slots list
        """
        try:
            client = await self._get_client()
            target_staff_id = staff_id
            
            # If staff_name provided but no staff_id, look it up from business config
            if not target_staff_id and staff_name:
                # Get business config to find staff_id from staff_name
                # We need to get the business phone number first, but we have business_id
                # Actually, we can query staff directly by name and business_id
                # But there's no public endpoint for that, so we'll use business config
                # For now, we'll need the caller to pass staff_id from business config
                # This is a limitation - the agent should pass staff_id from already-loaded business config
                logger.warning(f"Cannot look up staff_id from staff_name without business config. Please pass staff_id.")
                return None
            
            if not target_staff_id:
                logger.warning("No staff_id provided for availability check")
                return None
            
            # Use the correct endpoint: /api/appointments/staff/{staff_id}/slots
            response = await client.get(
                f"/api/appointments/staff/{target_staff_id}/slots",
                params={"start_date": date}
            )
            response.raise_for_status()
            slots = response.json()
            
            # Filter by service if needed (this would require additional logic)
            # For now, return all slots for the staff member
            return {"available_slots": slots}
        except Exception as e:
            logger.error(f"check_availability error: {e}")
            return None
    
    async def book_appointment(
        self,
        business_id: str,
        customer_id: str,
        date: str,
        time: str,
        staff_id: str,
        service_id: Optional[str] = None,
        duration_minutes: int = 30,
        notes: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Book a new appointment.
        
        Args:
            business_id: Business UUID
            customer_id: Customer UUID
            date: Appointment date (YYYY-MM-DD)
            time: Appointment time (HH:MM)
            staff_id: Staff member UUID
            service_id: Optional service UUID
            duration_minutes: Appointment duration (default 30)
            notes: Optional notes
        
        Returns:
            Dict with success status and appointment details
        """
        try:
            client = await self._get_client()
            # Use agent-specific endpoint (no auth required)
            # Backend expects query parameters, not JSON body
            params = {
                "business_id": business_id,
                "customer_id": customer_id,
                "staff_id": staff_id,
                "appointment_date": date,
                "appointment_time": time,
                "duration_minutes": duration_minutes
            }
            if service_id:
                params["service_id"] = service_id
            if notes:
                params["notes"] = notes
            
            response = await client.post(
                "/api/agent/appointments/book",
                params=params
            )
            response.raise_for_status()
            return {"success": True, "appointment": response.json()}
        except httpx.HTTPStatusError as e:
            error = e.response.json().get("detail", str(e)) if e.response.content else str(e)
            return {"success": False, "error": error}
        except Exception as e:
            logger.error(f"book_appointment error: {e}")
            return {"success": False, "error": str(e)}
    
    async def cancel_appointment(
        self,
        appointment_id: str,
        reason: Optional[str] = None
    ) -> Optional[Dict]:
        """Cancel an appointment."""
        try:
            client = await self._get_client()
            # Use agent-specific endpoint (no auth required)
            # Backend expects query parameters, not JSON body
            params = {}
            if reason:
                params["cancellation_reason"] = reason
            response = await client.post(
                f"/api/agent/appointments/{appointment_id}/cancel",
                params=params
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.error(f"cancel_appointment error: {e}")
            return {"success": False, "error": str(e)}
    
    async def reschedule_appointment(
        self,
        appointment_id: str,
        new_date: str,
        new_time: str,
        staff_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Reschedule an appointment to a new date/time."""
        try:
            client = await self._get_client()
            # Backend expects query parameters, not JSON body
            params = {"new_date": new_date, "new_time": new_time}
            if staff_id:
                params["staff_id"] = staff_id
            # Use agent-specific endpoint (no auth required)
            response = await client.post(
                f"/api/agent/appointments/{appointment_id}/reschedule",
                params=params
            )
            response.raise_for_status()
            return {"success": True, "appointment": response.json()}
        except httpx.HTTPStatusError as e:
            error = e.response.json().get("detail", str(e)) if e.response.content else str(e)
            return {"success": False, "error": error}
        except Exception as e:
            logger.error(f"reschedule_appointment error: {e}")
            return {"success": False, "error": str(e)}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # WAITLIST OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def add_to_waitlist(
        self,
        business_id: str,
        customer_id: str,
        preferred_date: Optional[str] = None,
        preferred_time_of_day: Optional[str] = None,
        preferred_staff: Optional[str] = None,
        service_name: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Optional[Dict]:
        """Add customer to appointment waitlist."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/waitlist",
                json={
                    "business_id": business_id,
                    "customer_id": customer_id,
                    "preferred_date": preferred_date,
                    "preferred_time_of_day": preferred_time_of_day,
                    "preferred_staff": preferred_staff,
                    "service_name": service_name,
                    "notes": notes
                }
            )
            response.raise_for_status()
            data = response.json()
            return {"success": True, "position": data.get("position")}
        except Exception as e:
            logger.error(f"add_to_waitlist error: {e}")
            return {"success": False, "error": str(e)}
    
    async def check_waitlist(
        self,
        customer_id: str,
        business_id: str
    ) -> Optional[Dict]:
        """Check customer's waitlist status."""
        try:
            client = await self._get_client()
            response = await client.get(
                "/api/waitlist/status",
                params={"customer_id": customer_id, "business_id": business_id}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"check_waitlist error: {e}")
            return {"on_waitlist": False}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MEMORY OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_customer_memory(
        self,
        customer_id: str,
        limit: int = 20
    ) -> Optional[Dict]:
        """
        Get customer's memories, preferences, relationships, and special dates.
        
        Returns:
            Dict with memories, preferences, relationships, special_dates
        """
        try:
            client = await self._get_client()
            response = await client.get(
                f"/api/memory/customer/{customer_id}",
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"get_customer_memory error: {e}")
            return None
    
    async def save_memory(
        self,
        customer_id: str,
        business_id: str,
        memory_type: str,
        content: str,
        importance: int = 5,
        structured_data: Optional[Dict] = None,
        source_type: str = "call",
        source_id: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Save a memory about a customer.
        
        Args:
            customer_id: Customer UUID
            business_id: Business UUID
            memory_type: Type of memory (fact, preference, note, issue, positive)
            content: The memory content
            importance: Importance score 1-10
            structured_data: Optional structured data
            source_type: Source of memory (call, appointment, etc.)
            source_id: Reference to source record
        
        Returns:
            Created memory record
        """
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/memory/save",
                json={
                    "customer_id": customer_id,
                    "business_id": business_id,
                    "memory_type": memory_type,
                    "content": content,
                    "importance": importance,
                    "structured_data": structured_data,
                    "source_type": source_type,
                    "source_id": source_id
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"save_memory error: {e}")
            return None
    
    async def update_preference(
        self,
        customer_id: str,
        business_id: str,
        category: str,
        key: str,
        value: str,
        confidence: float = 0.7
    ) -> Optional[Dict]:
        """Update or create a customer preference."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/memory/preference",
                json={
                    "customer_id": customer_id,
                    "business_id": business_id,
                    "category": category,
                    "preference_key": key,
                    "preference_value": value,
                    "confidence": confidence
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"update_preference error: {e}")
            return None
    
    async def add_relationship(
        self,
        customer_id: str,
        business_id: str,
        related_name: str,
        relationship_type: str,
        phone: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Optional[Dict]:
        """Add a family member or relationship to customer."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/memory/relationship",
                json={
                    "customer_id": customer_id,
                    "business_id": business_id,
                    "related_name": related_name,
                    "relationship_type": relationship_type,
                    "phone": phone,
                    "notes": notes
                }
            )
            response.raise_for_status()
            return {"success": True, "relationship": response.json()}
        except Exception as e:
            logger.error(f"add_relationship error: {e}")
            return {"success": False, "error": str(e)}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MESSAGING OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def send_message(
        self,
        business_id: str,
        customer_id: str,
        channel: str,
        to_address: str,
        content: str,
        subject: Optional[str] = None,
        include_appointment: bool = False
    ) -> Optional[Dict]:
        """
        Send a message via SMS, WhatsApp, or Email.
        
        Args:
            business_id: Business UUID
            customer_id: Customer UUID
            channel: 'sms', 'whatsapp', or 'email'
            to_address: Phone number or email address
            content: Message content
            subject: Email subject (for email only)
            include_appointment: Whether to append appointment details
        
        Returns:
            Dict with success status and message_id
        """
        try:
            client = await self._get_client()
            
            endpoint = f"/api/messaging/send-{channel}"
            payload = {
                "business_id": business_id,
                "customer_id": customer_id,
                "to_address": to_address,
                "message": content,
                "include_appointment": include_appointment
            }
            
            if channel == "email" and subject:
                payload["subject"] = subject
            
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"send_message error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_appointment_confirmation(
        self,
        business_id: str,
        customer_id: str,
        method: str = "sms"
    ) -> Optional[Dict]:
        """Send appointment confirmation with full details."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/messaging/send-appointment-confirmation",
                json={
                    "business_id": business_id,
                    "customer_id": customer_id,
                    "method": method
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"send_appointment_confirmation error: {e}")
            return {"success": False, "error": str(e)}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OUTBOUND CALL OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def get_outbound_call(self, outbound_id: str) -> Optional[Dict]:
        """Get outbound call details and context."""
        try:
            client = await self._get_client()
            response = await client.get(f"/api/outbound/{outbound_id}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"get_outbound_call error: {e}")
            return None
    
    async def schedule_callback(
        self,
        business_id: str,
        customer_id: str,
        phone: str,
        callback_date: str,
        callback_time: str,
        reason: Optional[str] = None,
        notes: Optional[str] = None,
        original_call_log_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Schedule a callback to customer."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/outbound/callback",
                json={
                    "business_id": business_id,
                    "customer_id": customer_id,
                    "phone": phone,
                    "callback_date": callback_date,
                    "callback_time": callback_time,
                    "reason": reason,
                    "notes": notes,
                    "original_call_log_id": original_call_log_id
                }
            )
            response.raise_for_status()
            return {"success": True, "callback": response.json()}
        except Exception as e:
            logger.error(f"schedule_callback error: {e}")
            return {"success": False, "error": str(e)}
    
    async def update_outbound_call(
        self,
        outbound_id: str,
        **update_fields
    ) -> Optional[Dict]:
        """Update outbound call status."""
        try:
            client = await self._get_client()
            response = await client.put(
                f"/api/outbound/{outbound_id}",
                json=update_fields
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"update_outbound_call error: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FEEDBACK & LOGGING
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def record_feedback(
        self,
        business_id: str,
        customer_id: str,
        feedback_type: str,
        content: str,
        rating: Optional[int] = None,
        call_log_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Record customer feedback or complaint."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/feedback",
                json={
                    "business_id": business_id,
                    "customer_id": customer_id,
                    "feedback_type": feedback_type,
                    "content": content,
                    "rating": rating,
                    "source": "call",
                    "call_log_id": call_log_id,
                    "requires_followup": feedback_type == "complaint"
                }
            )
            response.raise_for_status()
            return {"success": True, "feedback": response.json()}
        except Exception as e:
            logger.error(f"record_feedback error: {e}")
            return {"success": False, "error": str(e)}
    
    async def log_call_start(
        self,
        business_id: str,
        caller_phone: str,
        customer_id: Optional[str] = None,
        role_id: Optional[str] = None,
        is_outbound: bool = False,
        outbound_call_id: Optional[str] = None,
        language_code: Optional[str] = None,
        language_source: Optional[str] = None
    ) -> Optional[Dict]:
        """Log the start of a call."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/calls/log",
                json={
                    "business_id": business_id,
                    "caller_phone": caller_phone,
                    "customer_id": customer_id,
                    "current_role_id": role_id,
                    "call_direction": "outbound" if is_outbound else "inbound"
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"log_call_start error: {e}")
            return None
    
    async def log_call_end(
        self,
        call_log_id: str,
        duration: int,
        outcome: str,
        summary: Optional[str] = None,
        transcript: Optional[str] = None,
        sentiment: Optional[str] = None,
        tools_used: Optional[List[str]] = None
    ) -> Optional[Dict]:
        """Log the end of a call with outcome and metrics."""
        try:
            from datetime import datetime
            client = await self._get_client()
            response = await client.put(
                f"/api/calls/log/{call_log_id}",
                json={
                    "call_duration": duration,
                    "outcome": outcome,
                    "transcript": transcript,
                    "ended_at": datetime.utcnow().isoformat()
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"log_call_end error: {e}")
            return None
    
    async def log_transfer(
        self,
        call_log_id: str,
        from_role: Optional[str],
        to_role: str,
        reason: str
    ) -> None:
        """Log a call transfer attempt."""
        try:
            client = await self._get_client()
            await client.post(
                f"/api/calls/{call_log_id}/transfer",
                json={
                    "from_role": from_role,
                    "to_role": to_role,
                    "reason": reason
                }
            )
        except Exception as e:
            logger.error(f"log_transfer error: {e}")
    
    async def log_knowledge_gap(
        self,
        business_id: str,
        question: str,
        call_log_id: Optional[str] = None
    ) -> None:
        """Log a question that couldn't be answered."""
        try:
            client = await self._get_client()
            await client.post(
                "/api/knowledge-gaps",
                json={
                    "business_id": business_id,
                    "question": question,
                    "call_log_id": call_log_id
                }
            )
        except Exception as e:
            logger.error(f"log_knowledge_gap error: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # KNOWLEDGE BASE
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def search_knowledge_base(
        self,
        business_id: str,
        query: str
    ) -> Optional[Dict]:
        """Search knowledge base for an answer."""
        try:
            client = await self._get_client()
            response = await client.get(
                "/api/knowledge-base/search",
                params={"business_id": business_id, "query": query}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"search_knowledge_base error: {e}")
            return None
