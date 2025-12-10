# Server Log Report
**Generated:** December 10, 2025 08:47 UTC  
**Server:** 185.8.130.155:35655

---

## 📊 System Status

### Server Health
- **Uptime:** 2 days, 12 hours, 1 minute
- **Load Average:** 0.17, 0.46, 0.30
- **Memory:** 1.0GB used / 1.9GB total (694MB available)
- **Disk Usage:** 28GB used / 37GB total (78% used, 7.9GB available)

### Running Services

#### Docker Containers
```
✅ livekit-gemini-sip-1       - Up 2 minutes
✅ livekit-gemini-agent-1      - Up 2 minutes  
✅ livekit-gemini-livekit-1    - Up 2 minutes
✅ livekit-gemini-redis-1      - Up 2 minutes (healthy)
✅ n8n-postgres-1              - Up 46 hours
✅ n8n-n8n-1                   - Up 46 hours (Port 5678)
```

#### Systemd Services
```
✅ aiagent-backend.service     - Active (running) since 08:40:53
   - PID: 1066820
   - Memory: 63.0M
   - CPU: 1.704s
   - Status: Healthy
```

---

## 🔄 Backend Service Logs

### Recent Activity (Last 24 Hours)

#### Service Restarts
- **Dec 10 00:25:32** - Service restarted (deployment)
- **Dec 10 00:27:43** - Service restarted (deployment)
- **Dec 10 00:30:29** - Service restarted (deployment)
- **Dec 10 01:26:17** - Service restarted (deployment)
- **Dec 10 08:40:55** - Service restarted (deployment) ⬅️ **Current**

#### API Requests (Recent)
```
Dec 10 08:45:13 - GET /health → 200 OK
Dec 10 08:46:06 - POST /api/ai/lookup-by-phone → 200 OK
Dec 10 08:46:07 - POST /api/customers/lookup → 200 OK
Dec 10 08:46:08 - GET /api/agent/appointments/customer-context/{id} → 200 OK ✅
Dec 10 08:46:09 - POST /api/calls/log → 200 OK
```

#### Previous Issues (Resolved)
- **Dec 09 21:21-23:55** - Multiple 404 errors on `/api/ai/lookup-by-phone` (before deployment)
- **Dec 10 00:37-00:41** - Successful requests after deployment

---

## 🤖 Agent Service Logs

### Agent Status
- **Agent Name:** ai-receptionist
- **Worker ID:** AW_foK5b4TwtuiN
- **Status:** ✅ Running and registered
- **HTTP Server:** Listening on :8081
- **VAD Model:** ✅ Loaded and ready

### Recent Call Activity

#### Call #1 - Dec 10 05:46:02
```
📞 Call Details:
   - Room: sip-call-_905397293667_W5Me55RUuMWh
   - Caller: +905397293667
   - Called: +903322379153
   - Business: Bright Smile Dental (931211d9-e024-4897-ae46-ad60b8009399)
   - Customer: Masoud (existing customer)
   - Customer Context: ✅ Loaded (2 recent appointments, tags: [])
   - System Prompt: 4321 chars
   - Tools Loaded: 10 tools (existing_customer=True)
   - Voice: Kore
   - Status: ✅ Completed successfully
   - Duration: ~19 seconds
   - Disconnect: Client initiated (normal)
```

#### Call Flow
1. **05:46:02** - Call received, room created
2. **05:46:02** - Phone numbers extracted
3. **05:46:06** - Business config loaded
4. **05:46:07** - Customer identified (existing)
5. **05:46:08** - Customer context loaded ✅
6. **05:46:08** - System prompt built (4321 chars)
7. **05:46:09** - Agent session started
8. **05:46:09** - Audio track subscribed ✅
9. **05:46:19** - Greeting sent
10. **05:46:21** - Call ended (client disconnect)

### Warnings
```
⚠️ WARNING: allow_interruptions cannot be False when using VoiceAgent.generate_reply()
   - Recommendation: Disable turn_detection in RealtimeModel and use VAD instead
   - Impact: Low (greeting still works, but interruption handling may not be optimal)
```

---

## 🌐 LiveKit Server Logs

### Server Status
- **Version:** 1.9.7
- **Node ID:** ND_NmdAgJWBDojz
- **External IP:** 185.8.130.155
- **Ports:** 
  - HTTP: 7880
  - RTC TCP: 7881
  - ICE Range: 10000-20000

