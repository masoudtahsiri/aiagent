# AI Receptionist Documentation

Multi-tenant AI receptionist SaaS platform using Google Gemini Live API with LiveKit SIP.

## Quick Links

- [Backend Setup](setup/backend.md)
- [Voice Agent Setup](setup/agent.md)
- [Database Setup](setup/database.md)
- [Deployment Guide](setup/deployment.md)
- [API Documentation](api/endpoints.md)
- [Troubleshooting](troubleshooting.md)

## Architecture Overview

```
Phone Call → SIP Provider → LiveKit SIP → Python Agent → Gemini Live API
                                              ↓
                                         FastAPI Backend → Supabase
```

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Backend API | `backend/` | FastAPI REST API for business logic |
| Voice Agent | `livekit-gemini/` | LiveKit + Gemini phone agent |
| Database | `supabase/` | PostgreSQL schema and migrations |
| Automation | `n8n/` | Workflow automation (optional) |

## Requirements

- Python 3.10+
- Docker & Docker Compose
- Supabase account
- Google Gemini API key
- LiveKit Cloud or self-hosted
- SIP trunk provider (e.g., Bulutfon)

## Quick Start

1. Copy environment files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp livekit-gemini/.env.example livekit-gemini/.env
   ```

2. Fill in your credentials in each `.env` file

3. Start backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload
   ```

4. Start voice agent (on server):
   ```bash
   cd livekit-gemini
   ./deploy.sh
   ```

## Support

For issues, check [Troubleshooting](troubleshooting.md) first.

