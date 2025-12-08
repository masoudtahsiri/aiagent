import httpx
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class BackendClient:
    """Client to communicate with FastAPI backend"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.timeout = 10.0
    
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
                    "email": email
                }
                customer_data = {k: v for k, v in customer_data.items() if v is not None}
                
                response = await client.post(
                    f"{self.base_url}/api/customers",
                    json=customer_data
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error creating customer: {e}")
            return None
    
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
        duration_minutes: int = 30
    ) -> Optional[Dict]:
        """Book an appointment"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                appointment_data = {
                    "business_id": business_id,
                    "customer_id": customer_id,
                    "staff_id": staff_id,
                    "appointment_date": appointment_date,
                    "appointment_time": appointment_time,
                    "duration_minutes": duration_minutes
                }
                
                response = await client.post(
                    f"{self.base_url}/api/appointments",
                    json=appointment_data
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error booking appointment: {e}")
            return None