### SIP Configuration
- **Trunk:** bulutfon (ST_8vSSkdHoQTHQ)
- **Phone Number:** +903322379153
- **Dispatch Rule:** phone-number-routing (SDR_3PyT2VwcTykq)
- **Status:** ✅ Active

### Recent Activity
- **05:45:13** - SIP trunk created
- **05:45:13** - Dispatch rule created
- **05:46:02** - Room allocated for incoming call
- **05:46:02** - RTC session started
- **05:46:02** - Agent assigned to call
- **05:46:21** - Call ended (client disconnect)
- **05:46:41** - Room closed (departure timeout)

### Network Warnings (Non-Critical)
```
⚠️ Could not validate external IP (context canceled) - Normal during startup
⚠️ Data channel errors during disconnect - Normal cleanup behavior
```

---

## ⚠️ Errors & Warnings

### Critical Issues
**None** ✅

### Non-Critical Warnings

#### Network Dispatcher
```
- Multiple "Unknown index" warnings from networkd-dispatcher
- Impact: Low (network interface management, not affecting services)
- Frequency: Occasional during interface changes
```

#### Security Events
```
Dec 10 01:21:18 - Failed SSH login attempt from 78.172.246.204
- Action: Blocked (normal security behavior)
- Impact: None (failed authentication)
```

#### Backend Errors (Historical)
```
Dec 09 17:01:45 - Traceback (resolved)
Dec 09 18:04:37 - ASGI application exception (resolved)
- Status: These occurred before recent deployments
- Current Status: No active errors
```

---

## 📈 Performance Metrics

### Backend Service
- **Uptime:** 6 minutes (current session)
- **Memory Usage:** 63.0MB (stable)
- **CPU Usage:** 1.704s total
- **Response Times:** All requests < 1 second

### Agent Service
- **Startup Time:** ~4 seconds
- **VAD Load Time:** ~0.1-0.5 seconds
- **Call Processing:** Normal
- **Memory:** Within normal limits

### System Resources
- **CPU Load:** Low (0.17 average)
- **Memory:** 1.0GB / 1.9GB (healthy)
- **Disk:** 78% used (7.9GB free - monitor)
- **Network:** Stable

---

## ✅ Recent Deployments

### Latest Deployment
- **Time:** Dec 10 08:40:53
- **Status:** ✅ Successful
- **Changes Applied:**
  - End call tool added
  - Greeting stability improvements
  - Customer context endpoint working
  - Session/room references stored

### Previous Deployments
- **Dec 10 01:26:17** - Customer preferences & context features
- **Dec 10 00:30:29** - Backend client refactoring
- **Dec 10 00:27:43** - Agent & tools refactoring

---

## 🔍 Key Observations

### ✅ Working Well
1. **Backend API** - All endpoints responding correctly
2. **Customer Context** - New endpoint working (200 OK)
3. **Agent Calls** - Successfully processing calls
4. **SIP Integration** - Trunk and dispatch rules active
5. **Audio Streaming** - Audio tracks subscribing correctly
6. **Greeting Delivery** - Improved with subscription wait

### ⚠️ Areas to Monitor
1. **Disk Space** - 78% used, consider cleanup if approaching 85%
2. **Interruption Handling** - Warning about `allow_interruptions=False` (non-critical)
3. **Network Dispatcher** - Frequent warnings (investigate if persistent)

### 📝 Recommendations
1. ✅ **Current Status:** All systems operational
2. 📊 **Monitor:** Disk usage (currently acceptable)
3. 🔧 **Optional:** Address interruption handling warning for optimal UX
4. 🔒 **Security:** Failed login attempts are being blocked correctly

---

## 📞 Call Statistics

### Recent Calls
- **Total Calls (Last 24h):** 1+ (at least 1 confirmed)
- **Success Rate:** 100%
- **Average Call Duration:** ~19 seconds (sample)
- **Customer Recognition:** ✅ Working (existing customer identified)
- **Context Loading:** ✅ Working (customer context loaded)

---

## 🎯 Summary

**Overall Status:** ✅ **HEALTHY**

- All services running normally
- Recent deployments successful
- No critical errors
- API endpoints responding correctly
- Agent processing calls successfully
- Customer context feature working
- SIP integration stable

**Action Items:**
- None required (all systems operational)
- Optional: Monitor disk usage
- Optional: Address interruption handling warning

---

*Report generated from server logs on December 10, 2025*

