#!/usr/bin/env python3

"""

Analytics Worker - Aggregates daily metrics



Run with: python -m backend.workers.analytics_worker



Should be run once per day (e.g., at midnight via cron).

"""

import asyncio

import logging

from datetime import datetime, timedelta



import sys

from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))



from backend.database.supabase_client import get_db



logging.basicConfig(

    level=logging.INFO,

    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"

)

logger = logging.getLogger("analytics-worker")





async def aggregate_daily_metrics(target_date: str = None):

    """Aggregate metrics for a specific date"""

    db = get_db()

    

    if not target_date:

        # Default to yesterday

        target_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    

    logger.info(f"Aggregating metrics for {target_date}...")

    

    # Get all active businesses

    businesses_result = db.table("businesses").select("id").eq("is_active", True).execute()

    

    if not businesses_result.data:

        logger.info("No active businesses found")

        return

    

    for business in businesses_result.data:

        business_id = business["id"]

        

        try:

            # Count calls

            calls_result = db.table("call_logs").select("id, call_status, call_duration, outcome", count="exact").eq(

                "business_id", business_id

            ).gte("started_at", f"{target_date}T00:00:00").lt("started_at", f"{target_date}T23:59:59").execute()

            

            calls = calls_result.data or []

            total_calls = len(calls)

            successful_calls = len([c for c in calls if c.get("call_status") == "completed"])

            failed_calls = total_calls - successful_calls

            

            # Calculate average duration

            durations = [c["call_duration"] for c in calls if c.get("call_duration")]

            avg_duration = sum(durations) // len(durations) if durations else 0

            

            # Count appointments

            appointments_result = db.table("appointments").select("id, status", count="exact").eq(

                "business_id", business_id

            ).eq("appointment_date", target_date).execute()

            

            appointments = appointments_result.data or []

            appointments_booked = len([a for a in appointments if a.get("status") == "scheduled"])

            appointments_cancelled = len([a for a in appointments if a.get("status") == "cancelled"])

            

            # Count new customers

            customers_result = db.table("customers").select("id", count="exact").eq(

                "business_id", business_id

            ).gte("created_at", f"{target_date}T00:00:00").lt("created_at", f"{target_date}T23:59:59").execute()

            

            new_customers = customers_result.count or 0

            

            # Upsert metrics

            metrics_data = {

                "business_id": business_id,

                "metric_date": target_date,

                "total_calls": total_calls,

                "successful_calls": successful_calls,

                "failed_calls": failed_calls,

                "appointments_booked": appointments_booked,

                "appointments_cancelled": appointments_cancelled,

                "new_customers": new_customers,

                "avg_call_duration": avg_duration

            }

            

            # Check if exists

            existing = db.table("daily_metrics").select("id").eq(

                "business_id", business_id

            ).eq("metric_date", target_date).execute()

            

            if existing.data:

                db.table("daily_metrics").update(metrics_data).eq("id", existing.data[0]["id"]).execute()

            else:

                db.table("daily_metrics").insert(metrics_data).execute()

            

            logger.info(f"Metrics saved for business {business_id}: {total_calls} calls, {appointments_booked} appointments")

        

        except Exception as e:

            logger.error(f"Error aggregating metrics for business {business_id}: {e}")





async def main():

    """Main function"""

    logger.info("========================================")

    logger.info("  ANALYTICS WORKER")

    logger.info("========================================")

    

    await aggregate_daily_metrics()

    

    logger.info("Analytics aggregation complete")





if __name__ == "__main__":

    asyncio.run(main())


































