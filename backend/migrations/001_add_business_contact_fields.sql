-- Migration: Add contact fields and logo to businesses table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/cwcjsgdbrqjljekxpgxz/sql

-- Add new columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Create storage bucket for business logos (run separately if needed)
-- This should be done in Storage settings in Supabase Dashboard:
-- 1. Go to Storage > Create new bucket
-- 2. Name: "business-logos"
-- 3. Public bucket: Yes (so logos can be displayed)
-- 4. File size limit: 5MB
-- 5. Allowed MIME types: image/png, image/jpeg, image/gif, image/webp

-- Grant storage access (RLS policies for the bucket)
-- Create policy for authenticated users to upload to their business folder
-- This is typically done via the Supabase Dashboard Storage Policies

-- Verify the migration
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name IN ('logo_url', 'email', 'instagram_url', 'facebook_url');
