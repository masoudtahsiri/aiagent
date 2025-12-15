#!/bin/bash
# Quick setup script for n8n MCP connection

echo "🔧 n8n MCP Setup Helper"
echo "======================"
echo ""

# Check if token is provided as argument
if [ -n "$1" ]; then
  MCP_TOKEN="$1"
  echo "✅ Using provided token"
else
  echo "Step 1: Get MCP Access Token"
  echo "-------------------------"
  echo "1. Go to: https://n8n.algorityai.com"
  echo "2. Navigate to: Settings → MCP Access"
  echo "3. Toggle 'Enable MCP access' to ON"
  echo "4. Copy your MCP Access Token from the Access Token tab"
  echo ""
  read -p "Press Enter after you've copied your MCP Access Token..."
  echo ""
  read -p "Paste your MCP Access Token here: " MCP_TOKEN
fi

if [ -z "$MCP_TOKEN" ]; then
  echo "❌ Error: No token provided"
  exit 1
fi

echo ""
echo "Step 2: Configure Cursor"
echo "------------------------"
echo ""

# Create .cursor directory if it doesn't exist
CURSOR_MCP_DIR="$HOME/.cursor"
CURSOR_MCP_FILE="$CURSOR_MCP_DIR/mcp.json"

mkdir -p "$CURSOR_MCP_DIR"

# Create or update mcp.json
MCP_URL="https://n8n.algorityai.com/mcp-server/http"

cat > "$CURSOR_MCP_FILE" << JSON
{
  "mcpServers": {
    "n8n": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${MCP_TOKEN}"
      }
    }
  }
}
JSON

echo "✅ Configuration file created: $CURSOR_MCP_FILE"
echo ""
echo "Configuration:"
cat "$CURSOR_MCP_FILE"
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Cursor IDE to load the MCP configuration"
echo "2. After restart, n8n MCP server should be available"
echo "3. Test the connection with: ./test-mcp.sh"
echo ""
