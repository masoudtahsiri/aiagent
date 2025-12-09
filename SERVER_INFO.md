# Server Information

## Server Details

- **IP Address:** [YOUR_SERVER_IP]
- **SSH Port:** [YOUR_SSH_PORT]
- **Username:** [YOUR_USERNAME]

## SSH Connection

```bash
ssh -p [PORT] [USER]@[IP]
```

## Important Ports

| Port | Protocol | Service | Purpose |
|------|----------|---------|---------|
| 35655 | TCP | SSH | Server access |
| 5060 | UDP | SIP | Phone calls |
| 7880 | TCP | LiveKit API | WebSocket |
| 7881 | TCP | LiveKit RTC | WebRTC |
| 8000 | TCP | FastAPI | Backend API |
| 10000-20000 | UDP | RTP | Audio media |

## Note
Never commit actual credentials to this file. Use environment variables.
