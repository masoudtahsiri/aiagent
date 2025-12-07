# AI Voice Agent

Production-ready voice AI using Google Gemini Live API.

## Solutions

### 1. LiveKit + Gemini (Recommended)

Production-quality solution using LiveKit SIP for automatic audio handling.

**Location:** `livekit-gemini/`

**Features:**
- Automatic audio format conversion
- Professional audio quality
- Built-in VAD (Voice Activity Detection)
- Scalable architecture

See [livekit-gemini/README.md](livekit-gemini/README.md) for setup.

### 2. Asterisk + Node.js Bridge (Legacy)

Direct Asterisk integration with custom audio handling.

**Files:**
- `server.js` - Node.js bridge
- `vps-config/` - Asterisk configuration

## Quick Start (LiveKit)

```bash
# On VPS
cd /opt/livekit-gemini
./deploy.sh
```

## Architecture

```
Phone → SIP Provider → LiveKit SIP → Python Agent → Gemini Live API
```

## Requirements

- VPS with Docker
- SIP trunk (e.g., Bulutfon)
- Google Gemini API key

## License

MIT
