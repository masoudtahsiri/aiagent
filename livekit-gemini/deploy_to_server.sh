#!/bin/bash
# Deploy LiveKit Gemini SIP fix to server
# This script copies updated files and runs deployment commands on the VPS

set -e

SERVER_IP="185.8.130.155"
SSH_PORT="35655"
SSH_USER="root"
REMOTE_DIR="/opt/livekit-gemini"

echo "🚀 Deploying LiveKit Gemini SIP fix to server..."
echo ""

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Step 1: Copy updated files to server
echo "📦 Copying updated files to server..."
echo "   Source: $SCRIPT_DIR"
echo "   Destination: ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}"
echo ""

# Copy the livekit-gemini directory
scp -P $SSH_PORT -r "$SCRIPT_DIR"/* ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/ 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy files via SSH key. Trying with password authentication..."
    echo "   (You may be prompted for password)"
    
    # Check if sshpass is available
    if command -v sshpass &> /dev/null; then
        read -sp "Enter server password: " SERVER_PASS
        echo ""
        sshpass -p "$SERVER_PASS" scp -P $SSH_PORT -o StrictHostKeyChecking=no -r "$SCRIPT_DIR"/* ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/
    else
        echo "❌ sshpass not found. Please copy files manually:"
        echo "   scp -P $SSH_PORT -r $SCRIPT_DIR/* ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/"
        exit 1
    fi
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy files. Please copy manually:"
    echo "   scp -P $SSH_PORT -r $SCRIPT_DIR/* ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/"
    exit 1
fi

echo "✅ Files copied successfully"
echo ""

# Step 2: Run deployment commands on server
echo "⚙️  Running deployment on server..."
echo ""

# Check if we should use password authentication
USE_PASSWORD=false
if ! ssh -p $SSH_PORT -o BatchMode=yes -o ConnectTimeout=5 ${SSH_USER}@${SERVER_IP} exit 2>/dev/null; then
    USE_PASSWORD=true
fi

if [ "$USE_PASSWORD" = true ] && command -v sshpass &> /dev/null; then
    read -sp "Enter server password for SSH: " SERVER_PASS
    echo ""
    SSH_CMD="sshpass -p '$SERVER_PASS' ssh -p $SSH_PORT -o StrictHostKeyChecking=no"
else
    SSH_CMD="ssh -p $SSH_PORT"
fi

# Run deployment commands
$SSH_CMD ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/livekit-gemini

echo "=========================================="
echo "  Running Deployment on Server"
echo "=========================================="
echo ""

# Load environment
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found"
    exit 1
fi

source .env

# Check if LiveKit CLI is installed
if ! command -v lk &> /dev/null; then
    echo "Installing LiveKit CLI..."
    curl -sSL https://get.livekit.io/cli | bash
fi

# Set LiveKit connection details
export LIVEKIT_URL=http://127.0.0.1:7880
export LIVEKIT_API_KEY=$LIVEKIT_API_KEY
export LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET

# List existing dispatch rules
echo "Current dispatch rules:"
echo "----------------------"
lk sip dispatch list || echo "No dispatch rules found"
echo ""

# Try to delete old rule by name
echo "Deleting old dispatch rule (if exists)..."
lk sip dispatch delete phone-number-routing 2>/dev/null && echo "✓ Deleted by name" || echo "  (No rule found with that name, or deletion failed)"

# If that didn't work, try to get ID and delete
if [ $? -ne 0 ]; then
    echo "Attempting to delete by listing and finding ID..."
    RULE_ID=$(lk sip dispatch list 2>/dev/null | grep -i "phone-number-routing" | head -1 | awk '{print $1}' || echo "")
    if [ -n "$RULE_ID" ]; then
        lk sip dispatch delete "$RULE_ID" && echo "✓ Deleted by ID: $RULE_ID"
    fi
fi

echo ""
echo "Rebuilding agent container..."
docker-compose build agent

echo ""
echo "Running deploy.sh to create new dispatch rule..."
chmod +x deploy.sh
./deploy.sh

echo ""
echo "=========================================="
echo "  Verification"
echo "=========================================="
echo ""
echo "New dispatch rules:"
echo "----------------------"
lk sip dispatch list

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To monitor agent logs:"
echo "  docker-compose logs -f agent"
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ Deployment Successful!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Monitor logs: ssh -p $SSH_PORT ${SSH_USER}@${SERVER_IP} 'cd $REMOTE_DIR && docker-compose logs -f agent'"
    echo "  2. Make a test call to verify the fix"
    echo "  3. Check logs for 'sip.toUser' in participant attributes"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Please check the output above."
    echo ""
    echo "You can also SSH in manually and run:"
    echo "  ssh -p $SSH_PORT ${SSH_USER}@${SERVER_IP}"
    echo "  cd $REMOTE_DIR"
    echo "  ./recreate_dispatch_rule.sh"
    echo ""
    exit 1
fi




















