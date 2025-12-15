-- ============================================================================
-- Add sync_token to Calendar Webhook Channels
-- ============================================================================
-- The sync_token is used for incremental sync with Google Calendar API

ALTER TABLE calendar_webhook_channels 
ADD COLUMN IF NOT EXISTS sync_token TEXT;

-- Add comment
COMMENT ON COLUMN calendar_webhook_channels.sync_token IS 'Google Calendar sync token for incremental sync';
