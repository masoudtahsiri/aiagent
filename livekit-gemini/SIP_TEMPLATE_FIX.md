# LiveKit SIP Template Expansion Fix

## Problem
The template `{{.sip.toUser}}` was not being expanded by LiveKit SIP, causing issues with extracting the called phone number for routing calls to the correct business.

## Solution
Instead of relying on template expansion, we now:
1. Use `dispatch_rule_individual` to create unique rooms per call
2. Extract the called number from SIP participant attributes (where LiveKit SIP stores the data)

## Implementation Details

### Fix 1: Dispatch Rule Configuration
The `deploy.sh` script now uses `dispatch_rule_individual` which creates unique rooms like `sip-call-abc123` for each call. This avoids template expansion issues entirely.

**Location:** `deploy.sh` lines 86-104

```json
{
  "dispatch_rule": {
    "rule": {
      "dispatch_rule_individual": {
        "room_prefix": "sip-call-"
      }
    },
    "name": "phone-number-routing",
    "room_config": {
      "agents": [
        {
          "agent_name": "ai-receptionist"
        }
      ]
    }
  }
}
```

### Fix 2: Extract Called Number from Participant Attributes
The `agent.py` file now extracts the called number from SIP participant attributes using multiple fallback methods:

**Location:** `agent.py` lines 84-187

The function `extract_called_number()` tries these methods in order:

1. **Participant Attributes** (MOST RELIABLE)
   - Checks for keys: `sip.toUser`, `sip.to_user`, `toUser`, `to_user`, `sip.calledNumber`, `sip.to`
   - Also checks: `sip.phoneNumber`, `phoneNumber`, `phone_number`

2. **Participant Metadata**
   - Parses JSON metadata for phone number fields

3. **Room Metadata**
   - Checks room metadata for phone number

4. **Room Name**
   - Extracts phone number from room name pattern
   - Falls back to using room name if it's a valid phone

5. **Debug Logging**
   - If all methods fail, logs all available SIP data for debugging

## Deployment

### Automatic (Recommended)
Run the deployment script which handles everything:

```bash
cd /opt/livekit-gemini
./deploy.sh
```

This will:
- Delete any existing dispatch rule
- Create the new dispatch rule with `dispatch_rule_individual`
- Rebuild and restart the agent

### Manual Dispatch Rule Management
If you need to manually manage dispatch rules, use the helper script:

```bash
cd /opt/livekit-gemini
./manage_dispatch_rules.sh
```

Or manually:

```bash
cd /opt/livekit-gemini
source .env

# List existing dispatch rules
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch list

# Delete old rule (use ID or name from the list)
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch delete <DISPATCH_RULE_ID_OR_NAME>

# Rebuild and redeploy
docker-compose build agent
./deploy.sh
```

## Testing

After deployment, make a test call and check the agent logs:

```bash
docker-compose logs -f agent
```

You should see:
- Room name: `sip-call-<unique-id>`
- Participant attributes with `sip.toUser` containing the called number (e.g., `903322379153`)
- Successful extraction of the called number
- Business lookup and routing

## Key Changes Summary

| Change | Purpose |
|--------|---------|
| `dispatch_rule_individual` | Creates unique rooms per call, avoids template issues |
| Read `participant.attributes` | LiveKit SIP stores `sip.toUser` etc. in participant attributes |
| Added debug logging | Shows all available SIP data if extraction fails |
| Normalize phone numbers | Ensures consistent `+` prefix format |

## Troubleshooting

If the called number is still not being extracted:

1. Check agent logs for the debug output:
   ```bash
   docker-compose logs agent | grep -A 20 "DEBUG: Could not find called number"
   ```

2. Verify participant attributes are being set:
   ```bash
   docker-compose logs agent | grep "Participant attributes"
   ```

3. Check dispatch rule is active:
   ```bash
   lk sip dispatch list
   ```

4. Ensure agent name matches:
   - Dispatch rule specifies: `"agent_name": "ai-receptionist"`
   - Agent code specifies: `agent_name="ai-receptionist"` in `WorkerOptions`

## Notes

- The agent will reject any template variables (containing `${` or `{{`) to avoid using unexpanded templates
- Phone numbers are normalized to include the `+` prefix
- The function validates phone numbers (must be at least 10 digits)
- Multiple fallback methods ensure extraction works even if LiveKit SIP changes attribute names

