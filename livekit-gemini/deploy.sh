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
if grep -q "YOUR_GEMINI_API_KEY_HERE" .env; then
    echo "ERROR: Please set your Gemini API key in .env"
    echo "Edit .env and replace YOUR_GEMINI_API_KEY_HERE"
    exit 1
fi

# Stop old services
echo "Stopping old services..."
systemctl stop gemini-bridge 2>/dev/null || true
systemctl stop freeswitch 2>/dev/null || true
systemctl stop asterisk 2>/dev/null || true
systemctl disable gemini-bridge 2>/dev/null || true
systemctl disable freeswitch 2>/dev/null || true

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
    apt-get install -y jq
    curl -sSL https://get.livekit.io/cli | bash
fi

# Get credentials from .env
source .env

# Configure SIP trunk
echo "Configuring SIP trunk..."

lk sip inbound create --name "bulutfon" --numbers "+903322379153" --allowed-addresses "trgw01.bulutfon.net" || echo "Trunk may already exist"

lk sip dispatch create --name "dental-receptionist" --direct "dental-clinic" || echo "Dispatch rule may already exist"

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

