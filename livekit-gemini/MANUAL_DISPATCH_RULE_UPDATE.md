# Manual Dispatch Rule Update - Quick Reference

## Option 1: Automated Script (Recommended)

Run the automated script on your VPS:

```bash
cd /opt/livekit-gemini
./recreate_dispatch_rule.sh
```

This script will:
- List existing dispatch rules
- Delete the old rule (by name or ID)
- Rebuild the agent container
- Run deploy.sh to create the new rule
- Verify the new rule is active

## Option 2: Manual Commands

If you prefer to run commands manually, follow these steps:

### Step 1: Navigate and Load Environment
```bash
cd /opt/livekit-gemini
source .env
```

### Step 2: List Existing Dispatch Rules
```bash
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch list
```

### Step 3: Delete the Old Rule

**Option A: Delete by name (if it's named "phone-number-routing")**
```bash
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch delete phone-number-routing
```

**Option B: Delete by ID (from the list in Step 2)**
```bash
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch delete <DISPATCH_RULE_ID>
```

Replace `<DISPATCH_RULE_ID>` with the actual ID from the list.

### Step 4: Rebuild Agent Container
```bash
docker-compose build agent
```

### Step 5: Deploy New Configuration
```bash
./deploy.sh
```

This will create the new dispatch rule with `dispatch_rule_individual` configuration.

### Step 6: Verify (Optional)
```bash
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch list
```

You should see a rule named `phone-number-routing` with the new configuration.

## Troubleshooting

### If `lk` command not found:
```bash
curl -sSL https://get.livekit.io/cli | bash
```

### If delete fails:
- Make sure you're using the correct ID or name
- Check that LiveKit services are running: `docker-compose ps`
- Verify API credentials in `.env` file

### If deploy.sh fails:
- Check logs: `docker-compose logs`
- Verify `.env` file has correct credentials
- Ensure all required services are running

## Expected Output

After successful deployment, when you list dispatch rules, you should see:

```
phone-number-routing
  Rule: dispatch_rule_individual
  Room Prefix: sip-call-
  Agents: ai-receptionist
```

## Next Steps

After updating the dispatch rule:
1. Monitor agent logs: `docker-compose logs -f agent`
2. Make a test call
3. Verify in logs that:
   - Room name starts with `sip-call-`
   - Participant attributes show `sip.toUser` with the called number
   - Called number is extracted successfully

