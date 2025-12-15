-- ============================================================================
-- Add Google Calendar Sync Fields to Appointments Table
-- ============================================================================
-- These fields track the sync status between appointments and Google Calendar events

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'pending_update', 'pending_delete', 'deleted', 'error'
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP DEFAULT NOW();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id ON appointments(google_event_id);
CREATE INDEX IF NOT EXISTS idx_appointments_sync_status ON appointments(sync_status);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_sync ON appointments(staff_id, sync_status);

-- Add comments
COMMENT ON COLUMN appointments.google_event_id IS 'Google Calendar event ID for bidirectional sync';
COMMENT ON COLUMN appointments.sync_status IS 'Sync status: pending, synced, pending_update, pending_delete, deleted, error';
COMMENT ON COLUMN appointments.last_synced_at IS 'Last time this appointment was synced to Google Calendar';
COMMENT ON COLUMN appointments.last_modified_at IS 'Last time this appointment was modified (for detecting changes)';
