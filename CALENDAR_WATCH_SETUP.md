# Google Calendar Watch Setup Guide

This guide explains how to set up Google Calendar push notifications (watches) for staff members.

## Overview

Google Calendar watches allow your system to receive real-time push notifications when calendar events change, instead of polling the API repeatedly.

## Prerequisites

1. **Database Setup**
   - `calendar_connections` table must exist
   - `calendar_webhook_channels` table must exist
   - Staff member must have a Google Calendar connection with OAuth tokens

2. **Google Cloud Setup**
   - Google Calendar API enabled
   - OAuth 2.0 credentials (Client ID and Secret)
   - Webhook URL must be publicly accessible

3. **Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

## Step 1: Create the Database Table

Run this SQL in your Supabase SQL editor:

```sql
-- Run the migration
\i supabase/migrations/add_calendar_webhook_channels.sql
```

Or manually:

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

## Step 2: Install Required Packages

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `google-auth`
- `google-auth-oauthlib`
- `google-auth-httplib2`
- `google-api-python-client`

## Step 3: Verify Calendar Connection

Check that the staff member has a Google Calendar connection:

```sql
SELECT 
    cc.id,
    cc.staff_id,
    s.name as staff_name,
    cc.calendar_id,
    cc.access_token IS NOT NULL as has_access_token,
    cc.refresh_token IS NOT NULL as has_refresh_token,
    cc.sync_enabled
FROM calendar_connections cc
JOIN staff s ON cc.staff_id = s.id
WHERE cc.staff_id = 'bc019d0e-2f81-4b59-8d9a-1b7972171d97'
AND cc.provider = 'google';
```

If no connection exists, create one using the n8n OAuth flow or manually insert tokens.

## Step 4: Run the Setup Script

```bash
python setup_calendar_watch.py
```

The script will:
1. ✅ Get staff member's OAuth tokens from database
2. ✅ Create a Google Calendar watch
3. ✅ Save watch details to `calendar_webhook_channels` table

### Expected Output

```
================================================================================
Google Calendar Watch Setup
================================================================================

Staff ID: bc019d0e-2f81-4b59-8d9a-1b7972171d97
Webhook URL: https://n8n.algorityai.com/webhook/google-calendar-push

Step 1: Getting staff calendar connection...
✅ Found calendar connection: [connection-id]
   Calendar ID: primary

Step 2: Creating Google Calendar watch...
   Channel ID: [uuid]
   Calendar: primary
✅ Watch created successfully!

Response from Google:
   Resource ID: [resource-id]
   Expiration: 1734567890000 (timestamp in ms)
   Expires at: 2024-12-19T10:31:30

Step 3: Saving watch to database...
✅ Saved new watch to database

================================================================================
✅ SUCCESS! Google Calendar watch is now active
================================================================================

What happens now:
1. Google will send push notifications to:
   https://n8n.algorityai.com/webhook/google-calendar-push

2. When calendar events change, n8n will receive notifications

3. Watch will expire at:
   2024-12-19T10:31:30
   (in approximately 7 days)

4. Set up automatic renewal in n8n to renew before expiration
```

## Step 5: Test the Watch

1. **Trigger a notification**: Make a change to the staff member's Google Calendar
2. **Check n8n logs**: Verify that n8n receives the webhook
3. **Check database**: Verify the watch is saved

```sql
SELECT * FROM calendar_webhook_channels 
WHERE staff_id = 'bc019d0e-2f81-4b59-8d9a-1b7972171d97';
```

## Webhook Endpoint

The webhook endpoint should handle Google's push notifications:

**Endpoint**: `https://n8n.algorityai.com/webhook/google-calendar-push`

**Headers from Google**:
- `X-Goog-Channel-ID`: The channel UUID
- `X-Goog-Resource-ID`: Google's resource identifier
- `X-Goog-Resource-State`: 'sync' (initial) or 'exists' (changes)
- `X-Goog-Channel-Token`: Staff ID (custom token we set)
- `X-Goog-Message-Number`: Sequence number

## Watch Expiration and Renewal

Google Calendar watches expire after approximately **7 days** (604,800 seconds).

### Automatic Renewal (Recommended)

Set up an n8n workflow to automatically renew watches before they expire:

1. **Daily Check**: Run every 24 hours
2. **Query Expiring Watches**: 
   ```
   GET /api/calendar/watch/expiring-channels?hours_ahead=24
   ```
3. **Renew Each Watch**: For each expiring watch, call:
   ```
   POST /api/calendar/watch/renew
   ```

### Manual Renewal

```bash
# Edit the script to set renew=True
python setup_calendar_watch.py
```

## Troubleshooting

### Error: "No Google Calendar connection found"

**Solution**: Create a calendar connection first:
```sql
INSERT INTO calendar_connections (
    staff_id, business_id, provider, calendar_id,
    access_token, refresh_token, sync_enabled
) VALUES (
    'bc019d0e-2f81-4b59-8d9a-1b7972171d97',
    '[business-id]',
    'google',
    'primary',
    '[access-token]',
    '[refresh-token]',
    TRUE
);
```

### Error: "Missing OAuth tokens"

**Solution**: Use n8n Google Calendar OAuth node to get tokens, then save to database.

### Error: "Webhook URL must be publicly accessible"

**Solution**: 
- Ensure `https://n8n.algorityai.com` is accessible from the internet
- Google must be able to reach this URL
- Check firewall/security group settings

### Error: "Google Calendar API not enabled"

**Solution**:
1. Go to Google Cloud Console
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials

### Error: "calendar_webhook_channels table does not exist"

**Solution**: Run the migration:
```bash
psql -h [supabase-host] -U postgres -d postgres -f supabase/migrations/add_calendar_webhook_channels.sql
```

## API Endpoints

Once set up, these endpoints are available:

- `POST /api/calendar/watch/create` - Create a new watch
- `POST /api/calendar/watch/renew` - Renew an expiring watch
- `GET /api/calendar/watch/channel-info/{staff_id}` - Get watch info
- `GET /api/calendar/watch/expiring-channels` - List expiring watches
- `POST /api/calendar/watch/stop` - Stop a watch
- `GET /api/calendar/watch/active-watches` - List all active watches

## Security Notes

1. **Webhook Verification**: The webhook endpoint should verify that requests come from Google
2. **Token Storage**: OAuth tokens are sensitive - ensure they're encrypted at rest
3. **HTTPS Only**: Always use HTTPS for webhook URLs
4. **Token Refresh**: Implement automatic token refresh for expired access tokens

## Additional Resources

- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [n8n Google Calendar Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecalendar/)
