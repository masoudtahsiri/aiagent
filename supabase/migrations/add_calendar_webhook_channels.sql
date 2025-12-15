-- ============================================================================
-- Calendar Webhook Channels Table
-- For storing Google Calendar watch channel information
-- ============================================================================

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_webhook_channels_staff_id 
    ON calendar_webhook_channels(staff_id);

CREATE INDEX IF NOT EXISTS idx_calendar_webhook_channels_channel_id 
    ON calendar_webhook_channels(channel_id);

CREATE INDEX IF NOT EXISTS idx_calendar_webhook_channels_expiration 
    ON calendar_webhook_channels(expiration);

-- Add comment
COMMENT ON TABLE calendar_webhook_channels IS 'Stores Google Calendar watch channel information for push notifications';
