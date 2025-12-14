# How to Extract OAuth Tokens from n8n

## Method 1: Using n8n UI (Easiest)

### Step 1: Connect Google Calendar in n8n

1. **Go to n8n UI:**
   - Open: `https://n8n.algorityai.com` or `http://185.8.130.155:80`
   - Login with admin credentials

2. **Import or Open the Google Calendar Workflow:**
   - Import `google-calendar-sync-workflow.json`
   - Or create a new workflow

3. **Add a Google Calendar Node:**
   - Click "+" to add node
   - Search for "Google Calendar"
   - Select "Google Calendar" node

4. **Connect Account:**
   - Click on the Google Calendar node
   - In the "Credential" dropdown, click "Create New Credential"
   - Or select existing credential
   - Click "Connect my account"
   - Sign in with Google account
   - Authorize the app
   - n8n will save the tokens automatically

### Step 2: View Credentials

1. **Go to Credentials:**
   - Click on your profile icon (top right)
   - Select "Credentials" from the menu
   - Or go to: `https://n8n.algorityai.com/credentials`

2. **Find Google Calendar Credential:**
   - Look for "Google Calendar OAuth2 API" credential
   - Click on it to view details

3. **View Credential Data:**
   - You'll see the credential name and type
   - However, n8n encrypts credentials by default, so you can't see the raw tokens directly in the UI

---

## Method 2: Using n8n API (Get Raw Tokens)

### Step 1: Get Your n8n API Key

1. **In n8n UI:**
   - Go to Settings → API
   - Create a new API key
   - Copy the API key

### Step 2: Get Credential ID

1. **List all credentials:**
   ```bash
   curl -X GET \
     'https://n8n.algorityai.com/api/v1/credentials' \
     -H 'X-N8N-API-KEY: YOUR_API_KEY'
   ```

2. **Find the Google Calendar credential ID** from the response

### Step 3: Get Credential Details

```bash
curl -X GET \
  'https://n8n.algorityai.com/api/v1/credentials/CREDENTIAL_ID' \
  -H 'X-N8N-API-KEY: YOUR_API_KEY'
```

**Note:** The tokens will still be encrypted. You need to decrypt them.

---

## Method 3: Direct Database Access (If You Have Access)

If you have access to n8n's database, you can extract tokens directly:

### For Docker Installation:

```bash
# SSH to server
ssh -p 35655 root@185.8.130.155

# Access n8n postgres container
docker exec -it n8n-postgres-1 psql -U n8n -d n8n

# Query credentials
SELECT id, name, type, data FROM credentials WHERE type = 'googleCalendarOAuth2Api';
```

**Note:** The `data` field is encrypted. You'll need n8n's encryption key to decrypt it.

---

## Method 4: Use n8n Workflow to Export Tokens (Recommended)

Create a simple workflow that reads and outputs the tokens:

### Step 1: Create Export Workflow

1. **Create new workflow in n8n**

2. **Add "Code" node:**
   ```javascript
   // This will get the credential from the current execution context
   const credentials = $credentials;
   
   // Find Google Calendar credential
   const googleCred = credentials.googleCalendarOAuth2Api;
   
   return [{
     json: {
       access_token: googleCred.accessToken,
       refresh_token: googleCred.refreshToken,
       calendar_id: googleCred.calendarId || 'primary',
       expires_at: googleCred.expiresAt
     }
   }];
   ```

3. **Add "Set" node** to format the output

4. **Execute the workflow** - it will output the tokens

---

## Method 5: Browser Developer Tools (Quick Method)

### Step 1: Connect in n8n

1. Open Google Calendar node in n8n
2. Connect your account
3. Open browser Developer Tools (F12)

### Step 2: Monitor Network Requests

1. Go to **Network** tab in DevTools
2. Execute the workflow or test the node
3. Look for requests to Google Calendar API
4. Check the **Request Headers** for `Authorization: Bearer TOKEN`
5. The token will be in the Authorization header

**Note:** This gives you the access token, but not the refresh token.

---

## Method 6: Use n8n Environment Variables (Best for Production)

Instead of extracting, you can configure n8n to use environment variables:

### Step 1: Set Environment Variables

In n8n's docker-compose.yml or environment:
```yaml
GOOGLE_CALENDAR_ACCESS_TOKEN=your_token_here
GOOGLE_CALENDAR_REFRESH_TOKEN=your_refresh_token_here
```

### Step 2: Use in Workflow

In your workflow, reference:
```
{{ $env.GOOGLE_CALENDAR_ACCESS_TOKEN }}
{{ $env.GOOGLE_CALENDAR_REFRESH_TOKEN }}
```

---

## ⚠️ Important Security Notes

1. **Tokens are sensitive** - Never share them publicly
2. **Access tokens expire** - Usually after 1 hour
3. **Refresh tokens are long-lived** - Keep them secure
4. **n8n encrypts credentials** - This is by design for security

---

## 🎯 Recommended Approach

**For your use case (manual database insertion):**

1. **Use Google OAuth Playground** (easiest):
   - Go to: https://developers.google.com/oauthplayground/
   - Use your OAuth credentials
   - Get tokens directly
   - No need to extract from n8n

2. **Or use n8n to connect, then:**
   - Use Method 5 (Browser DevTools) to get access token
   - Use Method 4 (Workflow export) to get both tokens
   - Or use Method 3 (Database access) if you have server access

---

## 📝 Quick Reference

**What you need:**
- `access_token`: Starts with `ya29.`, expires in 1 hour
- `refresh_token`: Starts with `1//`, long-lived
- `calendar_id`: Usually the Google account email

**Where to use:**
- Insert into `calendar_connections` table
- `access_token` → `access_token` column
- `refresh_token` → `refresh_token` column
- `calendar_id` → `calendar_id` column




