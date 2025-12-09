# Database Setup Guide

## Supabase Configuration

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and keys

### 2. Run Schema

1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `supabase/schema.sql`
3. Run the SQL

### 3. Fix Schema Exposure (if needed)

If you get "schema must be one of: graphql_public" error:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage';
NOTIFY pgrst, 'reload schema';
```

### 4. Add AI Phone Number Column

```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_phone_number VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_businesses_ai_phone 
ON businesses(ai_phone_number) 
WHERE ai_phone_number IS NOT NULL;
```

## Key Tables

| Table | Purpose |
|-------|---------|
| businesses | Multi-tenant business accounts |
| users | Business owners/admins |
| staff | Service providers (doctors, stylists, etc.) |
| customers | Customer database per business |
| appointments | Booking records |
| time_slots | Available appointment slots |
| ai_roles | AI personality configuration |

## Verification

Test connection from backend:
```bash
cd backend
source venv/bin/activate
python -c "from backend.database.supabase_client import get_db; db = get_db(); print('Connected!')"
```

