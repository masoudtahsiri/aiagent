# Fix OAuth Redirect URI Mismatch

## The Problem

n8n is trying to use a redirect URI that's not authorized in your Google OAuth app.

## Solution: Add the Correct Redirect URIs

### Step 1: Go to Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select project: `gen-lang-client-0434790016`
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client: `YOUR_CLIENT_ID_HERE`

### Step 2: Add Authorized Redirect URIs

In the "Authorized redirect URIs" section, click **"+ Add URI"** and add **ALL** of these:

```
https://n8n.algorityai.com/rest/oauth2-credential/callback
http://185.8.130.155:80/rest/oauth2-credential/callback
http://localhost:5678/rest/oauth2-credential/callback
```

**Important:** Add all three to cover different scenarios:
- HTTPS via Cloudflare domain
- HTTP via direct IP
- Local development

### Step 3: Save

Click **"Save"** at the bottom of the page.

### Step 4: Wait

It may take a few minutes for changes to propagate. Wait 2-5 minutes, then try again.

---

## Alternative: Use Google OAuth Playground (No Redirect URI Needed)

If you're having trouble with n8n's OAuth, use Google OAuth Playground instead - it doesn't require redirect URI configuration:

### Step 1: Go to OAuth Playground

https://developers.google.com/oauthplayground/

### Step 2: Configure

1. Click the **gear icon (⚙️)** in the top right
2. Check **"Use your own OAuth credentials"**
3. Enter:
   - **OAuth Client ID:** `YOUR_CLIENT_ID_HERE`
   - **OAuth Client secret:** `YOUR_CLIENT_SECRET_HERE`
4. Click **"Close"**

### Step 3: Authorize

1. In the left panel, scroll to **"Calendar API v3"**
2. Expand it and select: `https://www.googleapis.com/auth/calendar`
3. Click **"Authorize APIs"**
4. Sign in with the Google account whose calendar you want to sync
5. Click **"Allow"** to grant permissions

### Step 4: Get Tokens

1. Click **"Exchange authorization code for tokens"**
2. You'll see:
   - **Access token** (starts with `ya29.`)
   - **Refresh token** (starts with `1//`)
3. Copy both tokens

### Step 5: Use Tokens

Use these tokens in your database INSERT query. You don't need n8n's OAuth flow for this.

---

## Quick Fix Checklist

- [ ] Added `https://n8n.algorityai.com/rest/oauth2-credential/callback` to redirect URIs
- [ ] Added `http://185.8.130.155:80/rest/oauth2-credential/callback` to redirect URIs
- [ ] Clicked "Save"
- [ ] Waited 2-5 minutes
- [ ] Tried connecting again in n8n

---

## Still Having Issues?

If you still get the error after adding redirect URIs:

1. **Clear browser cache** and try again
2. **Use incognito/private window**
3. **Check the exact error message** - it might show which redirect URI it's trying to use
4. **Use OAuth Playground instead** - it's simpler and doesn't need redirect URI setup

---

## For Your Use Case

Since you're manually inserting into the database, **OAuth Playground is actually easier**:
- No redirect URI configuration needed
- Get tokens directly
- Use tokens in your SQL INSERT query
- No need to extract from n8n

