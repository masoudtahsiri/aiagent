#!/usr/bin/env python3
"""
Setup Google Calendar Watch for Staff Member

This script:
1. Gets staff member's Google OAuth tokens from database
2. Creates a Google Calendar watch using Google Calendar API
3. Saves the watch details to calendar_webhook_channels table

Usage:
    python setup_calendar_watch.py

Staff ID: bc019d0e-2f81-4b59-8d9a-1b7972171d97
Webhook URL: https://n8n.algorityai.com/webhook/google-calendar-push
"""

import os
import sys
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from database.supabase_client import get_db

# Load environment variables
load_dotenv()
load_dotenv('backend/.env')

# Google OAuth credentials
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

# Configuration
STAFF_ID = 'bc019d0e-2f81-4b59-8d9a-1b7972171d97'
WEBHOOK_URL = 'https://n8n.algorityai.com/webhook/google-calendar-push'


def create_calendar_watch():
    """Create Google Calendar watch for staff member"""
    
    print("=" * 80)
    print("Google Calendar Watch Setup")
    print("=" * 80)
    print()
    
    # Check for required environment variables
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        print("❌ Error: Missing Google OAuth credentials")
        print("   Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env")
        return False
    
    print(f"Staff ID: {STAFF_ID}")
    print(f"Webhook URL: {WEBHOOK_URL}")
    print()
    
    # Get database connection
    db = get_db()
    
    # Step 1: Get staff member's calendar connection
    print("Step 1: Getting staff calendar connection...")
    conn_result = db.table("calendar_connections").select(
        "id, staff_id, business_id, calendar_id, access_token, refresh_token"
    ).eq("staff_id", STAFF_ID).eq("provider", "google").execute()
    
    if not conn_result.data:
        print("❌ Error: No Google Calendar connection found for this staff member")
        print("   Please create a calendar connection first using:")
        print("   - n8n OAuth flow")
        print("   - Or manually insert into calendar_connections table")
        return False
    
    connection = conn_result.data[0]
    print(f"✅ Found calendar connection: {connection['id']}")
    print(f"   Calendar ID: {connection.get('calendar_id', 'primary')}")
    print()
    
    # Check if tokens exist
    if not connection.get('access_token') or not connection.get('refresh_token'):
        print("❌ Error: Missing OAuth tokens in calendar connection")
        print("   access_token and refresh_token are required")
        return False
    
    # Step 2: Create Google Calendar watch
    print("Step 2: Creating Google Calendar watch...")
    
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
    except ImportError:
        print("❌ Error: Google API libraries not installed")
        print("   Install with: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        return False
    
    # Build credentials
    credentials = Credentials(
        token=connection['access_token'],
        refresh_token=connection['refresh_token'],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )
    
    # Build Google Calendar service
    try:
        service = build('calendar', 'v3', credentials=credentials)
    except Exception as e:
        print(f"❌ Error building Google Calendar service: {e}")
        return False
    
    # Generate unique channel ID
    channel_id = str(uuid.uuid4())
    
    # Create watch request
    watch_body = {
        'id': channel_id,
        'type': 'web_hook',
        'address': WEBHOOK_URL,
        'token': STAFF_ID  # Pass staff_id as token for identification
    }
    
    print(f"   Channel ID: {channel_id}")
    print(f"   Calendar: {connection.get('calendar_id', 'primary')}")
    
    try:
        response = service.events().watch(
            calendarId=connection.get('calendar_id', 'primary'),
            body=watch_body
        ).execute()
        
        print("✅ Watch created successfully!")
        print()
        print("Response from Google:")
        print(f"   Resource ID: {response['resourceId']}")
        print(f"   Expiration: {response['expiration']} (timestamp in ms)")
        
        # Convert expiration to datetime
        expiration_dt = datetime.fromtimestamp(int(response['expiration']) / 1000)
        print(f"   Expires at: {expiration_dt.isoformat()}")
        print()
        
    except Exception as e:
        print(f"❌ Error creating watch: {e}")
        print()
        print("Common issues:")
        print("   - OAuth tokens may be expired (try refreshing)")
        print("   - Webhook URL must be publicly accessible")
        print("   - Google Calendar API must be enabled in Google Cloud Console")
        return False
    
    # Step 3: Save to database
    print("Step 3: Saving watch to database...")
    
    # Check if calendar_webhook_channels table exists
    try:
        # Try to query the table
        test_query = db.table("calendar_webhook_channels").select("id").limit(1).execute()
        table_exists = True
    except Exception as e:
        print("⚠️  Warning: calendar_webhook_channels table may not exist")
        print(f"   Error: {e}")
        print()
        print("Creating table...")
        table_exists = False
    
    if not table_exists:
        # Create the table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS calendar_webhook_channels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
            staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
            channel_id VARCHAR(255) NOT NULL UNIQUE,
            resource_id VARCHAR(255) NOT NULL,
            expiration TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """
        print("   SQL to create table:")
        print(create_table_sql)
        print()
        print("   Please run this SQL in your Supabase SQL editor, then run this script again.")
        return False
    
    # Check if watch already exists for this staff
    existing = db.table("calendar_webhook_channels").select("id").eq(
        "staff_id", STAFF_ID
    ).execute()
    
    channel_data = {
        "calendar_connection_id": connection['id'],
        "staff_id": STAFF_ID,
        "channel_id": response['id'],
        "resource_id": response['resourceId'],
        "expiration": expiration_dt.isoformat(),
    }
    
    try:
        if existing.data:
            # Update existing
            db.table("calendar_webhook_channels").update(channel_data).eq(
                "staff_id", STAFF_ID
            ).execute()
            print("✅ Updated existing watch in database")
        else:
            # Insert new
            db.table("calendar_webhook_channels").insert(channel_data).execute()
            print("✅ Saved new watch to database")
        
        print()
        print("=" * 80)
        print("✅ SUCCESS! Google Calendar watch is now active")
        print("=" * 80)
        print()
        print("What happens now:")
        print("1. Google will send push notifications to:")
        print(f"   {WEBHOOK_URL}")
        print()
        print("2. When calendar events change, n8n will receive notifications")
        print()
        print("3. Watch will expire at:")
        print(f"   {expiration_dt.isoformat()}")
        print(f"   (in approximately {(expiration_dt - datetime.now()).days} days)")
        print()
        print("4. Set up automatic renewal in n8n to renew before expiration")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error saving to database: {e}")
        return False


if __name__ == "__main__":
    success = create_calendar_watch()
    sys.exit(0 if success else 1)
