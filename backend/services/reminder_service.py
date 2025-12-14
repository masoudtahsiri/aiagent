"""Reminder service"""

from fastapi import HTTPException, status

from typing import List, Optional

from datetime import datetime, timedelta



from backend.database.supabase_client import get_db





class ReminderService:

    

    @staticmethod

    async def create_reminders_for_appointment(appointment: dict) -> List[dict]:

        """Create reminder records for an appointment"""

        db = get_db()

        

        reminders = []

        appointment_datetime = datetime.strptime(

            f"{appointment['appointment_date']} {appointment['appointment_time']}", 

            "%Y-%m-%d %H:%M:%S"

        )

        

        # 24 hour reminder - email

        reminder_24h = {

            "business_id": appointment["business_id"],

            "appointment_id": appointment["id"],

            "customer_id": appointment["customer_id"],

            "reminder_type": "email",

            "reminder_timing": 24,

            "scheduled_for": (appointment_datetime - timedelta(hours=24)).isoformat(),

            "status": "pending"

        }

        reminders.append(reminder_24h)

        

        # 1 hour reminder - sms

        reminder_1h = {

            "business_id": appointment["business_id"],

            "appointment_id": appointment["id"],

            "customer_id": appointment["customer_id"],

            "reminder_type": "sms",

            "reminder_timing": 1,

            "scheduled_for": (appointment_datetime - timedelta(hours=1)).isoformat(),

            "status": "pending"

        }

        reminders.append(reminder_1h)

        

        # Insert all reminders

        result = db.table("reminders").insert(reminders).execute()

        

        return result.data if result.data else []

    

    @staticmethod

    async def get_pending_reminders(limit: int = 100) -> List[dict]:

        """Get pending reminders that are due (for worker)"""

        db = get_db()

        

        now = datetime.utcnow().isoformat()

        

        result = db.table("reminders").select(

            "*, appointments(*), customers(first_name, last_name, phone, email)"

        ).eq("status", "pending").lte("scheduled_for", now).limit(limit).execute()

        

        return result.data if result.data else []

    

    @staticmethod

    async def mark_reminder_sent(reminder_id: str) -> dict:

        """Mark reminder as sent"""

        db = get_db()

        

        result = db.table("reminders").update({

            "status": "sent",

            "sent_at": datetime.utcnow().isoformat()

        }).eq("id", reminder_id).execute()

        

        return result.data[0] if result.data else {}

    

    @staticmethod

    async def mark_reminder_failed(reminder_id: str, error_message: str) -> dict:

        """Mark reminder as failed"""

        db = get_db()

        

        result = db.table("reminders").update({

            "status": "failed",

            "error_message": error_message

        }).eq("id", reminder_id).execute()

        

        return result.data[0] if result.data else {}

    

    @staticmethod

    async def cancel_appointment_reminders(appointment_id: str) -> int:

        """Cancel all pending reminders for an appointment"""

        db = get_db()

        

        result = db.table("reminders").update({

            "status": "cancelled"

        }).eq("appointment_id", appointment_id).eq("status", "pending").execute()

        

        return len(result.data) if result.data else 0









