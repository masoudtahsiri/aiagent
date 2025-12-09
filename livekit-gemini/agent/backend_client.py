"""Backend API client for AI agent"""

import httpx

import logging

from typing import Optional, Dict, List



logger = logging.getLogger(__name__)





class BackendClient:

    """Client to communicate with FastAPI backend"""

    

    def __init__(self, base_url: str = "http://localhost:8000"):

        self.base_url = base_url

        self.timeout = 10.0

    

    # ==================== BUSINESS LOOKUP ====================

    

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

            logger.error(f"Error looking up business by phone: {e}")

            raise

    

    # ==================== CUSTOMER ====================

    

    async def lookup_customer(self, phone: str, business_id: str) -> Dict:

        """Check if customer exists by phone number"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                response = await client.post(

                    f"{self.base_url}/api/customers/lookup",

                    json={"phone": phone, "business_id": business_id}

                )

                response.raise_for_status()

                return response.json()

        except Exception as e:

            logger.error(f"Error looking up customer: {e}")

            return {"exists": False, "customer": None}

    

    async def create_customer(

        self,

        business_id: str,

        phone: str,

        first_name: str,

        last_name: str,

        date_of_birth: str = None,

        address: str = None,

        city: str = None,

        email: Optional[str] = None

    ) -> Optional[Dict]:

        """Create a new customer"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                customer_data = {

                    "business_id": business_id,

                    "phone": phone,

                    "first_name": first_name,

                    "last_name": last_name,

                }

                if date_of_birth:

                    customer_data["date_of_birth"] = date_of_birth

                if address:

                    customer_data["address"] = address

                if city:

                    customer_data["city"] = city

                if email:

                    customer_data["email"] = email

                

                response = await client.post(

                    f"{self.base_url}/api/customers/create",

                    json=customer_data

                )

                response.raise_for_status()

                return response.json()

        except httpx.HTTPStatusError as e:

            error_detail = "Unknown error"

            try:

                error_response = e.response.json()

                error_detail = error_response.get("detail", str(e))

            except:

                error_detail = str(e)

            logger.error(f"Error creating customer: {e.response.status_code} - {error_detail}")

            return None

        except Exception as e:

            logger.error(f"Error creating customer: {e}")

            return None

    

    async def update_customer(

        self,

        customer_id: str,

        update_data: dict

    ) -> Optional[Dict]:

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

            logger.error(f"Error updating customer: {e}")

            return None

    

    # ==================== APPOINTMENTS ====================

    

    async def get_available_slots(

        self,

        staff_id: str,

        start_date: str,

        end_date: Optional[str] = None

    ) -> List[Dict]:

        """Get available appointment slots"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                params = {"start_date": start_date}

                if end_date:

                    params["end_date"] = end_date

                

                response = await client.get(

                    f"{self.base_url}/api/appointments/staff/{staff_id}/slots",

                    params=params

                )

                response.raise_for_status()

                return response.json()

        except Exception as e:

            logger.error(f"Error getting slots: {e}")

            return []

    

    async def book_appointment(

        self,

        business_id: str,

        customer_id: str,

        staff_id: str,

        appointment_date: str,

        appointment_time: str,

        duration_minutes: int = 30,

        service_id: Optional[str] = None,

        notes: Optional[str] = None

    ) -> Optional[Dict]:

        """Book an appointment (uses agent endpoint - no auth)"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

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

                

                response = await client.post(

                    f"{self.base_url}/api/agent/appointments/book",

                    params=params

                )

                response.raise_for_status()

                return response.json()

        except httpx.HTTPStatusError as e:

            error_detail = "Unknown error"

            try:

                error_response = e.response.json()

                error_detail = error_response.get("detail", str(e))

            except:

                error_detail = str(e)

            logger.error(f"Error booking appointment: {e.response.status_code} - {error_detail}")

            return None

        except Exception as e:

            logger.error(f"Error booking appointment: {e}")

            return None

    

    async def get_customer_appointments(

        self,

        customer_id: str,

        upcoming_only: bool = True

    ) -> List[Dict]:

        """Get appointments for a customer"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                params = {"upcoming_only": upcoming_only}

                response = await client.get(

                    f"{self.base_url}/api/agent/appointments/customer/{customer_id}",

                    params=params

                )

                response.raise_for_status()

                return response.json()

        except Exception as e:

            logger.error(f"Error getting customer appointments: {e}")

            return []

    

    async def cancel_appointment(

        self,

        appointment_id: str,

        cancellation_reason: Optional[str] = None

    ) -> Optional[Dict]:

        """Cancel an appointment"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                params = {}

                if cancellation_reason:

                    params["cancellation_reason"] = cancellation_reason

                

                response = await client.post(

                    f"{self.base_url}/api/agent/appointments/{appointment_id}/cancel",

                    params=params

                )

                response.raise_for_status()

                return response.json()

        except httpx.HTTPStatusError as e:

            error_detail = "Unknown error"

            try:

                error_response = e.response.json()

                error_detail = error_response.get("detail", str(e))

            except:

                error_detail = str(e)

            logger.error(f"Error cancelling appointment: {e.response.status_code} - {error_detail}")

            return None

        except Exception as e:

            logger.error(f"Error cancelling appointment: {e}")

            return None

    

    async def reschedule_appointment(

        self,

        appointment_id: str,

        new_date: str,

        new_time: str,

        staff_id: Optional[str] = None

    ) -> Optional[Dict]:

        """Reschedule an appointment"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                params = {

                    "new_date": new_date,

                    "new_time": new_time

                }

                if staff_id:

                    params["staff_id"] = staff_id

                

                response = await client.post(

                    f"{self.base_url}/api/agent/appointments/{appointment_id}/reschedule",

                    params=params

                )

                response.raise_for_status()

                return response.json()

        except httpx.HTTPStatusError as e:

            error_detail = "Unknown error"

            try:

                error_response = e.response.json()

                error_detail = error_response.get("detail", str(e))

            except:

                error_detail = str(e)

            logger.error(f"Error rescheduling appointment: {e.response.status_code} - {error_detail}")

            return None

        except Exception as e:

            logger.error(f"Error rescheduling appointment: {e}")

            return None

    

    # ==================== SERVICES ====================

    

    async def get_services(self, business_id: str) -> List[Dict]:

        """Get services for a business"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                response = await client.get(

                    f"{self.base_url}/api/services/business/{business_id}"

                )

                response.raise_for_status()

                return response.json()

        except Exception as e:

            logger.error(f"Error getting services: {e}")

            return []

    

    # ==================== KNOWLEDGE BASE ====================

    

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

            logger.error(f"Error searching knowledge base: {e}")

            return []

    

    # ==================== BUSINESS INFO ====================

    

    async def get_business_hours(self, business_id: str) -> List[Dict]:

        """Get business hours"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                response = await client.get(

                    f"{self.base_url}/api/business-hours/{business_id}"

                )

                response.raise_for_status()

                return response.json()

        except Exception as e:

            logger.error(f"Error getting business hours: {e}")

            return []

    

    # ==================== CALL LOGGING ====================

    

    async def log_call_start(

        self,

        business_id: str,

        caller_phone: str,

        customer_id: Optional[str] = None,

        role_id: Optional[str] = None

    ) -> Optional[Dict]:

        """Create call log entry when call starts"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                call_data = {

                    "business_id": business_id,

                    "caller_phone": caller_phone,

                    "call_direction": "inbound"

                }

                if customer_id:

                    call_data["customer_id"] = customer_id

                if role_id:

                    call_data["current_role_id"] = role_id

                

                response = await client.post(

                    f"{self.base_url}/api/calls/log",

                    json=call_data

                )

                response.raise_for_status()

                return response.json()

        except Exception as e:

            logger.error(f"Error logging call start: {e}")

            return None

    

    async def log_call_end(

        self,

        call_log_id: str,

        call_duration: int,

        outcome: str,

        transcript: Optional[str] = None,

        customer_id: Optional[str] = None

    ) -> Optional[Dict]:

        """Update call log when call ends"""

        try:

            async with httpx.AsyncClient(timeout=self.timeout) as client:

                from datetime import datetime

                update_data = {

                    "call_status": "completed",

                    "call_duration": call_duration,

                    "outcome": outcome,

                    "ended_at": datetime.utcnow().isoformat()

                }

                if transcript:

                    update_data["transcript"] = transcript

                if customer_id:

                    update_data["customer_id"] = customer_id

                

                response = await client.put(

                    f"{self.base_url}/api/calls/log/{call_log_id}",

                    json=update_data

                )

                response.raise_for_status()

                return response.json()

        except Exception as e:

            logger.error(f"Error logging call end: {e}")

            return None
