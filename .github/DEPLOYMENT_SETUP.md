# Auto-Deployment Setup Guide

This repository uses GitHub Actions to automatically deploy to the server when you push to the `main` branch.

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

1. Go to: **Settings → Secrets and variables → Actions → New repository secret**

2. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SERVER_IP` | `185.8.130.155` | Server IP address |
| `SSH_PORT` | `35655` | SSH port |
| `SSH_USER` | `root` | SSH username |
| `SERVER_PASSWORD` | `S7J9BPMa9#v4GmZ` | Server password |
| `GEMINI_API_KEY` | `AIzaSyBEv_P7Nhf2f0PH28qYdmueaC8Mc8tt5O4` | Google Gemini API key |

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

