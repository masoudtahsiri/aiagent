#!/usr/bin/env python3

"""

Reminder Worker - Processes and sends scheduled reminders



Run with: python -m backend.workers.reminder_worker



Should be run as a cron job or background process.

"""

import asyncio

import logging

from datetime import datetime



# Add parent directory to path for imports

import sys

from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))



from backend.database.supabase_client import get_db

from backend.services.reminder_service import ReminderService

from backend.services.notification_service import NotificationService



logging.basicConfig(

    level=logging.INFO,

    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"

)

logger = logging.getLogger("reminder-worker")





async def process_reminders():

    """Process pending reminders"""

    db = get_db()

    

    logger.info("Fetching pending reminders...")

    

    # Get pending reminders that are due

    reminders = await ReminderService.get_pending_reminders(limit=100)

    

    if not reminders:

        logger.info("No pending reminders to process")

        return

    

    logger.info(f"Processing {len(reminders)} reminders...")

    

    for reminder in reminders:

        try:

            appointment = reminder.get("appointments")

            customer = reminder.get("customers")

            

            if not appointment or not customer:

                logger.warning(f"Missing data for reminder {reminder['id']}")

                await ReminderService.mark_reminder_failed(reminder["id"], "Missing appointment or customer data")

                continue

            

            # Get business info

            business_result = db.table("businesses").select("*").eq("id", appointment["business_id"]).execute()

            business = business_result.data[0] if business_result.data else {}

            

            # Send the reminder

            success = await NotificationService.send_appointment_reminder(

                reminder=reminder,

                appointment=appointment,

                customer=customer,

                business=business

            )

            

            if success:

                await ReminderService.mark_reminder_sent(reminder["id"])

                logger.info(f"Sent reminder {reminder['id']} ({reminder['reminder_type']})")

            else:

                await ReminderService.mark_reminder_failed(reminder["id"], "Failed to send")

                logger.warning(f"Failed to send reminder {reminder['id']}")

        

        except Exception as e:

            logger.error(f"Error processing reminder {reminder['id']}: {e}")

            await ReminderService.mark_reminder_failed(reminder["id"], str(e))





async def main():

    """Main worker loop"""

    logger.info("========================================")

    logger.info("  REMINDER WORKER STARTED")

    logger.info("========================================")

    

    while True:

        try:

            await process_reminders()

        except Exception as e:

            logger.error(f"Error in reminder worker: {e}")

        

        # Wait 60 seconds before next check

        await asyncio.sleep(60)





if __name__ == "__main__":

    asyncio.run(main())

























