#!/bin/bash
# Test n8n MCP connection

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NWYyOTBkYi02ZjE1LTQ5YjUtYTY2Mi1mMGRhNGM5NzY0NjEiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjA3NTQwODYxLTViODgtNGM4MS1iNzcwLTE4MzRhMDBlZDBjMCIsImlhdCI6MTc2NTY2NDU1OH0.2XlP0taqxdnRfed1QqO9GrLfvMkuiYRmSXk6exOqYgg"
URL="https://n8n.algorityai.com/mcp-server/http"

echo "Testing n8n MCP Server..."
echo ""

# Test 1: Initialize
echo "1. Testing initialize..."
RESPONSE=$(curl -s -X POST "$URL?access_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0"
      }
    }
  }')

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 2: List tools
echo "2. Testing tools/list..."
RESPONSE=$(curl -s -X POST "$URL?access_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }')

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 3: List resources
echo "3. Testing resources/list..."
RESPONSE=$(curl -s -X POST "$URL?access_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/list",
    "params": {}
  }')

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
