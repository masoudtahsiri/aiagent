#!/bin/bash
# Quick setup script for n8n MCP connection

echo "🔧 n8n MCP Setup Helper"
echo "======================"
echo ""
echo "This script will help you set up n8n MCP connection."
echo ""
echo "Step 1: Enable MCP in n8n"
echo "-------------------------"
echo "1. Go to: https://n8n.algorityai.com"
echo "2. Navigate to: Settings → MCP Access"
echo "3. Toggle 'Enable MCP access' to ON"
echo "4. Copy your MCP Access Token from the Access Token tab"
echo ""
read -p "Press Enter after you've copied your MCP Access Token..."
echo ""
read -p "Paste your MCP Access Token here: " MCP_TOKEN
echo ""
echo "Step 2: Configure Cursor"
echo "------------------------"
echo ""
echo "Add this to your Cursor MCP settings:"
echo ""
cat << JSON
{
  "mcpServers": {
    "n8n": {
      "url": "https://n8n.algorityai.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_TOKEN}"
      }
    }
  }
}
JSON
echo ""
echo "✅ Configuration ready!"
echo ""
echo "Next steps:"
echo "1. Open Cursor Settings (Cmd+, or Ctrl+,)"
echo "2. Find MCP settings section"
echo "3. Add the configuration above"
echo "4. Restart Cursor"
echo ""
