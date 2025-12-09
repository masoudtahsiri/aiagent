# LiveKit + Gemini Voice AI

Production-quality voice AI using Google Gemini Live API with LiveKit SIP.

## Architecture

```
Phone Call → SIP Provider → LiveKit SIP → LiveKit Server → Python Agent → Gemini Live API
                                ↑                              ↓
                                ←────── Audio Response ────────┘
```

## Components

| Service | Purpose |
|---------|---------|
| Redis | Message broker for LiveKit |
| LiveKit Server | WebRTC media server |
| LiveKit SIP | SIP-to-WebRTC bridge |
| Python Agent | Gemini Live API integration |

## Quick Start

1. Copy files to VPS:
```bash
scp -r livekit-gemini/ root@YOUR_VPS:/opt/
```

2. Create `.env` file:
```bash
cd /opt/livekit-gemini
cat > .env << EOF
LIVEKIT_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=YOUR_API_KEY_HERE
LIVEKIT_API_SECRET=YOUR_API_SECRET_HERE
GEMINI_API_KEY=your_gemini_api_key
EOF
```

3. Update `sip.yaml` with your VPS IP:
```yaml
nat_external_ip: YOUR_VPS_IP
```

4. Run deployment:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Configuration

### SIP Trunk Setup

The deployment script automatically creates:
- Inbound SIP trunk for your phone number
- Dispatch rule to route calls to the agent

### Environment Variables

| Variable | Description |
|----------|-------------|
| LIVEKIT_URL | LiveKit server WebSocket URL |
| LIVEKIT_API_KEY | LiveKit API key |
| LIVEKIT_API_SECRET | LiveKit API secret |
| GEMINI_API_KEY | Google Gemini API key |

## Commands

```bash
# View logs
docker-compose logs -f agent

# Restart services
docker-compose restart

# Check status
docker-compose ps

# Stop all
docker-compose down
```

## Firewall Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 5060 | UDP | SIP signaling |
| 7880 | TCP | LiveKit API |
| 7881 | TCP | LiveKit RTC |
| 10000-20000 | UDP | RTP media |

## Customization

Edit `agent/agent.py` to customize:
- System instructions
- Voice (Kore, Puck, Charon, Fenrir, Aoede)
- Greeting message
- Business logic

## Troubleshooting

**No audio:**
```bash
docker-compose logs sip | grep -i "invite\|audio"
```

**Agent not responding:**
```bash
docker-compose logs agent | grep -i "error"
```

**SIP not registering:**
```bash
docker-compose logs sip | grep -i "register"
```



