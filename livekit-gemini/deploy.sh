#!/bin/bash
set -e

echo "=========================================="
echo "  LiveKit + Gemini Deployment Script"
echo "=========================================="

cd /opt/livekit-gemini

# Generate API keys if not set
if grep -q "YOUR_API_KEY_HERE" livekit.yaml; then
    echo "Generating API keys..."
    API_KEY=$(openssl rand -hex 16)
    API_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
    
    echo "API_KEY: $API_KEY"
    echo "API_SECRET: $API_SECRET"
    echo ""
    echo "SAVE THESE KEYS!"
    echo ""
    
    # Update config files
    sed -i "s/YOUR_API_KEY_HERE/$API_KEY/g" livekit.yaml sip.yaml .env
    sed -i "s/YOUR_API_SECRET_HERE/$API_SECRET/g" livekit.yaml sip.yaml .env
fi

# Check for Gemini API key
if grep -q "YOUR_GOOGLE_API_KEY_HERE" .env; then
    echo "ERROR: Please set your Google API key in .env"
    echo "Edit .env and replace YOUR_GOOGLE_API_KEY_HERE"
    exit 1
fi

# Stop old services (if any)
echo "Stopping old services..."
systemctl stop gemini-bridge 2>/dev/null || true
systemctl disable gemini-bridge 2>/dev/null || true

# Open firewall ports
echo "Configuring firewall..."
ufw allow 5060/udp || true
ufw allow 7880/tcp || true
ufw allow 7881/tcp || true
ufw allow 10000:20000/udp || true

# Build and start
echo "Building containers..."
docker-compose build

echo "Starting services..."
docker-compose up -d

echo "Waiting for services to start..."
sleep 20

# Install LiveKit CLI if not present
if ! command -v lk &> /dev/null; then
    echo "Installing LiveKit CLI..."
    curl -sSL https://get.livekit.io/cli | bash
fi

# Get credentials from .env
source .env

# Configure SIP trunk
echo "Configuring SIP trunk..."

cat > /tmp/inbound-trunk.json << EOFTRUNK
{
  "trunk": {
    "name": "bulutfon",
    "numbers": ["+903322379153"],
    "allowed_addresses": ["trgw01.bulutfon.net"]
  }
}
EOFTRUNK

LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip inbound create /tmp/inbound-trunk.json || echo "Trunk may already exist"

# Create dispatch rule - Use individual dispatch to create unique rooms per call
# Agent will extract called number from SIP participant attributes (sip.toUser)
# IMPORTANT: Must specify agent_name in room_config.agents for LiveKit to dispatch
cat > /tmp/dispatch-rule.json << 'EOFDISPATCH'
{
  "dispatch_rule": {
    "rule": {
      "dispatch_rule_individual": {
        "room_prefix": "sip-call-"
      }
    },
    "name": "phone-number-routing",
    "room_config": {
      "agents": [
        {
          "agent_name": "ai-receptionist"
        }
      ]
    }
  }
}
EOFDISPATCH

# Delete old dispatch rule if it exists (to avoid conflicts)
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch delete phone-number-routing 2>/dev/null || echo "No existing dispatch rule to delete"

# Create new dispatch rule with individual routing
LIVEKIT_URL=http://127.0.0.1:7880 \
LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET \
lk sip dispatch create /tmp/dispatch-rule.json || echo "Dispatch rule may already exist"

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/livekit-gemini.service << EOFSVC
[Unit]
Description=LiveKit Gemini Voice Agent
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/livekit-gemini
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
EOFSVC

systemctl daemon-reload
systemctl enable livekit-gemini

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Services running:"
docker-compose ps
echo ""
echo "To view logs:"
echo "  docker-compose logs -f agent"
echo ""
echo "To test:"
echo "  Call your Bulutfon number: 903322379153"
echo ""
