"""
Backend API Client

Clean interface to communicate with FastAPI backend.
All methods return data or None on error (no exceptions bubble up to AI).
"""

import httpx
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)


class BackendClient:
    """HTTP client for backend API"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.timeout = 10.0

    # =========================================================================
    # BUSINESS
    # =========================================================================

    async def lookup_business_by_phone(self, phone_number: str) -> Dict:
        """Lookup business configuration by AI phone number"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/ai/lookup-by-phone",
                    json={"phone_number": phone_number}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"lookup_business_by_phone error: {e}")
            raise

    # =========================================================================
    # CUSTOMER
    # =========================================================================

    async def lookup_customer(self, phone: str, business_id: str) -> Dict:
        """Check if customer exists"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/customers/lookup",
                    json={"phone": phone, "business_id": business_id}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"lookup_customer error: {e}")
            return {"exists": False, "customer": None}

    async def create_customer(
        self,
        business_id: str,
        phone: str,
        first_name: str,
        last_name: str,
        email: str = None,
        date_of_birth: str = None,
        address: str = None,
        city: str = None,
    ) -> Optional[Dict]:
        """Create a new customer"""
        try:
            data = {
                    "business_id": business_id,
                    "phone": phone,
                    "first_name": first_name,
                    "last_name": last_name,
                }
            if email:
                data["email"] = email
            if date_of_birth:
                data["date_of_birth"] = date_of_birth
            if address:
                data["address"] = address
            if city:
                data["city"] = city
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/customers/create",
                    json=data
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            detail = self._extract_error(e)
            logger.error(f"create_customer error: {e.response.status_code} - {detail}")
            return None
        except Exception as e:
            logger.error(f"create_customer error: {e}")
            return None

    async def update_customer(self, customer_id: str, update_data: dict) -> Optional[Dict]:
        """Update customer information"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.put(
                    f"{self.base_url}/api/agent/customers/{customer_id}",
                    json=update_data
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"update_customer error: {e}")
            return None

    async def get_customer_context(self, customer_id: str) -> Optional[Dict]:
        """Get full customer context including history and tags"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/agent/appointments/customer-context/{customer_id}"
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"get_customer_context error: {e}")
            return None

    # =========================================================================
    # APPOINTMENTS
    # =========================================================================

    async def get_available_slots(
        self,
        staff_id: str,
        start_date: str,
        end_date: str = None
    ) -> List[Dict]:
        """Get available appointment slots"""
        try:
            params = {"start_date": start_date}
            if end_date:
                params["end_date"] = end_date

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/appointments/staff/{staff_id}/slots",
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"get_available_slots error: {e}")
            return []

    async def book_appointment(
        self,
        business_id: str,
        customer_id: str,
        staff_id: str,
        appointment_date: str,
        appointment_time: str,
        duration_minutes: int = 30,
        service_id: str = None,
        notes: str = None
    ) -> Optional[Dict]:
        """Book an appointment"""
        try:
            params = {
                "business_id": business_id,
                "customer_id": customer_id,
                "staff_id": staff_id,
                "appointment_date": appointment_date,
                "appointment_time": appointment_time,
                "duration_minutes": duration_minutes
            }
            if service_id:
                params["service_id"] = service_id
            if notes:
                params["notes"] = notes

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/agent/appointments/book",
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            detail = self._extract_error(e)
            logger.error(f"book_appointment error: {e.response.status_code} - {detail}")
            return None
        except Exception as e:
            logger.error(f"book_appointment error: {e}")
            return None

    async def get_customer_appointments(
        self,
        customer_id: str,
        upcoming_only: bool = True
    ) -> List[Dict]:
        """Get appointments for a customer"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/agent/appointments/customer/{customer_id}",
                    params={"upcoming_only": upcoming_only}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"get_customer_appointments error: {e}")
            return []

    async def cancel_appointment(
        self,
        appointment_id: str,
        cancellation_reason: str = None
    ) -> Optional[Dict]:
        """Cancel an appointment"""
        try:
            params = {}
            if cancellation_reason:
                params["cancellation_reason"] = cancellation_reason

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/agent/appointments/{appointment_id}/cancel",
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            detail = self._extract_error(e)
            logger.error(f"cancel_appointment error: {e.response.status_code} - {detail}")
            return None
        except Exception as e:
            logger.error(f"cancel_appointment error: {e}")
            return None

    async def reschedule_appointment(
        self,
        appointment_id: str,
        new_date: str,
        new_time: str,
        staff_id: str = None
    ) -> Optional[Dict]:
        """Reschedule an appointment"""
        try:
            params = {
                "new_date": new_date,
                "new_time": new_time
            }
            if staff_id:
                params["staff_id"] = staff_id

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/agent/appointments/{appointment_id}/reschedule",
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            detail = self._extract_error(e)
            logger.error(f"reschedule_appointment error: {e.response.status_code} - {detail}")
            return None
        except Exception as e:
            logger.error(f"reschedule_appointment error: {e}")
            return None

    # =========================================================================
    # KNOWLEDGE BASE
    # =========================================================================

    async def search_knowledge_base(self, business_id: str, query: str) -> List[Dict]:
        """Search FAQs"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/knowledge-base/search/{business_id}",
                    params={"q": query}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"search_knowledge_base error: {e}")
            return []

    # =========================================================================
    # CALL LOGGING
    # =========================================================================

    async def log_call_start(
        self,
        business_id: str,
        caller_phone: str,
        customer_id: str = None,
        role_id: str = None
    ) -> Optional[Dict]:
        """Create call log entry"""
        try:
            data = {
                "business_id": business_id,
                "caller_phone": caller_phone,
                "call_direction": "inbound"
            }
            if customer_id:
                data["customer_id"] = customer_id
            if role_id:
                data["current_role_id"] = role_id

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/calls/log",
                    json=data
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"log_call_start error: {e}")
            return None

    async def log_call_end(
        self,
        call_log_id: str,
        call_duration: int,
        outcome: str,
        transcript: str = None,
        customer_id: str = None
    ) -> Optional[Dict]:
        """Update call log when call ends"""
        try:
            data = {
                "call_status": "completed",
                "call_duration": call_duration,
                "outcome": outcome,
                "ended_at": datetime.utcnow().isoformat()
            }
            if transcript:
                data["transcript"] = transcript
            if customer_id:
                data["customer_id"] = customer_id

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.put(
                    f"{self.base_url}/api/calls/log/{call_log_id}",
                    json=data
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"log_call_end error: {e}")
            return None
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _extract_error(self, e: httpx.HTTPStatusError) -> str:
        """Extract error detail from HTTP error"""
        try:
            return e.response.json().get("detail", str(e))
        except:
            return str(e)
