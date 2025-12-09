# Backend Setup Guide

## Prerequisites

- Python 3.10 or higher
- Supabase account with project created
- PostgreSQL database (via Supabase)

## Installation

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Service role key (from Supabase dashboard)
- `SECRET_KEY` - Generate with: `openssl rand -hex 32`

### 4. Setup Database

Run the schema in Supabase SQL Editor:
```bash
# Copy contents of supabase/schema.sql to Supabase SQL Editor and run
```

### 5. Start Server

Development:
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Production:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Verify Installation

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "database": "connected", "timestamp": "..."}
```

## Common Issues

### Import Errors
Make sure you're running from the project root with the backend package:
```bash
python -m uvicorn backend.main:app --reload
```

### Database Connection Fails
1. Check SUPABASE_URL and SUPABASE_KEY in .env
2. Verify schema is exposed (see docs/setup/database.md)

