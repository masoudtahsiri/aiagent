# Quick Start: Setup Google Calendar Watch

## For Staff ID: bc019d0e-2f81-4b59-8d9a-1b7972171d97

### 1. Create Database Table (One-time setup)

Run in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS calendar_webhook_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL UNIQUE,
    resource_id VARCHAR(255) NOT NULL,
    expiration TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calendar_webhook_channels_staff_id ON calendar_webhook_channels(staff_id);
CREATE INDEX idx_calendar_webhook_channels_channel_id ON calendar_webhook_channels(channel_id);
CREATE INDEX idx_calendar_webhook_channels_expiration ON calendar_webhook_channels(expiration);
```

### 2. Install Google API Packages

```bash
cd backend
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 3. Set Environment Variables

Add to `backend/.env`:

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 4. Run the Setup Script

```bash
python setup_calendar_watch.py
```

### 5. Verify

Check the database:

```sql
SELECT * FROM calendar_webhook_channels 
WHERE staff_id = 'bc019d0e-2f81-4b59-8d9a-1b7972171d97';
```

## What This Does

1. ✅ Gets staff member's Google OAuth tokens from `calendar_connections` table
2. ✅ Calls Google Calendar API to create a watch
3. ✅ Saves watch details (channel_id, resource_id, expiration) to database
4. ✅ Google will now send push notifications to: `https://n8n.algorityai.com/webhook/google-calendar-push`

## Important Notes

- **Watch expires in ~7 days** - Set up automatic renewal in n8n
- **Webhook must be publicly accessible** - Ensure n8n.algorityai.com is reachable
- **OAuth tokens required** - Staff must have connected their Google Calendar first

## Troubleshooting

If the script fails, check:

1. **Calendar connection exists**: 
   ```sql
   SELECT * FROM calendar_connections 
   WHERE staff_id = 'bc019d0e-2f81-4b59-8d9a-1b7972171d97' 
   AND provider = 'google';
   ```

2. **Tokens are present**:
   - `access_token` should not be NULL
   - `refresh_token` should not be NULL

3. **Google credentials are set**:
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   ```

## Next Steps

After successful setup:

1. Test by making a change in the staff member's Google Calendar
2. Check n8n webhook logs for incoming notifications
3. Set up automatic watch renewal in n8n (expires in 7 days)

For detailed documentation, see: [CALENDAR_WATCH_SETUP.md](./CALENDAR_WATCH_SETUP.md)
