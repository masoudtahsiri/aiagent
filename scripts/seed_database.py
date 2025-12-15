#!/usr/bin/env python3
"""
Database Seed Script
Creates sample data for testing: 1 business, 2 staff, services, time slots, etc.
"""

import os
import sys
from datetime import datetime, date, time, timedelta
from pathlib import Path
import uuid

# Load environment
from dotenv import load_dotenv

def seed_database():
    """Seed the database with sample data"""
    
    # Import supabase after loading env
    from supabase import create_client
    
    load_dotenv()
    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_KEY')
    )
    
    print("🌱 Starting database seed...\n")
    
    # =========================================================================
    # 1. CREATE BUSINESS
    # =========================================================================
    print("📦 Creating business...")
    
    business_id = str(uuid.uuid4())
    business = {
        "id": business_id,
        "owner_email": "admin@brightsmile.com",
        "business_name": "Bright Smile Dental Clinic",
        "industry": "medical",
        "phone_number": "+1-555-123-4567",
        "address": "123 Main Street, Suite 100",
        "city": "Los Angeles",
        "state": "CA",
        "zip_code": "90001",
        "country": "US",
        "website": "https://brightsmile-dental.com",
        "timezone": "America/Los_Angeles",
        "subscription_tier": "professional",
        "subscription_status": "active",
        "is_active": True
    }
    supabase.table("businesses").insert(business).execute()
    print(f"   ✅ Business: {business['business_name']} ({business_id})")
    
    # =========================================================================
    # 2. CREATE USER (Admin)
    # =========================================================================
    print("\n👤 Creating admin user...")
    
    user = {
        "id": str(uuid.uuid4()),
        "business_id": business_id,
        "email": "admin@brightsmile.com",
        "password_hash": "$2b$12$dummy_hash_for_testing",  # Not a real hash
        "full_name": "Dr. Michael Chen",
        "role": "owner",
        "is_active": True
    }
    supabase.table("users").insert(user).execute()
    print(f"   ✅ User: {user['full_name']}")
    
    # =========================================================================
    # 3. CREATE STAFF (2 dentists)
    # =========================================================================
    print("\n👨‍⚕️ Creating staff members...")
    
    staff_1_id = str(uuid.uuid4())
    staff_2_id = str(uuid.uuid4())
    
    staff_members = [
        {
            "id": staff_1_id,
            "business_id": business_id,
            "name": "Dr. Sarah Johnson",
            "email": "sarah@brightsmile.com",
            "phone": "+1-555-123-4568",
            "title": "Lead Dentist",
            "specialty": "General Dentistry, Cosmetic Procedures",
            "bio": "Dr. Sarah Johnson has over 15 years of experience in general and cosmetic dentistry. She specializes in smile makeovers and preventive care.",
            "color_code": "#4CAF50",
            "is_active": True
        },
        {
            "id": staff_2_id,
            "business_id": business_id,
            "name": "Dr. James Wilson",
            "email": "james@brightsmile.com",
            "phone": "+1-555-123-4569",
            "title": "Associate Dentist",
            "specialty": "Pediatric Dentistry, Orthodontics",
            "bio": "Dr. James Wilson is passionate about making dental visits fun for children. He specializes in pediatric dentistry and early orthodontic intervention.",
            "color_code": "#2196F3",
            "is_active": True
        }
    ]
    
    for staff in staff_members:
        supabase.table("staff").insert(staff).execute()
        print(f"   ✅ Staff: {staff['name']} - {staff['title']}")
    
    # =========================================================================
    # 4. CREATE SERVICES
    # =========================================================================
    print("\n🦷 Creating services...")
    
    services = [
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "name": "Dental Checkup",
            "description": "Comprehensive dental examination including X-rays and cleaning",
            "duration_minutes": 30,
            "price": 75.00,
            "category": "preventive",
            "is_active": True,
            "requires_staff": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "name": "Teeth Cleaning",
            "description": "Professional dental cleaning and polishing",
            "duration_minutes": 45,
            "price": 100.00,
            "category": "preventive",
            "is_active": True,
            "requires_staff": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "name": "Tooth Filling",
            "description": "Cavity filling with composite or amalgam material",
            "duration_minutes": 60,
            "price": 150.00,
            "category": "restorative",
            "is_active": True,
            "requires_staff": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "name": "Root Canal",
            "description": "Root canal treatment to save damaged teeth",
            "duration_minutes": 90,
            "price": 500.00,
            "category": "restorative",
            "is_active": True,
            "requires_staff": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "name": "Teeth Whitening",
            "description": "Professional in-office teeth whitening treatment",
            "duration_minutes": 60,
            "price": 300.00,
            "category": "cosmetic",
            "is_active": True,
            "requires_staff": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "name": "Emergency Consultation",
            "description": "Urgent dental consultation for pain or emergencies",
            "duration_minutes": 30,
            "price": 100.00,
            "category": "emergency",
            "is_active": True,
            "requires_staff": True
        }
    ]
    
    service_ids = []
    for service in services:
        supabase.table("services").insert(service).execute()
        service_ids.append(service["id"])
        print(f"   ✅ Service: {service['name']} (${service['price']}, {service['duration_minutes']} min)")
    
    # =========================================================================
    # 5. CREATE STAFF-SERVICES MAPPING
    # =========================================================================
    print("\n🔗 Linking staff to services...")
    
    for staff_id in [staff_1_id, staff_2_id]:
        for service_id in service_ids:
            staff_service = {
                "id": str(uuid.uuid4()),
                "staff_id": staff_id,
                "service_id": service_id
            }
            try:
                supabase.table("staff_services").insert(staff_service).execute()
            except:
                pass  # Ignore if already exists
    print("   ✅ All staff linked to all services")
    
    # =========================================================================
    # 6. CREATE AVAILABILITY TEMPLATES (Weekly Schedule)
    # =========================================================================
    print("\n📅 Creating availability templates...")
    
    # Monday to Friday schedule: 9 AM - 5 PM with 30-min slots
    work_days = [1, 2, 3, 4, 5]  # Monday=1 to Friday=5
    
    for staff_id in [staff_1_id, staff_2_id]:
        for day in work_days:
            template = {
                "id": str(uuid.uuid4()),
                "staff_id": staff_id,
                "day_of_week": day,
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "slot_duration_minutes": 30,
                "is_active": True
            }
            supabase.table("availability_templates").insert(template).execute()
    print("   ✅ Weekly schedules created (Mon-Fri, 9AM-5PM)")
    
    # =========================================================================
    # 7. GENERATE TIME SLOTS (Next 30 days)
    # =========================================================================
    print("\n⏰ Generating time slots for next 30 days...")
    
    today = date.today()
    slots_created = 0
    
    for day_offset in range(30):
        current_date = today + timedelta(days=day_offset)
        day_of_week = current_date.weekday() + 1  # Monday=1
        if day_of_week > 5:  # Skip weekends
            continue
        
        for staff_id in [staff_1_id, staff_2_id]:
            # Generate slots from 9 AM to 5 PM
            current_time = time(9, 0)
            end_time = time(17, 0)
            
            while current_time < end_time:
                slot = {
                    "id": str(uuid.uuid4()),
                    "staff_id": staff_id,
                    "business_id": business_id,
                    "date": current_date.isoformat(),
                    "time": current_time.strftime("%H:%M:%S"),
                    "duration_minutes": 30,
                    "is_booked": False,
                    "is_blocked": False
                }
                supabase.table("time_slots").insert(slot).execute()
                slots_created += 1
                
                # Add 30 minutes
                hour = current_time.hour
                minute = current_time.minute + 30
                if minute >= 60:
                    hour += 1
                    minute -= 60
                current_time = time(hour, minute)
    
    print(f"   ✅ Created {slots_created} time slots")
    
    # =========================================================================
    # 8. CREATE CUSTOMERS
    # =========================================================================
    print("\n👥 Creating sample customers...")
    
    customers = [
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "phone": "+1-555-100-0001",
            "email": "john.doe@email.com",
            "first_name": "John",
            "last_name": "Doe",
            "address": "456 Oak Avenue",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90002",
            "notes": "Prefers morning appointments. Has dental anxiety - be gentle.",
            "preferred_staff_id": staff_1_id,
            "total_appointments": 5,
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "phone": "+1-555-100-0002",
            "email": "jane.smith@email.com",
            "first_name": "Jane",
            "last_name": "Smith",
            "address": "789 Pine Street",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90003",
            "notes": "Regular patient. Interested in teeth whitening.",
            "preferred_staff_id": staff_2_id,
            "total_appointments": 10,
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "phone": "+1-555-100-0003",
            "email": "bob.wilson@email.com",
            "first_name": "Bob",
            "last_name": "Wilson",
            "address": "321 Elm Road",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90004",
            "notes": "New patient. Referred by Jane Smith.",
            "total_appointments": 0,
            "is_active": True
        }
    ]
    
    customer_ids = []
    for customer in customers:
        supabase.table("customers").insert(customer).execute()
        customer_ids.append(customer["id"])
        print(f"   ✅ Customer: {customer['first_name']} {customer['last_name']} ({customer['phone']})")
    
    # =========================================================================
    # 9. CREATE AI ROLE (Receptionist)
    # =========================================================================
    print("\n🤖 Creating AI receptionist role...")
    
    ai_role = {
        "id": str(uuid.uuid4()),
        "business_id": business_id,
        "role_type": "receptionist",
        "role_name": "Front Desk",
        "ai_personality_name": "Emma",
        "voice_style": "professional_female",
        "voice_speed": 1.0,
        "system_prompt": """You are Emma, the friendly and professional AI receptionist for Bright Smile Dental Clinic.

Your primary responsibilities:
1. Answer calls professionally with "Thank you for calling Bright Smile Dental Clinic, this is Emma. How may I help you today?"
2. Help callers book, reschedule, or cancel dental appointments
3. Answer questions about services, pricing, and office hours
4. Collect patient information for new patients
5. Handle urgent dental emergencies by prioritizing their appointments

Office Information:
- Hours: Monday to Friday, 9 AM to 5 PM
- Location: 123 Main Street, Suite 100, Los Angeles, CA 90001
- Phone: (555) 123-4567

Staff:
- Dr. Sarah Johnson (Lead Dentist) - General & Cosmetic Dentistry
- Dr. James Wilson (Associate Dentist) - Pediatric & Orthodontics

Always be warm, empathetic, and helpful. If someone is in pain, express concern and try to find the earliest available appointment.""",
        "greeting_message": "Thank you for calling Bright Smile Dental Clinic, this is Emma. How may I help you today?",
        "fallback_message": "I apologize, I didn't quite catch that. Could you please repeat what you said?",
        "is_enabled": True,
        "priority": 1
    }
    supabase.table("ai_roles").insert(ai_role).execute()
    print(f"   ✅ AI Role: {ai_role['role_name']} ({ai_role['ai_personality_name']})")
    
    # =========================================================================
    # 10. CREATE KNOWLEDGE BASE
    # =========================================================================
    print("\n📚 Creating knowledge base...")
    
    knowledge_base_items = [
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "hours",
            "question": "What are your office hours?",
            "answer": "We are open Monday through Friday from 9 AM to 5 PM. We are closed on weekends and major holidays.",
            "keywords": ["hours", "open", "closed", "schedule", "time"],
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "location",
            "question": "Where is your office located?",
            "answer": "We are located at 123 Main Street, Suite 100, Los Angeles, CA 90001. We have free parking available in the back of the building.",
            "keywords": ["location", "address", "where", "directions", "parking"],
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "pricing",
            "question": "How much does a dental checkup cost?",
            "answer": "A comprehensive dental checkup including X-rays and cleaning costs $75. We also accept most major dental insurance plans.",
            "keywords": ["price", "cost", "checkup", "fee", "insurance"],
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "services",
            "question": "What services do you offer?",
            "answer": "We offer a full range of dental services including checkups, cleanings, fillings, root canals, teeth whitening, and emergency consultations. We specialize in both general and cosmetic dentistry.",
            "keywords": ["services", "offer", "provide", "treatments"],
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "insurance",
            "question": "Do you accept dental insurance?",
            "answer": "Yes, we accept most major dental insurance plans including Delta Dental, Cigna, MetLife, and Aetna. Please bring your insurance card to your appointment.",
            "keywords": ["insurance", "accept", "coverage", "dental plan"],
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "emergency",
            "question": "What should I do if I have a dental emergency?",
            "answer": "For dental emergencies during office hours, please call us immediately at (555) 123-4567 and we will try to see you the same day. If it's after hours, go to the nearest emergency room for severe pain or trauma.",
            "keywords": ["emergency", "urgent", "pain", "broken", "trauma"],
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "cancellation",
            "question": "What is your cancellation policy?",
            "answer": "We kindly ask for at least 24 hours notice if you need to cancel or reschedule your appointment. Late cancellations may be subject to a $25 fee.",
            "keywords": ["cancel", "reschedule", "policy", "change appointment"],
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "business_id": business_id,
            "category": "new_patient",
            "question": "What do I need for my first visit?",
            "answer": "For your first visit, please arrive 15 minutes early to complete paperwork. Bring your ID, insurance card if applicable, and a list of any medications you're taking. If you have recent dental X-rays, please bring those as well.",
            "keywords": ["first visit", "new patient", "paperwork", "bring"],
            "is_active": True
        }
    ]
    
    for item in knowledge_base_items:
        supabase.table("knowledge_base").insert(item).execute()
        print(f"   ✅ KB: {item['category']} - {item['question'][:40]}...")
    
    # =========================================================================
    # 11. CREATE CALENDAR CONNECTION (Placeholder for Google Calendar)
    # =========================================================================
    print("\n📅 Creating calendar connection placeholder...")
    
    calendar_connection = {
        "id": str(uuid.uuid4()),
        "business_id": business_id,
        "staff_id": staff_1_id,
        "provider": "google",
        "calendar_id": "primary",
        "calendar_name": "Dr. Sarah Johnson Calendar",
        "sync_enabled": True,
        "sync_direction": "bidirectional",
        # Note: access_token and refresh_token need to be set via OAuth flow
    }
    supabase.table("calendar_connections").insert(calendar_connection).execute()
    print(f"   ✅ Calendar connection created for Dr. Sarah Johnson")
    print("   ⚠️  Note: OAuth tokens need to be set up manually via Google OAuth flow")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 70)
    print("🎉 DATABASE SEED COMPLETED!")
    print("=" * 70)
    print(f"""
📊 Summary:
   • Business: {business['business_name']}
   • Business ID: {business_id}
   • Staff: 2 dentists (Dr. Sarah Johnson, Dr. James Wilson)
   • Staff 1 ID: {staff_1_id}
   • Staff 2 ID: {staff_2_id}
   • Services: {len(services)} dental services
   • Time Slots: {slots_created} slots (next 30 days, Mon-Fri, 9AM-5PM)
   • Customers: {len(customers)} sample customers
   • AI Role: Emma (Receptionist)
   • Knowledge Base: {len(knowledge_base_items)} entries

🔧 Next Steps:
   1. Set up Google Calendar OAuth for the staff member
   2. Create a Calendar Watch for real-time sync
   3. Test the AI phone agent
   4. Book some test appointments

📱 Test Phone Numbers:
   • John Doe: +1-555-100-0001
   • Jane Smith: +1-555-100-0002
   • Bob Wilson: +1-555-100-0003
""")
    
    return {
        "business_id": business_id,
        "staff_1_id": staff_1_id,
        "staff_2_id": staff_2_id,
        "service_ids": service_ids,
        "customer_ids": customer_ids
    }


if __name__ == "__main__":
    print("=" * 70)
    print("DATABASE SEED SCRIPT")
    print("=" * 70)
    print("\nThis will create sample data for testing:")
    print("  - 1 Dental Clinic business")
    print("  - 2 Staff members (dentists)")
    print("  - 6 Services")
    print("  - Time slots for 30 days")
    print("  - 3 Sample customers")
    print("  - AI receptionist configuration")
    print("  - Knowledge base entries")
    print()
    
    response = input("Proceed with seeding? (type 'yes' to confirm): ")
    
    if response.lower() == 'yes':
        seed_database()
    else:
        print("\n❌ Seeding cancelled.")
