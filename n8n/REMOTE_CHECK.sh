#!/bin/bash
# Run this on the server to check n8n status

echo "=== n8n Status Check ==="
echo ""

# Check directory
if [ -d "/opt/n8n" ]; then
    echo "✅ n8n directory exists"
    cd /opt/n8n
    
    if [ -f "docker-compose.yml" ]; then
        echo "✅ docker-compose.yml found"
        echo ""
        echo "Container status:"
        docker-compose ps
        echo ""
        echo "Port 5678:"
        netstat -tlnp 2>/dev/null | grep 5678 || ss -tlnp 2>/dev/null | grep 5678 || echo "Not listening"
        echo ""
        echo "Health check:"
        curl -s http://localhost:5678 > /dev/null && echo "✅ n8n is responding" || echo "❌ n8n not responding"
    else
        echo "❌ docker-compose.yml missing"
    fi
else
    echo "❌ /opt/n8n directory not found"
    echo ""
    echo "n8n is NOT deployed yet."
    echo "To deploy, copy n8n/ files to /opt/n8n and run ./start.sh"
fi

echo ""
echo "All Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -10
