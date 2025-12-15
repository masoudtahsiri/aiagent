#!/usr/bin/env python3
"""
Database Cleanup Script
Removes all data from the database while keeping the schema intact.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(backend_path / ".env")

def cleanup_database():
    """Remove all data from all tables"""
    
    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_KEY')
    )
    
    # Order matters due to foreign key constraints
    # Delete in reverse order of dependencies
    tables_to_clean = [
        # Calendar and sync data
        'calendar_webhook_channels',
        'external_calendar_events',
        'calendar_sync_log',
        
        # Appointments and related
        'appointment_history',
        'appointments',
        'time_slots',
        
        # Call logs
        'call_logs',
        
        # Knowledge base
        'knowledge_base',
        
        # Business data
        'availability_exceptions',
        'business_hours',
        'business_closures',
        'services',
        'staff',
        'customers',
        
        # Calendar connections
        'calendar_connections',
        
        # AI config
        'ai_config',
        'ai_roles',
        
        # Users and businesses (last due to cascading)
        'users',
        'businesses',
    ]
    
    print("🗑️  Starting database cleanup...\n")
    
    total_deleted = 0
    
    for table in tables_to_clean:
        try:
            # Get count before deletion
            result = supabase.table(table).select('id', count='exact').execute()
            count = result.count if hasattr(result, 'count') else len(result.data or [])
            
            if count > 0:
                # Delete all rows
                supabase.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                print(f"✅ Cleaned {table:40} ({count} rows)")
                total_deleted += count
            else:
                print(f"⏭️  Skipped {table:40} (already empty)")
                
        except Exception as e:
            print(f"⚠️  Error cleaning {table}: {e}")
    
    print(f"\n🎉 Database cleanup complete!")
    print(f"📊 Total rows deleted: {total_deleted}")
    print(f"\n✅ Schema intact - all tables still exist")
    print(f"✅ Ready for fresh data")

if __name__ == "__main__":
    print("=" * 70)
    print("DATABASE CLEANUP SCRIPT")
    print("=" * 70)
    print("\n⚠️  WARNING: This will delete ALL data from the database!")
    print("Schema will remain intact, but all rows will be removed.\n")
    
    response = input("Are you sure you want to continue? (type 'yes' to confirm): ")
    
    if response.lower() == 'yes':
        cleanup_database()
    else:
        print("\n❌ Cleanup cancelled.")
