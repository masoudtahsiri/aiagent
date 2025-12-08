# Environment Variable Fix

## Issue: Backend URL DNS Resolution

The agent container uses `network_mode: host`, which means it shares the host's network stack. 
Therefore, `host.docker.internal` will not resolve.

## Fix Required

Update `livekit-gemini/.env` file:

**Change from:**
```bash
BACKEND_URL=http://host.docker.internal:8000
```

**To:**
```bash
BACKEND_URL=http://127.0.0.1:8000
```

## Alternative (if not using host network mode)

If you switch to bridge networking in the future, add to `docker-compose.yml`:

```yaml
agent:
  build:
    context: ./agent
    dockerfile: Dockerfile
  restart: unless-stopped
  network_mode: bridge  # or remove this line
  extra_hosts:
    - "host.docker.internal:host-gateway"
  env_file:
    - .env
  depends_on:
    - livekit
```

## Apply the Fix

On the server, edit `/opt/livekit-gemini/.env`:

```bash
cd /opt/livekit-gemini
sed -i 's|BACKEND_URL=http://host.docker.internal:8000|BACKEND_URL=http://127.0.0.1:8000|' .env
docker-compose restart agent
```

