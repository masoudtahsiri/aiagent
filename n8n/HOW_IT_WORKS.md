# How the Calendar Sync System Works

## 🎯 The Big Picture

This system keeps your **appointment database** and **Google Calendar** in sync automatically.

```
Your Database (Appointments)  ←→  Google Calendar
         ↕️ Syncs every 5 minutes ↕️
```

---

## 📋 Step-by-Step Flow

### **PART 1: Initial Setup (One-Time)**

#### Step 1: Staff Member Connects Their Calendar
```
Staff Member (John) → Clicks "Connect Google Calendar"
                    ↓
Google OAuth Flow → Asks John to authorize
                    ↓
System Gets:
  - Access Token (to access John's calendar)
  - Refresh Token (to get new tokens later)
  - Calendar ID (john@gmail.com)
                    ↓
Saves to Database:
  INSERT INTO calendar_connections (
    staff_id: "john-uuid",
    calendar_id: "john@gmail.com",
    access_token: "ya29...",
    refresh_token: "1//0gv...",
    sync_enabled: TRUE
  )
```

**Result:** John's staff account is now linked to his Google Calendar.

---

### **PART 2: Automatic Sync (Runs Every 5 Minutes)**

#### Step 1: n8n Workflow Wakes Up
```
Every 5 minutes → Schedule Trigger fires
                 ↓
n8n workflow starts
```

#### Step 2: Get List of Staff to Sync
```
n8n calls: GET /api/calendar/sync-status
           ↓
Backend queries database:
  SELECT * FROM calendar_connections 
  WHERE provider = 'google' 
  AND sync_enabled = TRUE
           ↓
Returns list:
  [
    {
      staff_id: "john-uuid",
      calendar_id: "john@gmail.com",
      last_sync_at: "2025-12-13 10:00:00"
    }
  ]
```

#### Step 3: For Each Staff Member, Sync in Both Directions

**Direction A: Database → Google Calendar (PUSH)**
```
1. Get data from YOUR database:
   - Appointments for John
   - Blocked time slots
   - Availability exceptions
   - Business closures
   
2. Convert to Google Calendar format:
   Appointment → Calendar Event
   Blocked slot → Busy block
   
3. Create/Update in Google Calendar:
   Uses John's access_token to write to john@gmail.com
```

**Direction B: Google Calendar → Database (PULL)**
```
1. Read from Google Calendar:
   Uses John's access_token to read john@gmail.com
   
2. Get all events from Google Calendar
   
3. Convert to database format:
   Calendar Event → Appointment (if needed)
   
4. Save to YOUR database
```

#### Step 4: Log Results
```
Save sync results:
  - How many events synced
  - Any errors
  - Last sync time
```

---

## 🔄 Complete Example Flow

Let's say **John** (a doctor) has an appointment system:

### **Scenario: New Appointment Created**

**1. Appointment Created in Your System:**
```
User books appointment → Saved to database
  Appointment:
    - Staff: John
    - Date: Dec 15, 2025
    - Time: 2:00 PM
    - Customer: Jane Doe
```

**2. Next Sync (within 5 minutes):**
```
n8n workflow runs
  ↓
Finds John's calendar connection
  ↓
Gets John's new appointment from database
  ↓
Creates event in John's Google Calendar:
  Title: "Appointment: Jane Doe"
  Date: Dec 15, 2025 2:00 PM
  ↓
John's Google Calendar now shows the appointment!
```

**3. If Someone Adds Event to Google Calendar:**
```
Someone adds event to John's Google Calendar
  ↓
Next sync (within 5 minutes)
  ↓
n8n reads from Google Calendar
  ↓
Finds new event
  ↓
Saves to your database (as appointment or blocked time)
```

---

## 🗄️ Database Structure

### **calendar_connections Table**
This is the **link** between staff and their calendars:

| Column | Example | What It Does |
|--------|---------|--------------|
| `staff_id` | `uuid-123` | Which staff member |
| `calendar_id` | `john@gmail.com` | Which Google Calendar |
| `access_token` | `ya29...` | Permission to access calendar |
| `refresh_token` | `1//0gv...` | Get new tokens when expired |
| `sync_enabled` | `TRUE` | Should we sync this? |
| `sync_direction` | `bidirectional` | Sync both ways |

