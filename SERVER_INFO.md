# Server Information

## Server Details

- **IP Address:** 185.8.130.155
- **SSH Port:** 35655 (non-standard)
- **Hostname:** 185.8.130.155_51094_73280
- **Username:** root

## SSH Connection

```bash
ssh -p 35655 root@185.8.130.155
```

## Configuration Updated

✅ `livekit-gemini/sip.yaml` - Updated with IP: 185.8.130.155

## Important Ports

| Port | Protocol | Service | Purpose |
|------|----------|---------|---------|
| 35655 | TCP | SSH | Server access |
| 5060 | UDP | SIP | Phone calls |
| 7880 | TCP | LiveKit API | WebSocket |
| 7881 | TCP | LiveKit RTC | WebRTC |
| 8000 | TCP | FastAPI | Backend API |
| 10000-20000 | UDP | RTP | Audio media |

## Firewall Configuration

Make sure these ports are open:
```bash
# On the server, run:
ufw allow 5060/udp
ufw allow 7880/tcp
ufw allow 7881/tcp
ufw allow 8000/tcp
ufw allow 10000:20000/udp
```

## Quick Access Commands

```bash
# SSH into server
ssh -p 35655 root@185.8.130.155

# Check LiveKit services
cd /opt/livekit-gemini
docker-compose ps
docker-compose logs -f agent

# Check backend API
curl http://localhost:8000/health
```
