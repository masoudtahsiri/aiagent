#!/bin/bash
# Deploy n8n to server and start it

SERVER_IP="185.8.130.155"
SSH_PORT="35655"
SSH_USER="root"
SERVER_PASS="${SERVER_PASSWORD:-}"
if [ -z "$SERVER_PASS" ]; then
    echo "Please set SERVER_PASSWORD environment variable or enter password when prompted"
fi
REMOTE_DIR="/opt/n8n"

echo "🚀 Deploying n8n to server..."
echo ""

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "Please install sshpass: sudo apt-get install sshpass"
        exit 1
    fi
fi

# Step 1: Copy files to server
echo "📦 Copying n8n files to server..."
cd "$(dirname "$0")/.."
scp -P $SSH_PORT -r n8n ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR} 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy files. Trying with password..."
    sshpass -p "$SERVER_PASS" scp -P $SSH_PORT -o StrictHostKeyChecking=no -r n8n ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy files. Please copy manually:"
    echo "   scp -P $SSH_PORT -r n8n ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}"
    exit 1
fi

echo "✅ Files copied successfully"
echo ""

# Step 2: Update configuration and start
echo "⚙️  Configuring and starting n8n on server..."
sshpass -p "$SERVER_PASS" ssh -p $SSH_PORT -o StrictHostKeyChecking=no ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/n8n

# Update WEBHOOK_URL
sed -i 's|WEBHOOK_URL=http://localhost:5678/|WEBHOOK_URL=http://185.8.130.155:5678/|g' docker-compose.yml

# Make start script executable
chmod +x start.sh

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Start n8n
echo "Starting n8n containers..."
docker-compose up -d

# Wait a bit
sleep 5

# Check status
echo ""
echo "=== n8n Status ==="
docker-compose ps

echo ""
echo "=== Checking port 5678 ==="
sleep 10
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:5678 || echo "n8n is still starting..."

echo ""
echo "=== Access Information ==="
echo "URL: http://185.8.130.155:5678"
echo "Username: admin"
echo "Password: (check docker-compose.yml)"
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Access n8n at: http://185.8.130.155:5678"
echo "Default username: admin"
echo "Password: (check /opt/n8n/docker-compose.yml on server)"


