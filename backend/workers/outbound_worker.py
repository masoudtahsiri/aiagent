#!/usr/bin/env python3
"""
Outbound Call Worker

This service processes the outbound call queue and initiates AI calls to customers.

Features:
- Polls the outbound_calls table for pending calls
- Initiates SIP calls via LiveKit
- Handles retry logic for failed calls
- Updates call status and outcomes

Usage:
    python outbound_worker.py
    
Environment Variables:
    BACKEND_URL: Backend API URL
    LIVEKIT_URL: LiveKit server URL
    LIVEKIT_API_KEY: LiveKit API key
    LIVEKIT_API_SECRET: LiveKit API secret
    SIP_TRUNK_ID: Default SIP trunk ID (optional)
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List

import httpx
from dotenv import load_dotenv

# LiveKit imports
try:
    from livekit import api as lk_api
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False
    print("Warning: livekit-api not installed. Running in mock mode.")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("outbound-worker")

# Environment variables
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
SIP_TRUNK_ID = os.getenv("SIP_TRUNK_ID", "")

# Worker configuration
POLL_INTERVAL = int(os.getenv("OUTBOUND_POLL_INTERVAL", "30"))  # seconds
MAX_CONCURRENT_CALLS = int(os.getenv("OUTBOUND_MAX_CONCURRENT", "5"))
RETRY_DELAY_MINUTES = int(os.getenv("OUTBOUND_RETRY_DELAY", "120"))  # 2 hours


# ═══════════════════════════════════════════════════════════════════════════════
# BACKEND CLIENT (Simplified)
# ═══════════════════════════════════════════════════════════════════════════════

class OutboundBackendClient:
    """Simple HTTP client for outbound-related backend calls."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=30.0,
                headers={"Content-Type": "application/json"}
            )
        return self._client
    
    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    async def get_pending_calls(self, limit: int = 10) -> List[Dict]:
        """Get pending outbound calls that are due."""
        try:
            client = await self._get_client()
            response = await client.get(
                "/api/outbound/pending",
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get pending calls: {e}")
            return []
    
    async def update_call_status(
        self,
        call_id: str,
        status: str,
        **kwargs
    ) -> Optional[Dict]:
        """Update outbound call status."""
        try:
            client = await self._get_client()
            data = {"status": status, **kwargs}
            response = await client.put(
                f"/api/outbound/{call_id}",
                json=data
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to update call {call_id}: {e}")
            return None
    
    async def get_business_sip_trunk(self, business_id: str) -> Optional[str]:
        """Get SIP trunk ID for a business."""
        try:
            client = await self._get_client()
            response = await client.get(f"/api/businesses/{business_id}/sip-trunk")
            if response.status_code == 200:
                data = response.json()
                return data.get("sip_trunk_id")
            return None
        except Exception as e:
            logger.error(f"Failed to get SIP trunk: {e}")
            return None


# ═══════════════════════════════════════════════════════════════════════════════
# OUTBOUND WORKER
# ═══════════════════════════════════════════════════════════════════════════════

class OutboundWorker:
    """
    Processes the outbound call queue and initiates AI calls.
    
    The worker:
    1. Polls the database for pending outbound calls
    2. Initiates SIP calls via LiveKit
    3. The AI agent is automatically dispatched to the room
    4. Updates call status based on outcome
    """
    
    def __init__(
        self,
        backend: OutboundBackendClient,
        livekit_url: str,
        api_key: str,
        api_secret: str
    ):
        self.backend = backend
        self.lk_url = livekit_url
        
        # Initialize LiveKit API client
        if LIVEKIT_AVAILABLE and livekit_url and api_key:
            self.lk_api = lk_api.LiveKitAPI(livekit_url, api_key, api_secret)
        else:
            self.lk_api = None
            logger.warning("LiveKit API not available - running in mock mode")
        
        self.running = False
        self.active_calls: Dict[str, str] = {}  # call_id -> room_name
    
    async def start(self):
        """Start the worker loop."""
        self.running = True
        logger.info("=" * 60)
        logger.info("🚀 OUTBOUND WORKER STARTED")
        logger.info(f"   Backend: {BACKEND_URL}")
        logger.info(f"   LiveKit: {self.lk_url or 'Mock Mode'}")
        logger.info(f"   Poll Interval: {POLL_INTERVAL}s")
        logger.info(f"   Max Concurrent: {MAX_CONCURRENT_CALLS}")
        logger.info("=" * 60)
        
        while self.running:
            try:
                await self.process_queue()
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
            
            await asyncio.sleep(POLL_INTERVAL)
        
        logger.info("👋 Outbound worker stopped")
    
    async def stop(self):
        """Stop the worker."""
        self.running = False
    
    async def process_queue(self):
        """Process pending outbound calls."""
        # Check how many calls we can make
        available_slots = MAX_CONCURRENT_CALLS - len(self.active_calls)
        
        if available_slots <= 0:
            logger.debug(f"Max concurrent calls reached ({len(self.active_calls)})")
            return
        
        # Get pending calls
        calls = await self.backend.get_pending_calls(limit=available_slots)
        
        if not calls:
            logger.debug("No pending calls")
            return
        
        logger.info(f"📞 Processing {len(calls)} pending call(s)")
        
        # Process each call
        for call in calls:
            try:
                await self.initiate_call(call)
            except Exception as e:
                logger.error(f"Failed to process call {call.get('id')}: {e}")
                await self.handle_call_failure(call, str(e))
    
    async def initiate_call(self, call: Dict):
        """
        Initiate a single outbound call.
        
        Args:
            call: Outbound call record from database
        """
        call_id = call.get("id")
        phone = call.get("phone_number")
        business_id = call.get("business_id")
        customer_id = call.get("customer_id")
        call_type = call.get("call_type")
        
        # Get customer name for logging
        customer = call.get("customers", {})
        customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
        
        logger.info(f"📤 Initiating call: {call_id}")
        logger.info(f"   To: {phone} ({customer_name or 'Unknown'})")
        logger.info(f"   Type: {call_type}")
        
        # Mark as in progress
        await self.backend.update_call_status(
            call_id,
            status="in_progress",
            last_attempt_at=datetime.utcnow().isoformat()
        )
        
        # Create room name (agent will use this to identify outbound calls)
        room_name = f"outbound-{call_id}"
        
        # Get SIP trunk
        sip_trunk_id = await self.backend.get_business_sip_trunk(business_id)
        if not sip_trunk_id:
            sip_trunk_id = SIP_TRUNK_ID
        
        if not sip_trunk_id:
            raise ValueError("No SIP trunk configured")
        
        if self.lk_api:
            # Initiate real SIP call via LiveKit
            try:
                sip_participant = await self.lk_api.sip.create_sip_participant(
                    lk_api.CreateSIPParticipantRequest(
                        room_name=room_name,
                        sip_trunk_id=sip_trunk_id,
                        sip_call_to=phone,
                        participant_identity=f"customer_{customer_id}",
                        participant_name=customer_name or "Customer",
                        play_ringtone=True,
                        hide_phone_number=False,
                    )
                )
                
                logger.info(f"✅ SIP call initiated: {sip_participant.participant_id}")
                
                # Track active call
                self.active_calls[call_id] = room_name
                
                # The AI agent will be dispatched automatically by LiveKit
                # and will load context using the outbound call ID
                
            except Exception as e:
                logger.error(f"❌ SIP call failed: {e}")
                await self.handle_call_failure(call, str(e))
        else:
            # Mock mode - just log
            logger.info(f"📞 [MOCK] Would call {phone} for {call_type}")
            await asyncio.sleep(2)  # Simulate call setup
            
            # Mark as completed (in mock mode)
            await self.backend.update_call_status(
                call_id,
                status="completed",
                outcome="mock_completed",
                call_duration=0
            )
    
    async def handle_call_failure(self, call: Dict, error: str):
        """Handle a failed call attempt."""
        call_id = call.get("id")
        attempts = call.get("attempts", 0) + 1
        max_attempts = call.get("max_attempts", 3)
        
        if attempts >= max_attempts:
            # Max attempts reached
            logger.warning(f"❌ Call {call_id}: Max attempts ({max_attempts}) reached")
            await self.backend.update_call_status(
                call_id,
                status="max_attempts",
                attempts=attempts,
                notes=f"Max attempts reached. Last error: {error}"
            )
        else:
            # Schedule retry
            next_retry = datetime.utcnow() + timedelta(minutes=RETRY_DELAY_MINUTES)
            logger.info(f"🔄 Call {call_id}: Scheduling retry #{attempts + 1} at {next_retry}")
            
            await self.backend.update_call_status(
                call_id,
                status="pending",
                attempts=attempts,
                next_retry_at=next_retry.isoformat(),
                notes=f"Attempt {attempts} failed: {error}"
            )
        
        # Remove from active calls if present
        self.active_calls.pop(call_id, None)
    
    async def handle_call_completed(self, call_id: str, outcome: str, duration: int):
        """Handle a completed call (called by agent or webhook)."""
        logger.info(f"✅ Call {call_id} completed: {outcome} ({duration}s)")
        
        await self.backend.update_call_status(
            call_id,
            status="completed",
            outcome=outcome,
            call_duration=duration
        )
        
        # Remove from active calls
        self.active_calls.pop(call_id, None)
    
    async def handle_no_answer(self, call_id: str):
        """Handle a no-answer situation."""
        call = {"id": call_id, "attempts": 0, "max_attempts": 3}  # Would load from DB
        await self.handle_call_failure(call, "No answer")


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK SERVER (Optional)
# ═══════════════════════════════════════════════════════════════════════════════

async def health_check_server(worker: OutboundWorker, port: int = 8080):
    """Simple health check HTTP server."""
    from aiohttp import web
    
    async def health(request):
        return web.json_response({
            "status": "healthy",
            "running": worker.running,
            "active_calls": len(worker.active_calls)
        })
    
    async def metrics(request):
        return web.json_response({
            "active_calls": len(worker.active_calls),
            "call_ids": list(worker.active_calls.keys())
        })
    
    app = web.Application()
    app.router.add_get("/health", health)
    app.router.add_get("/metrics", metrics)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    
    logger.info(f"🏥 Health check server running on port {port}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

async def main():
    """Main entry point."""
    # Create backend client
    backend = OutboundBackendClient(BACKEND_URL)
    
    # Create worker
    worker = OutboundWorker(
        backend=backend,
        livekit_url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )
    
    # Start health check server (optional)
    health_port = int(os.getenv("HEALTH_CHECK_PORT", "0"))
    if health_port > 0:
        try:
            await health_check_server(worker, health_port)
        except ImportError:
            logger.warning("aiohttp not installed, skipping health check server")
    
    try:
        # Run worker
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await worker.stop()
        await backend.close()


if __name__ == "__main__":
    asyncio.run(main())

