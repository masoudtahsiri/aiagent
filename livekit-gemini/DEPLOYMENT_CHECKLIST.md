# SIP Template Fix - Deployment Checklist

## ✅ Implementation Complete

All fixes have been implemented and verified:

- [x] `dispatch_rule_individual` configured in `deploy.sh`
- [x] `extract_called_number()` updated to read from participant attributes
- [x] Multiple fallback methods for phone extraction
- [x] Template variable rejection implemented
- [x] Helper scripts created
- [x] Documentation added

## 🚀 Deployment Steps (On VPS)

### Step 1: Transfer Files (if needed)
If you've made changes locally, transfer them to the server:

```bash
# From local machine
scp -r livekit-gemini/* user@your-vps:/opt/livekit-gemini/
```

### Step 2: SSH to VPS
```bash
ssh user@your-vps
cd /opt/livekit-gemini
```

### Step 3: Verify Implementation
```bash
./verify_deployment.sh
```

### Step 4: Deploy
```bash
./deploy.sh
```

This will:
- Stop old services
- Build containers
- Create/update SIP dispatch rule with `dispatch_rule_individual`
- Start services
- Enable systemd service

### Step 5: Verify Dispatch Rule
```bash
source .env
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch list
```

You should see a rule named `phone-number-routing` with `dispatch_rule_individual` configuration.

### Step 6: Monitor Logs
```bash
docker-compose logs -f agent
```

### Step 7: Test Call
Make a test call to your SIP number and watch the logs. You should see:

```
Room name: sip-call-<unique-id>
Participant attributes: {'sip.toUser': '903322379153', ...}
Found 'sip.toUser' in attributes: 903322379153
Called number: +903322379153
```

## 🔧 Troubleshooting

### If dispatch rule needs manual management:
```bash
./manage_dispatch_rules.sh
```

### If called number not extracted:
1. Check logs for debug output:
   ```bash
   docker-compose logs agent | grep -A 20 "DEBUG: Could not find called number"
   ```

2. Verify participant attributes:
   ```bash
   docker-compose logs agent | grep "Participant attributes"
   ```

3. Check dispatch rule is active:
   ```bash
   lk sip dispatch list
   ```

### If agent not being dispatched:
- Verify agent name matches: `ai-receptionist`
- Check dispatch rule has `agent_name` in `room_config.agents`
- Restart services: `docker-compose restart`

## 📋 Files Changed

1. **`agent/agent.py`** - Updated `extract_called_number()` function
2. **`deploy.sh`** - Updated dispatch rule to use `dispatch_rule_individual`
3. **`manage_dispatch_rules.sh`** - New helper script (optional)
4. **`verify_deployment.sh`** - New verification script
5. **`SIP_TEMPLATE_FIX.md`** - Documentation

## ✨ Key Improvements

| Before | After |
|--------|-------|
| Relied on `{{.sip.toUser}}` template | Reads from `participant.attributes['sip.toUser']` |
| Template expansion issues | Direct attribute access (reliable) |
| Single extraction method | Multiple fallback methods |
| No debug logging | Comprehensive debug output |

## 🎯 Expected Results

After deployment:
- ✅ Each call gets unique room: `sip-call-<id>`
- ✅ Called number extracted from participant attributes
- ✅ Business lookup works correctly
- ✅ No template expansion errors
- ✅ Detailed logging for debugging

## 📞 Testing

1. Make a test call to your SIP number
2. Watch agent logs in real-time
3. Verify:
   - Room name format: `sip-call-*`
   - Participant attributes logged
   - Called number extracted successfully
   - Business routing works
   - Agent responds correctly

---

**Status**: Ready for deployment ✅

