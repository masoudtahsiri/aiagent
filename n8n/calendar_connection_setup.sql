-- ============================================================================
-- CALENDAR CONNECTION SETUP SQL
-- ============================================================================

-- Step 1: Find existing staff members
-- Run this to see available staff and their IDs
SELECT 
    id,
    name,
    email,
    business_id,
    is_active
FROM staff
WHERE is_active = TRUE
ORDER BY name;

-- Step 2: Find business_id for a staff member
-- Replace 'STAFF_ID_HERE' with actual staff UUID
SELECT 
    s.id as staff_id,
    s.name as staff_name,
    s.business_id,
    b.name as business_name
FROM staff s
JOIN businesses b ON s.business_id = b.id
WHERE s.id = 'STAFF_ID_HERE';

-- ============================================================================
-- Step 3: Insert calendar connection
-- ============================================================================
-- Replace the following values:
-- - STAFF_ID_HERE: UUID from staff table
-- - BUSINESS_ID_HERE: UUID from businesses table  
-- - CALENDAR_EMAIL_HERE: Google Calendar email (e.g., "john@gmail.com")
-- - ACCESS_TOKEN_HERE: OAuth access token (get from OAuth flow)
-- - REFRESH_TOKEN_HERE: OAuth refresh token (get from OAuth flow)
-- - TOKEN_EXPIRES_AT: Timestamp when token expires

INSERT INTO calendar_connections (
    staff_id,
    business_id,
    provider,
    calendar_id,
    calendar_name,
    access_token,
    refresh_token,
    token_expires_at,
    sync_enabled,
    sync_direction
) VALUES (
    'STAFF_ID_HERE',                    -- Replace with actual staff UUID
    'BUSINESS_ID_HERE',                 -- Replace with actual business UUID
    'google',                           -- Provider type
    'CALENDAR_EMAIL_HERE',              -- Google Calendar email/ID
    'My Google Calendar',               -- Display name
    'ACCESS_TOKEN_HERE',                -- OAuth access token (from Google OAuth)
    'REFRESH_TOKEN_HERE',               -- OAuth refresh token (from Google OAuth)
    NOW() + INTERVAL '1 hour',          -- Token expiration (adjust as needed)
    TRUE,                               -- Enable sync
    'bidirectional'                     -- Sync direction: 'bidirectional', 'to_calendar', 'from_calendar'
);

-- ============================================================================
-- EXAMPLE: Complete example with sample data
-- ============================================================================
-- This is an example - replace with your actual values

-- First, get a staff ID (run this query first):
-- SELECT id, name, email FROM staff LIMIT 1;

-- Then use that ID in the INSERT:
INSERT INTO calendar_connections (
    staff_id,
    business_id,
    provider,
    calendar_id,
    calendar_name,
    access_token,
    refresh_token,
    token_expires_at,
    sync_enabled,
    sync_direction
) VALUES (
    (SELECT id FROM staff WHERE email = 'staff@example.com' LIMIT 1),  -- Get staff_id by email
    (SELECT business_id FROM staff WHERE email = 'staff@example.com' LIMIT 1),  -- Get business_id
    'google',
    'staff@gmail.com',                    -- Google Calendar email
    'My Work Calendar',
    'ya29.a0AfH6SMBx...',                 -- OAuth access token (you'll get this from OAuth flow)
    '1//0gv...',                          -- OAuth refresh token (you'll get this from OAuth flow)
    NOW() + INTERVAL '1 hour',
    TRUE,
    'bidirectional'
);

-- ============================================================================
-- Step 4: Verify the connection was created
-- ============================================================================
SELECT 
    cc.id,
    s.name as staff_name,
    s.email as staff_email,
    cc.calendar_id,
    cc.calendar_name,
    cc.sync_enabled,
    cc.sync_direction,
    cc.last_sync_at,
    cc.created_at
FROM calendar_connections cc
JOIN staff s ON cc.staff_id = s.id
WHERE cc.provider = 'google'
ORDER BY cc.created_at DESC;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. OAuth Tokens: You need to get access_token and refresh_token from Google OAuth flow
--    - This is typically done through your frontend/backend OAuth implementation
--    - The n8n workflow can also help get these tokens when connecting Google Calendar
--
-- 2. Calendar ID: This is usually the Google account email (e.g., "user@gmail.com")
--    or a specific calendar ID if using a shared calendar
--
-- 3. Token Expiration: Google access tokens expire after 1 hour
--    - The refresh_token is used to get new access tokens
--    - Make sure your system refreshes tokens automatically
--
-- 4. Testing: After inserting, test with:
--    GET /api/calendar/sync-status
--    This should return your staff member in the list













