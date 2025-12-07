# Asterisk Gemini Voice AI Bridge

Real-time voice AI using Google Gemini Live API with Asterisk and Bulutfon SIP trunk.

## Architecture

```
Phone Call → Bulutfon SIP → Asterisk (AudioSocket) → Node.js Bridge → Gemini Live API
                                    ↑                      ↓
                                    ←─── Audio Response ───┘
```

## Requirements

- Ubuntu/Debian VPS
- Asterisk with AudioSocket module
- Node.js 18+
- Bulutfon SIP account
- Google Gemini API key

## VPS Setup

### 1. Install Asterisk

```bash
apt update && apt install -y asterisk
```

### 2. Enable AudioSocket Module

Add to `/etc/asterisk/modules.conf`:
```
load = res_audiosocket.so
load = app_audiosocket.so
```

### 3. Configure SIP Trunk

Copy `vps-config/asterisk/pjsip-bulutfon.conf` content to `/etc/asterisk/pjsip.conf`.
Replace `YOUR_PHONE_NUMBER` and `YOUR_SIP_PASSWORD` with your Bulutfon credentials.

### 4. Configure Dialplan

Copy `vps-config/asterisk/extensions-bulutfon.conf` content to `/etc/asterisk/extensions.conf`.

### 5. Install Bridge

```bash
mkdir -p /opt/gemini-bridge
cd /opt/gemini-bridge
# Copy server.js and package.json
npm install
echo "GEMINI_API_KEY=your_key_here" > .env
```

### 6. Setup Systemd Service

```bash
cp vps-config/systemd/gemini-bridge.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable gemini-bridge
systemctl start gemini-bridge
```

### 7. Restart Asterisk

```bash
systemctl restart asterisk
asterisk -rx "pjsip reload"
asterisk -rx "dialplan reload"
```

## Audio Format

- **Asterisk ↔ Bridge**: 16kHz signed linear PCM, big-endian (SLIN16)
- **Bridge ↔ Gemini**: 16kHz PCM little-endian (input), 24kHz PCM (output)

## AudioSocket Protocol

```
[Type: 1 byte] [Length: 2 bytes BE] [Payload: N bytes]

Types:
- 0x00: Hangup
- 0x01: UUID
- 0x10: Audio
- 0xFF: Error
```

## Logs

```bash
# Bridge logs
journalctl -u gemini-bridge -f

# Asterisk logs
asterisk -rvvv
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| GEMINI_API_KEY | Google Gemini API key |

## License

MIT
