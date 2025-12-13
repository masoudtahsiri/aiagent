#!/bin/bash
# Update n8n on server to latest version

SERVER_IP="185.8.130.155"
SSH_PORT="35655"
SSH_USER="root"
SERVER_PASS="S7J9BPMa9#v4GmZ"
REMOTE_DIR="/opt/n8n"

echo "🔄 Updating n8n on server..."
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

# Update n8n on server
echo "📥 Pulling latest n8n image and restarting containers..."
sshpass -p "$SERVER_PASS" ssh -p $SSH_PORT -o StrictHostKeyChecking=no ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/n8n

echo "Pulling latest n8n image..."
docker-compose pull n8n

echo "Stopping containers..."
docker-compose down

echo "Starting containers with latest image..."
docker-compose up -d

# Wait a bit
sleep 5

# Check status
echo ""
echo "=== n8n Status ==="
docker-compose ps

echo ""
echo "=== Checking n8n health ==="
sleep 10
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:5678 || echo "n8n is still starting..."

echo ""
echo "=== Container Images ==="
docker-compose images

echo ""
echo "✅ Update complete!"
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ n8n update complete!"
    echo ""
    echo "Access n8n at: http://185.8.130.155:5678"
    echo "Default username: admin"
else
    echo ""
    echo "❌ Update failed. Please check the error messages above."
    exit 1
fi

