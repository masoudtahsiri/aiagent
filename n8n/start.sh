#!/bin/bash
cd "$(dirname "$0")"
docker-compose up -d
echo ""
echo "n8n is starting..."
echo "Access at: http://localhost:5678"
echo ""
echo "Default credentials:"
echo "Username: admin"
echo "Password: your_secure_password_here"
echo ""
echo "Wait 30 seconds for startup, then visit the URL above"



























