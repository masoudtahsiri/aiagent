#!/usr/bin/env python3
# Run with: python -m check_customers (from project root)
from backend.database.supabase_client import get_db

db = get_db()
business_id = "931211d9-e024-4897-ae46-ad60b8009399"

result = db.table("customers").select("*").eq("business_id", business_id).order("created_at", desc=True).limit(10).execute()

print("=== Recent Customers ===")
if result.data:
    for customer in result.data:
        first_name = customer.get("first_name", "N/A")
        last_name = customer.get("last_name", "N/A")
        phone = customer.get("phone", "N/A")
        email = customer.get("email", "N/A")
        created = customer.get("created_at", "N/A")
        cid = customer.get("id", "N/A")
        print(f"Name: {first_name} {last_name}")
        print(f"Phone: {phone}")
        print(f"Email: {email}")
        print(f"Created: {created}")
        print(f"ID: {cid}")
        print("---")
else:
    print("No customers found")


