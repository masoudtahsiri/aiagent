# Manual Calendar Connection Setup

## 📋 Information Needed

To create the INSERT query, I need the following from you:

### **1. Staff Information** (Choose ONE)
- **Option A:** Staff email address
  - Example: `john@example.com`
  
- **Option B:** Staff UUID
  - Example: `550e8400-e29b-41d4-a716-446655440000`
  
- **Option C:** Staff name
  - Example: `John Doe`

### **2. Google Calendar Information**
- **Google Calendar Email/ID:**
  - Example: `john@gmail.com` or `john@company.com`
  - This is the email of the Google account whose calendar you want to sync

### **3. OAuth Tokens** (Required for API access)

You need to get these from Google OAuth. Here are your options:

#### **Option A: Use n8n to Get Tokens** (Easiest)
1. Go to n8n UI: `https://n8n.algorityai.com`
2. Import the Google Calendar workflow
3. Click on any Google Calendar node
4. Click "Connect Account" → "Connect to Google"
5. Authorize with the Google account
6. n8n will store the tokens
7. You can extract them from n8n's credential storage

#### **Option B: Use Google OAuth Playground** (Manual)
1. Go to: https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter:
   - OAuth Client ID: `YOUR_CLIENT_ID_HERE`
   - OAuth Client secret: `YOUR_CLIENT_SECRET_HERE`
4. In the left panel, find "Calendar API v3"
5. Select: `https://www.googleapis.com/auth/calendar`
6. Click "Authorize APIs"
7. Sign in with the Google account
8. Click "Exchange authorization code for tokens"
9. Copy:
   - **Access token** (starts with `ya29.`)
   - **Refresh token** (starts with `1//`)

#### **Option C: Temporary Test Tokens** (For testing only)
- For initial testing, you can use placeholder tokens
- The sync won't work until you get real tokens
- Access token: `test_access_token`
- Refresh token: `test_refresh_token`

---

## 📝 Template - Fill This Out

```
Staff Email/Name/UUID: _______________________
Google Calendar Email: _______________________
Access Token: _______________________
Refresh Token: _______________________
```

---

## 🔧 Once You Provide the Info

I'll create a custom INSERT query like this:

```sql
INSERT INTO calendar_connections (
    staff_id,
    business_id,
    provider,
    calendar_id,
    calendar_name,
    access_token,
    refresh_token,
    token_expires_at,
    sync_enabled,
    sync_direction
) VALUES (
    -- Your specific values here
);
```

---

## ⚠️ Important Notes

1. **Access tokens expire after 1 hour** - You'll need to refresh them
2. **Refresh tokens are long-lived** - Keep them secure!
3. **Calendar ID** is usually the Google account email
4. **For production**, you should implement automatic token refresh

---

## 🚀 Quick Start (If You Just Want to Test)

If you want to test the system structure first (without real sync), provide:
- Staff email/name
- Google Calendar email
- Use placeholder tokens: `test_access_token` and `test_refresh_token`

Then we can test the workflow structure and add real tokens later.

