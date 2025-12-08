#!/usr/bin/env python3
"""
Fix Supabase schema exposure issue.
This script attempts to execute SQL to expose the public schema to PostgREST.

Since direct SQL execution via API requires superuser privileges,
this script will attempt to use Supabase's Management API or SQL Editor API.
If that's not available, it will provide instructions for manual execution.
"""

import httpx
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(env_path)

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

if not url or not key:
    print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env")
    sys.exit(1)

# SQL to fix schema exposure
sql = """
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage';
NOTIFY pgrst, 'reload schema';
"""

print("="*70)
print("SUPABASE SCHEMA FIX SCRIPT")
print("="*70)
print(f"\nProject URL: {url}")
print(f"\nSQL to execute:")
print("-"*70)
print(sql.strip())
print("-"*70)

# Extract project reference from URL
project_ref = url.split('//')[1].split('.')[0]

# Try Supabase Management API
print("\n🔧 Attempting to fix via Supabase Management API...")
management_url = f"https://api.supabase.com/v1/projects/{project_ref}/sql"

try:
    response = httpx.post(
        management_url,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "apikey": key
        },
        json={"query": sql},
        timeout=10.0
    )
    
    if response.status_code == 200:
        print("✅ Success! Schema exposure fixed via Management API")
        print(f"Response: {response.text}")
        sys.exit(0)
    elif response.status_code == 401:
        print("❌ Management API requires different authentication")
        print("   (Service role key doesn't have Management API access)")
    else:
        print(f"❌ Management API returned: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"❌ Management API error: {type(e).__name__}: {e}")

# Try SQL Editor REST API
print("\n🔧 Attempting to fix via SQL Editor REST API...")
sql_editor_endpoints = [
    f"{url}/api/v1/sql",
    f"{url}/rest/v1/sql",
    f"{url}/api/v1/query",
]

for endpoint in sql_editor_endpoints:
    try:
        response = httpx.post(
            endpoint,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={"query": sql, "sql": sql},
            timeout=5.0
        )
        
        if response.status_code < 400:
            print(f"✅ Success! Fixed via {endpoint}")
            print(f"Response: {response.text}")
            sys.exit(0)
    except Exception as e:
        continue

print("\n" + "="*70)
print("MANUAL EXECUTION REQUIRED")
print("="*70)
print("\nDirect SQL execution via API is not available.")
print("Please execute the SQL manually:")
print("\n1. Go to Supabase Dashboard:")
print(f"   https://supabase.com/dashboard/project/{project_ref}/sql/new")
print("\n2. Copy and paste this SQL:")
print("-"*70)
print(sql.strip())
print("-"*70)
print("\n3. Click 'Run' to execute")
print("\n4. After execution, restart your backend server")
print("\n" + "="*70)
