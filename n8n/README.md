# n8n Setup

n8n workflow automation for AI Receptionist platform.

## Quick Start

```bash
cd n8n
./start.sh
```

## Access

- **URL:** http://localhost:5678 (or http://YOUR_SERVER_IP:5678)
- **Username:** admin
- **Password:** your_secure_password_here (change this!)

## Configuration

### Update Password

Edit `docker-compose.yml` and change:
```yaml
N8N_BASIC_AUTH_PASSWORD=your_secure_password_here
```

Then restart:
```bash
docker-compose restart n8n
```

### Update Webhook URL

If accessing from external IP, update:
```yaml
WEBHOOK_URL=http://YOUR_SERVER_IP:5678/
```

## Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f n8n

# Restart
docker-compose restart n8n
```

## Use Cases

- Appointment reminder automation
- Email/SMS notifications
- Call logging and analytics
- Integration with external services

## Security

⚠️ **Change the default password before production use!**

## Firewall

Make sure port 5678 is open:
```bash
ufw allow 5678/tcp
```





