-- ============================================================================
-- External Calendar Events Table
-- For storing events from Google Calendar that aren't appointments
-- ============================================================================
-- These are personal events, meetings, etc. that should block time slots

CREATE TABLE IF NOT EXISTS external_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    summary VARCHAR(500),
    description TEXT,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    event_status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_external_events_staff_id ON external_calendar_events(staff_id);
CREATE INDEX IF NOT EXISTS idx_external_events_google_id ON external_calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_external_events_staff_date ON external_calendar_events(staff_id, start_datetime);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_events_unique 
    ON external_calendar_events(staff_id, google_event_id);

-- Add comment
COMMENT ON TABLE external_calendar_events IS 'Stores external events from Google Calendar to block time slots';
