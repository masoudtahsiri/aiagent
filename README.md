# AI Receptionist

Multi-tenant AI receptionist SaaS platform using Google Gemini Live API.

## Documentation

📚 **[Full Documentation](docs/README.md)**

## Quick Start

1. Clone and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. Start backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload
   ```

3. Deploy voice agent (on server):
   ```bash
   cd livekit-gemini
   ./deploy.sh
   ```

## Architecture

```
Phone → SIP Provider → LiveKit SIP → Python Agent → Gemini Live API
                                          ↓
                                     FastAPI Backend → Supabase
```

## Project Structure

```
├── backend/           # FastAPI REST API
├── livekit-gemini/    # Voice agent (LiveKit + Gemini)
├── supabase/          # Database schema
├── n8n/               # Workflow automation
└── docs/              # Documentation
```

## License

MIT