### **How It Links:**
```
staff table          calendar_connections table
┌─────────────┐      ┌──────────────────────────┐
│ id: uuid-1 │──────│ staff_id: uuid-1        │
│ name: John │      │ calendar_id: john@gmail  │
│ email: ... │      │ access_token: ya29...    │
└─────────────┘      └──────────────────────────┘
```

---

## 🔧 The Components

### **1. Backend API (`backend/api/calendar.py`)**
- **What it does:** Handles sync requests from n8n
- **Endpoints:**
  - `GET /api/calendar/sync-status` → Returns list of staff with connections
  - `POST /api/calendar/sync` → Performs the actual sync
  - `POST /api/calendar/sync-events` → Saves events to database

### **2. n8n Workflow (`n8n/google-calendar-sync-workflow.json`)**
- **What it does:** Automates the sync process
- **Runs:** Every 5 minutes automatically
- **Steps:**
  1. Get list of staff to sync
  2. For each staff member:
     - Get data from database
     - Get data from Google Calendar
     - Sync both ways
  3. Log results

### **3. Database Tables**
- `calendar_connections` → Links staff to calendars
- `appointments` → Your appointments
- `calendar_sync_log` → Sync history

---

## 🎬 Real-World Example

**Monday, 9:00 AM:**
- John connects his Google Calendar
- System saves connection to database

**Monday, 9:05 AM:**
- n8n workflow runs
- Finds John's connection
- Syncs: Database ↔ Google Calendar
- Everything is in sync!

**Monday, 10:00 AM:**
- Customer books appointment with John (in your system)
- Appointment saved to database

**Monday, 10:05 AM:**
- n8n workflow runs again
- Finds new appointment in database
- Creates event in John's Google Calendar
- John sees appointment in his Google Calendar! ✅

**Monday, 11:00 AM:**
- John adds "Lunch Break" to his Google Calendar

**Monday, 11:05 AM:**
- n8n workflow runs
- Finds "Lunch Break" in Google Calendar
- Saves as blocked time in your database
- System won't book appointments during lunch! ✅

---

## ❓ Common Questions

### **Q: How does n8n access Google Calendar?**
**A:** Using OAuth tokens stored in `calendar_connections` table. When staff connects, we save their tokens. n8n uses these tokens to read/write to their calendar.

### **Q: What if tokens expire?**
**A:** Google tokens expire after 1 hour. The `refresh_token` is used to get new `access_token` automatically. Your system should handle this.

### **Q: Can multiple staff members sync?**
**A:** Yes! Each staff member has their own row in `calendar_connections`. The workflow processes all of them.

### **Q: What if sync fails?**
**A:** Errors are logged in `calendar_sync_log` table. The workflow continues with other staff members.

### **Q: How do I know if it's working?**
**A:** Check:
1. `calendar_connections` table has your staff
2. `calendar_sync_log` table shows recent syncs
3. Events appear in Google Calendar
4. Appointments appear in your system

---

## 🚀 Getting Started

1. **Connect a staff member's calendar:**
   - They authorize via Google OAuth
   - System saves connection to database

2. **Verify connection:**
   ```sql
   SELECT * FROM calendar_connections WHERE sync_enabled = TRUE;
   ```

3. **Check if workflow is running:**
   - Go to n8n UI
   - Make sure workflow is **active** (toggled ON)
   - Check execution history

4. **Test sync:**
   - Create appointment in your system
   - Wait 5 minutes
   - Check Google Calendar - appointment should appear!

---

## 📊 Visual Flow Diagram

```
┌─────────────────┐
│  Your Database  │
│  (Appointments) │
└────────┬────────┘
         │
         │ Every 5 minutes
         │
         ▼
┌─────────────────┐
│  n8n Workflow   │
│  (Automation)   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Backend API    │  │ Google Calendar │
│  (Sync Logic)   │  │  (John's Cal)   │
└─────────────────┘  └─────────────────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Sync Complete! │
         │  Both Updated   │
         └─────────────────┘
```

---

**In Simple Terms:**
- Staff connects their Google Calendar (one-time setup)
- Every 5 minutes, the system checks for changes
- If something changed in your database → updates Google Calendar
- If something changed in Google Calendar → updates your database
- Both stay in sync automatically! 🎉




