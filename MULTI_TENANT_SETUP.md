# Multi-Tenant Architecture Setup

## ✅ Completed Implementation

### 1. Backend Updates

**Models:**
- ✅ `backend/models/business.py` - Added `ai_phone_number` field
- ✅ `backend/models/ai_config.py` - Created AI role configuration models
- ✅ `backend/api/ai_config.py` - Created AI configuration endpoints

**New Endpoints:**
- `POST /api/ai/lookup-by-phone` - Lookup business by AI phone number (no auth - for agent)
- `POST /api/ai/roles` - Create AI role configuration
- `GET /api/ai/roles/{business_id}` - Get AI roles for business
- `PUT /api/ai/roles/{role_id}` - Update AI role configuration

### 2. Agent Updates

**Multi-Tenant Agent:**
- ✅ `livekit-gemini/agent/agent.py` - Completely rewritten for multi-tenant support
- ✅ `livekit-gemini/agent/backend_client.py` - Added `lookup_business_by_phone()` method

**Key Features:**
- Dynamic business routing based on called phone number
- Per-business AI personality configuration
- Custom voice styles per business
- Custom system prompts and greetings
- Automatic staff selection

### 3. Database Schema

**Note:** You need to add `ai_phone_number` column to `businesses` table:

```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_phone_number VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_businesses_ai_phone ON businesses(ai_phone_number) WHERE ai_phone_number IS NOT NULL;
```

The `ai_roles` table already exists in the schema with these fields:
- `ai_personality_name` (maps to `ai_name` in API)
- `voice_style`
- `system_prompt`
- `greeting_message`
- `role_type`
- `is_enabled`
- `priority`

## Setup Instructions

### Step 1: Update Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Add ai_phone_number column if it doesn't exist
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_phone_number VARCHAR(20);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_businesses_ai_phone 
ON businesses(ai_phone_number) 
WHERE ai_phone_number IS NOT NULL;
```

### Step 2: Update Business Records

For each business, set their AI phone number:

```sql
UPDATE businesses 
SET ai_phone_number = '+1234567890' 
WHERE id = 'your-business-id';
```

### Step 3: Create AI Role Configuration

Use the API to create AI roles for each business:

```bash
POST /api/ai/roles
{
  "business_id": "your-business-id",
  "role_type": "receptionist",
  "ai_name": "Sarah",
  "voice_style": "Kore",
  "system_prompt": "You are Sarah, a friendly receptionist for {business_name}. You are speaking with {customer_name}, a returning customer.",
  "greeting_message": "Hello {customer_name}! Thank you for calling {business_name}. How may I help you today?",
  "is_enabled": true
}
```

### Step 4: Update Agent Environment

Remove hardcoded business/staff IDs from `.env`:

```bash
# Remove these lines:
# BUSINESS_ID=...
# STAFF_ID=...

# Keep only:
BACKEND_URL=http://localhost:8000
```

### Step 5: Configure SIP Dispatch Rules

In LiveKit SIP, configure dispatch rules to route calls based on called number:

```yaml
# In sip.yaml or via LiveKit CLI
dispatch_rules:
  - phone_number: "+1234567890"  # Business 1 AI number
    room_name: "+1234567890"      # Use phone number as room name
  - phone_number: "+0987654321"  # Business 2 AI number
    room_name: "+0987654321"
```

**Important:** The `extract_called_number()` function in `agent.py` currently uses `ctx.room.name` to determine the called number. You may need to adjust this based on how LiveKit SIP passes the "To" number.

## How It Works

1. **Call comes in** → LiveKit SIP routes to agent
2. **Agent extracts called number** → From room name or SIP headers
3. **Agent looks up business** → Calls `/api/ai/lookup-by-phone` with called number
4. **Backend returns** → Business config, AI roles, staff list
5. **Agent configures** → Uses business-specific AI personality, voice, prompts
6. **Agent handles call** → With business-specific behavior

## Testing

1. **Set up test business:**
   ```sql
   UPDATE businesses 
   SET ai_phone_number = '+1234567890' 
   WHERE id = 'test-business-id';
   ```

2. **Create AI role:**
   ```bash
   curl -X POST http://localhost:8000/api/ai/roles \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "business_id": "test-business-id",
       "role_type": "receptionist",
       "ai_name": "Sarah",
       "voice_style": "Kore",
       "system_prompt": "You are Sarah for {business_name}.",
       "greeting_message": "Hello {customer_name}!",
       "is_enabled": true
     }'
   ```

3. **Test phone lookup:**
   ```bash
   curl -X POST http://localhost:8000/api/ai/lookup-by-phone \
     -H "Content-Type: application/json" \
     -d '{"phone_number": "+1234567890"}'
   ```

4. **Make test call** to the AI phone number

## Troubleshooting

### Agent can't find business

- Check `ai_phone_number` is set in database
- Verify `extract_called_number()` returns correct number
- Check agent logs for called number extraction

### Wrong AI personality

- Verify AI role is created and enabled
- Check `role_type` is "receptionist"
- Verify `priority` is set correctly (lower = higher priority)

### Function calls not working

- Check LiveKit Agents version compatibility
- Review agent logs for function call handler attachment
- Verify tools are passed to `RealtimeModel`

## Next Steps

1. **Add phone number extraction from SIP headers** (if room name doesn't work)
2. **Implement role switching** (sales → support → receptionist)
3. **Add call logging** to track multi-tenant usage
4. **Implement business-specific knowledge base** integration
