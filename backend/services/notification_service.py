"""Notification service for emails and SMS"""

import logging

from typing import Optional

from datetime import datetime



from backend.database.supabase_client import get_db



logger = logging.getLogger(__name__)





class NotificationService:

    """Handles sending notifications (email, SMS)"""

    

    @staticmethod

    async def send_appointment_confirmation(

        appointment: dict,

        customer: dict,

        staff: dict,

        business: dict

    ) -> bool:

        """Send appointment confirmation to customer"""

        db = get_db()

        

        # Get email template

        template_result = db.table("email_templates").select("*").eq(

            "business_id", appointment["business_id"]

        ).eq("template_type", "appointment_confirmation").eq("is_active", True).execute()

        

        if not template_result.data:

            logger.warning(f"No confirmation template for business {appointment['business_id']}")

            return False

        

        template = template_result.data[0]

        

        # Format the email

        date_obj = datetime.strptime(appointment["appointment_date"], "%Y-%m-%d")

        formatted_date = date_obj.strftime("%A, %B %d, %Y")

        

        subject = template["subject"].format(

            business_name=business.get("business_name", ""),

            date=formatted_date

        )

        

        body = template["body_html"].format(

            customer_name=f"{customer.get('first_name', '')} {customer.get('last_name', '')}",

            business_name=business.get("business_name", ""),

            staff_name=staff.get("name", ""),

            date=formatted_date,

            time=appointment["appointment_time"][:5],

            address=business.get("address", ""),

            phone=business.get("phone_number", "")

        )

        

        # TODO: Actually send email via SendGrid/SES/etc.

        # For now, just log it

        logger.info(f"Would send confirmation email to {customer.get('email')}")

        logger.info(f"Subject: {subject}")

        

        # Update appointment flag

        db.table("appointments").update({

            "reminder_sent_email": True

        }).eq("id", appointment["id"]).execute()

        

        return True

    

    @staticmethod

    async def send_appointment_reminder(

        reminder: dict,

        appointment: dict,

        customer: dict,

        business: dict

    ) -> bool:

        """Send appointment reminder"""

        db = get_db()

        

        if reminder["reminder_type"] == "email":

            # Get email template

            template_result = db.table("email_templates").select("*").eq(

                "business_id", appointment["business_id"]

            ).eq("template_type", "appointment_reminder").eq("is_active", True).execute()

            

            if template_result.data:

                template = template_result.data[0]

                # TODO: Send email

                logger.info(f"Would send reminder email to {customer.get('email')}")

                return True

        

        elif reminder["reminder_type"] == "sms":

            # Get SMS template

            template_result = db.table("sms_templates").select("*").eq(

                "business_id", appointment["business_id"]

            ).eq("template_type", "appointment_reminder").eq("is_active", True).execute()

            

            if template_result.data:

                template = template_result.data[0]

                # TODO: Send SMS via Twilio/etc.

                logger.info(f"Would send reminder SMS to {customer.get('phone')}")

                return True

        

        return False

    

    @staticmethod

    async def trigger_webhook(

        business_id: str,

        webhook_type: str,

        payload: dict

    ) -> bool:

        """Trigger n8n webhook"""

        db = get_db()

        

        # Get webhook URL

        webhook_result = db.table("n8n_webhooks").select("*").eq(

            "business_id", business_id

        ).eq("webhook_type", webhook_type).eq("is_active", True).execute()

        

        if not webhook_result.data:

            return False

        

        webhook = webhook_result.data[0]

        

        # TODO: Make HTTP POST to webhook URL

        logger.info(f"Would trigger webhook: {webhook['webhook_url']}")

        

        # Log the webhook call

        db.table("webhook_logs").insert({

            "webhook_id": webhook["id"],

            "payload": payload,

            "response_status": 200,  # Placeholder

            "success": True

        }).execute()

        

        return True



































