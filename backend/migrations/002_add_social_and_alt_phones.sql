-- Migration: Add social media fields and alternative phone numbers
-- Run this in Supabase SQL Editor

-- 1. Rename phone_number to alternative_phone_numbers and change to JSONB
ALTER TABLE businesses
  DROP COLUMN IF EXISTS phone_number;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS alternative_phone_numbers JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN businesses.alternative_phone_numbers IS 'JSON array of alternative phone numbers';

-- 2. Add social media fields
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tiktok_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS twitter_url VARCHAR(255);

COMMENT ON COLUMN businesses.whatsapp IS 'WhatsApp number with country code';
COMMENT ON COLUMN businesses.tiktok_url IS 'TikTok profile URL';
COMMENT ON COLUMN businesses.youtube_url IS 'YouTube channel URL';
COMMENT ON COLUMN businesses.linkedin_url IS 'LinkedIn company page URL';
COMMENT ON COLUMN businesses.twitter_url IS 'X (Twitter) profile URL';

-- 3. Verify the migration
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name IN (
  'ai_phone_number',
  'alternative_phone_numbers',
  'whatsapp',
  'tiktok_url',
  'youtube_url',
  'linkedin_url',
  'twitter_url',
  'instagram_url',
  'facebook_url'
);
