# Twilio-Gemini Voice Bridge

This server bridges Twilio phone calls to Google's Gemini Live API for real-time AI voice conversations.

## Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Variables

Create a `.env` file (copy from `env.template`):
```bash
cp env.template .env
```

Then add your Gemini API key:
```
GEMINI_API_KEY=your_key_here
```

### 3. Run Locally
```bash
npm run dev
```

## Deploy to Render

1. **Create Web Service** on Render
2. **Connect your GitHub repo**
3. **Configure:**
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. **Add Environment Variable:**
   - `GEMINI_API_KEY` = your Gemini API key

## Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → Your number
3. Under **Voice Configuration**:
   - **A Call Comes In:** Webhook
   - **URL:** `https://your-app.onrender.com/incoming-call`
   - **Method:** POST

## Architecture

```
Phone Call
    ↓
Twilio (μ-law 8kHz)
    ↓
/incoming-call webhook → Returns TwiML with Stream
    ↓
/media-stream WebSocket
    ↓
Audio Conversion (μ-law 8kHz → PCM 16kHz)
    ↓
Gemini Live API
    ↓
Audio Conversion (PCM 24kHz → μ-law 8kHz)
    ↓
Back to Twilio → Caller hears response
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/incoming-call` | POST | Twilio webhook for incoming calls |
| `/media-stream` | WebSocket | Twilio Media Stream connection |


