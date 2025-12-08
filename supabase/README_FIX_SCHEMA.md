# Fix Supabase Schema Exposure Issue

## Problem
PostgREST API is configured to only expose the `graphql_public` schema, but your tables are in the `public` schema. This causes errors like:
```
The schema must be one of the following: graphql_public
```

## Solution
Execute the following SQL in Supabase SQL Editor to expose the `public` schema:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage';
NOTIFY pgrst, 'reload schema';
```

## Steps to Fix

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/cwcjsgdbrqjljekxpgxz/sql/new
2. Copy and paste the SQL above
3. Click **"Run"** to execute
4. Restart your backend server

### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Run the Fix Script
```bash
cd /Users/masoudtahsiri/aiagent
python3 supabase/fix_schema.py
```

The script will attempt to fix it automatically, but if that fails, it will provide the SQL to execute manually.

## Verification
After executing the SQL, test the connection:
```bash
cd backend
source venv/bin/activate
python3 -c "from database.supabase_client import get_db; db = get_db(); result = db.table('businesses').select('id').limit(1).execute(); print('✅ Success!')"
```

## Files
- `supabase/migrations/fix_schema_exposure.sql` - SQL migration file
- `supabase/fix_schema.py` - Automated fix script
- `backend/database/supabase_client.py` - Updated to use public schema explicitly

