# n8n Setup

n8n workflow automation for AI Receptionist platform.

## Quick Start

```bash
cd n8n
./start.sh
```

## Access

- **URL:** http://localhost:5678 (or http://YOUR_SERVER_IP:5678)
- **Authentication:** Disabled (no login required)

## Configuration

### Enable Authentication (Optional)

To enable authentication, edit `docker-compose.yml` and change:
```yaml
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
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

## MCP Integration

n8n is configured to work with Cursor IDE via Model Context Protocol (MCP).

### Quick Setup

The MCP connection is already configured. Just **restart Cursor** to activate it.

### Documentation

See [CURSOR_MCP_SETUP.md](./CURSOR_MCP_SETUP.md) for detailed setup instructions.

### Test Connection

```bash
./test-mcp.sh
```

## Use Cases

- Appointment reminder automation
- Email/SMS notifications
- Call logging and analytics
- Integration with external services
- Cursor IDE integration via MCP

## Security

⚠️ **Authentication is currently disabled. Enable it in production for security!**

## Firewall

Make sure port 5678 is open:
```bash
ufw allow 5678/tcp
```







