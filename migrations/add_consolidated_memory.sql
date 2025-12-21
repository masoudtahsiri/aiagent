-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Add Consolidated Memory System
-- 
-- This adds two JSON columns to the customers table for the new memory architecture:
-- - long_term_memory: Permanent facts, preferences, relationships (merged each call)
-- - short_term_memory: Current context, active deals, recent issues (replaced each call)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add long_term_memory column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS long_term_memory JSONB DEFAULT '{
  "preferences": {},
  "facts": [],
  "relationships": {},
  "notes": []
}'::jsonb;

-- Add short_term_memory column  
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS short_term_memory JSONB DEFAULT '{
  "active_deals": [],
  "open_issues": [],
  "recent_context": [],
  "follow_ups": [],
  "last_updated": null
}'::jsonb;

-- Add index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_customers_long_term_memory 
ON customers USING GIN (long_term_memory);

CREATE INDEX IF NOT EXISTS idx_customers_short_term_memory 
ON customers USING GIN (short_term_memory);

-- Comment on columns
COMMENT ON COLUMN customers.long_term_memory IS 'Permanent customer memory: preferences (key-value), facts, relationships, notes. Merged after each call.';
COMMENT ON COLUMN customers.short_term_memory IS 'Temporary context: active deals, open issues, recent context, follow-ups. Replaced after each call.';

