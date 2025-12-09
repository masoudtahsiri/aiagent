# Auto-Deployment Setup Guide

This repository uses GitHub Actions to automatically deploy to the server when you push to the `main` branch.

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

1. Go to: **Settings → Secrets and variables → Actions → New repository secret**

2. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SERVER_IP` | `[YOUR_SERVER_IP]` | Server IP address |
| `SSH_PORT` | `[YOUR_SSH_PORT]` | SSH port |
| `SSH_USER` | `[YOUR_SSH_USER]` | SSH username |
| `SERVER_PASSWORD` | `[YOUR_SERVER_PASSWORD]` | Server password |
| `GEMINI_API_KEY` | `[YOUR_GEMINI_API_KEY]` | Google Gemini API key |

## How It Works

1. **On every push to `main` branch:**
   - GitHub Actions automatically triggers
   - Connects to server via SSH
   - Pulls latest code
   - Updates backend dependencies
   - Restarts backend service
   - Rebuilds and restarts LiveKit agent containers

2. **What gets deployed:**
   - Backend API (`/opt/aiagent/backend`)
   - LiveKit-Gemini Agent (`/opt/livekit-gemini`)

## Manual Deployment

If you need to deploy manually:

```bash
# Backend
cd /opt/aiagent/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
systemctl restart aiagent-backend

# LiveKit Agent
cd /opt/livekit-gemini
git pull origin main
docker-compose down
docker-compose build --no-cache agent
docker-compose up -d
```

## Troubleshooting

- Check GitHub Actions logs: **Actions** tab in GitHub
- Check server logs: `journalctl -u aiagent-backend -f`
- Check agent logs: `cd /opt/livekit-gemini && docker-compose logs -f agent`

# Auto-deployment is now active
