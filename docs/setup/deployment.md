# Server Deployment Guide

## Server Requirements

- Ubuntu 20.04+ or Debian 11+
- 2+ CPU cores
- 4GB+ RAM
- Docker & Docker Compose installed

## Initial Server Setup

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Configure Firewall

```bash
ufw allow 22/tcp      # SSH (or your custom port)
ufw allow 5060/udp    # SIP
ufw allow 7880/tcp    # LiveKit API
ufw allow 7881/tcp    # LiveKit RTC
ufw allow 8000/tcp    # Backend API
ufw allow 10000:20000/udp  # RTP media
ufw enable
```

## Deploy Backend

### Option 1: Direct Python

```bash
cd /opt/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Option 2: With systemd

Create `/etc/systemd/system/ai-backend.service`:
```ini
[Unit]
Description=AI Receptionist Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/backend
Environment=PATH=/opt/backend/venv/bin
ExecStart=/opt/backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable ai-backend
systemctl start ai-backend
```

## Deploy Voice Agent

```bash
cd /opt/livekit-gemini
./deploy.sh
```

## Monitoring

```bash
# Backend logs
journalctl -u ai-backend -f

# Agent logs
cd /opt/livekit-gemini && docker-compose logs -f agent

# All containers
docker ps
```

