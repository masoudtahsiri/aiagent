# Backend Integration Guide

This guide explains how to integrate the LiveKit agent with the FastAPI backend.

## Files Created

1. **`agent/backend_client.py`** - HTTP client for FastAPI backend
2. **`agent/tools.py`** - Gemini function calling definitions
3. **`agent/agent.py`** - Updated agent with backend integration
4. **`.env.template`** - Environment variable template

## Setup Instructions

### 1. Update `.env` File

On your VPS, edit `/opt/livekit-gemini/.env` and add:

```bash
# Backend API Configuration
BACKEND_URL=http://localhost:8000
BUSINESS_ID=931211d9-e024-4897-ae46-ad60b8009399
STAFF_ID=bc019d0e-2f81-4b59-8d9a-1b7972171d97
```

**Note:** If your backend is running on a different host, update `BACKEND_URL` accordingly (e.g., `http://your-backend-ip:8000`).

### 2. Rebuild Docker Container

Since we added new dependencies (`httpx`), rebuild the agent container:

```bash
cd /opt/livekit-gemini
docker-compose build agent
docker-compose restart agent
```

### 3. Verify Backend is Running

Make sure your FastAPI backend is running and accessible:

```bash
# Test from VPS
curl http://localhost:8000/health
```

If backend is on a different machine, ensure:
- Firewall allows port 8000
- Backend CORS is configured to allow requests from agent

## How It Works

### Call Flow

1. **Caller calls phone number** → SIP trunk routes to LiveKit SIP
2. **LiveKit SIP** → Creates room and connects to agent
3. **Agent extracts phone number** from participant identity
4. **Agent looks up customer** in backend database
5. **If new customer**: Collects name/email, creates customer record
6. **If existing customer**: Greets by name
7. **When booking appointment**:
   - Checks available slots via backend API
   - Books appointment via backend API
   - Confirms booking to caller

### Function Calling

The agent uses Gemini's function calling feature to:
- `create_new_customer` - Save new customer info
- `check_availability` - Get available appointment slots
- `book_appointment` - Book an appointment

### Backend API Endpoints Used

- `POST /api/customers/lookup` - Check if customer exists
- `POST /api/customers` - Create new customer
- `GET /api/appointments/staff/{staff_id}/slots` - Get available slots
- `POST /api/appointments` - Book appointment

## Testing

1. **Test customer lookup**:
   ```bash
   curl -X POST http://localhost:8000/api/customers/lookup \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890", "business_id": "YOUR_BUSINESS_ID"}'
   ```

2. **Test appointment booking**:
   ```bash
   curl -X POST http://localhost:8000/api/appointments \
     -H "Content-Type: application/json" \
     -d '{
       "business_id": "YOUR_BUSINESS_ID",
       "customer_id": "YOUR_CUSTOMER_ID",
       "staff_id": "YOUR_STAFF_ID",
       "appointment_date": "2025-12-10",
       "appointment_time": "10:00",
       "duration_minutes": 30
     }'
   ```

3. **Make a test call** to your phone number and verify:
   - Customer lookup works
   - New customers are created
   - Appointments can be booked

## Troubleshooting

### Agent can't connect to backend

- Check `BACKEND_URL` in `.env`
- Verify backend is running: `curl http://localhost:8000/health`
- Check Docker network: Agent uses `host` network mode, so `localhost` should work
- Check backend logs for errors

### Function calls not working

- Check agent logs: `docker-compose logs -f agent`
- Verify `tools` parameter is passed to `RealtimeModel`
- Function calling API may vary by LiveKit version - check LiveKit Agents docs

### Customer lookup fails

- Verify phone number format matches database
- Check `BUSINESS_ID` is correct
- Ensure backend API is accessible

## Next Steps

1. **Generate time slots** for your staff:
   ```bash
   curl -X POST http://localhost:8000/api/staff/{staff_id}/generate-slots \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

2. **Test end-to-end** by making a phone call

3. **Monitor logs** during calls:
   ```bash
   docker-compose logs -f agent
   ```

