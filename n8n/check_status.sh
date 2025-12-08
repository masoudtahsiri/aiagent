#!/bin/bash
# Check n8n status on server

echo "Checking n8n status on server..."
echo ""

# Check if n8n directory exists
if [ -d "/opt/n8n" ]; then
    echo "✅ n8n directory exists: /opt/n8n"
    cd /opt/n8n
    
    # Check docker-compose
    if [ -f "docker-compose.yml" ]; then
        echo "✅ docker-compose.yml found"
        
        # Check if containers are running
        echo ""
        echo "Container status:"
        docker-compose ps
        
        # Check port
        echo ""
        echo "Port 5678 status:"
        netstat -tlnp 2>/dev/null | grep 5678 || ss -tlnp 2>/dev/null | grep 5678 || echo "Port 5678 not listening"
        
        # Check if n8n is responding
        echo ""
        echo "n8n health check:"
        curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:5678 || echo "n8n not responding"
    else
        echo "❌ docker-compose.yml not found"
    fi
else
    echo "❌ n8n directory not found at /opt/n8n"
    echo ""
    echo "To deploy n8n:"
    echo "  1. Copy n8n/ directory to /opt/n8n"
    echo "  2. Run: cd /opt/n8n && ./start.sh"
fi

echo ""
echo "Docker containers:"
docker ps | grep -E "n8n|postgres" || echo "No n8n containers running"

