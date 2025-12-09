# Voice Agent Setup Guide

## Prerequisites

- Docker & Docker Compose
- Google Gemini API key
- LiveKit credentials
- SIP trunk provider account

## Server Installation

### 1. Copy Files to Server

```bash
scp -r livekit-gemini/ root@YOUR_SERVER:/opt/
```

### 2. Configure Environment

```bash
cd /opt/livekit-gemini
cp .env.example .env
nano .env
```

Fill in:
- `LIVEKIT_API_KEY` - Generate or use existing
- `LIVEKIT_API_SECRET` - Generate or use existing  
- `GOOGLE_API_KEY` - From Google AI Studio (Gemini API key)
- `BACKEND_URL` - Your backend API URL

### 3. Update SIP Configuration

Edit `sip.yaml`:
```yaml
nat_external_ip: YOUR_SERVER_PUBLIC_IP
```

### 4. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

## Verify Installation

```bash
# Check services
docker-compose ps

# View agent logs
docker-compose logs -f agent
```

## Firewall Ports

Ensure these ports are open:

| Port | Protocol | Purpose |
|------|----------|---------|
| 5060 | UDP | SIP signaling |
| 7880 | TCP | LiveKit API |
| 7881 | TCP | LiveKit RTC |
| 10000-20000 | UDP | RTP media |

```bash
ufw allow 5060/udp
ufw allow 7880/tcp
ufw allow 7881/tcp
ufw allow 10000:20000/udp
```

## Common Commands

```bash
# View logs
docker-compose logs -f agent

# Restart agent
docker-compose restart agent

# Stop all
docker-compose down

# Rebuild and restart
docker-compose build agent && docker-compose up -d agent
```

