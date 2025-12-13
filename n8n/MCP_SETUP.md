# n8n MCP (Model Context Protocol) Setup Guide

This guide explains how to connect n8n to Cursor IDE via MCP.

## Prerequisites

✅ n8n instance running at `https://n8n.algorityai.com`  
✅ n8n version 1.123.5 (supports MCP)  
✅ Cursor IDE with MCP support

## Step 1: Enable MCP in n8n UI

1. **Access n8n:**
   - Go to: `https://n8n.algorityai.com`
   - No login required (authentication disabled)

2. **Enable MCP Access:**
   - Navigate to: **Settings** → **MCP Access**
   - Toggle **"Enable MCP access"** to ON
   - You'll see two authentication options:
     - **OAuth2** (for production)
     - **Access Token** (simpler, recommended for development)

3. **Get Your MCP Access Token:**
   - In the **Access Token** tab, copy your personal MCP Access Token
   - This token is automatically generated when you first visit the MCP Access page
   - **Save this token** - you'll need it for Cursor configuration

## Step 2: Expose Workflows to MCP

For each workflow you want to access via MCP:

1. Open the workflow in n8n editor
2. Click on **Settings** (gear icon in workflow)
3. Toggle **"Available in MCP"** to ON
4. Save the workflow

**Note:** By default, no workflows are exposed to MCP clients for security.

## Step 3: Configure Cursor IDE

### Method 1: Add to Cursor Settings (Recommended)

1. **Open Cursor Settings:**
   - Press `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
   - Or go to: **Cursor** → **Settings**

2. **Find MCP Settings:**
   - Search for "MCP" in settings
   - Or navigate to the MCP configuration section

3. **Add n8n MCP Server:**
   
   Add this configuration to your Cursor MCP settings:
   
   ```json
   {
     "mcpServers": {
       "n8n": {
         "url": "https://n8n.algorityai.com/mcp-server/http?access_token=YOUR_ACCESS_TOKEN"
       }
     }
   }
   ```
   
   Replace `YOUR_ACCESS_TOKEN` with your MCP access token from Step 1.
   
   **Note:** The access token is included in the URL query parameter, not as a header.

### Method 2: Edit Settings File Directly

1. **Find Cursor settings file:**
   - Mac: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Windows: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - Linux: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

2. **Add the configuration** (see Method 1 above)

3. **Restart Cursor**

## Step 4: Verify Connection

1. **Restart Cursor IDE** (required after MCP configuration changes)

2. **Test the connection:**
   - Ask Cursor: "List my n8n workflows"
   - Ask Cursor: "Show me the Google Calendar sync workflow"
   - Ask Cursor: "What workflows are available in n8n?"

3. **Check MCP status:**
   - Look for MCP connection indicators in Cursor
   - Check for any error messages

## Current n8n Configuration

- **URL:** `https://n8n.algorityai.com`
- **Version:** 1.123.5
- **UI Authentication:** Disabled
- **MCP Access:** Needs to be enabled in n8n UI (Settings → MCP Access)
- **Runners Enabled:** Yes (`N8N_RUNNERS_ENABLED=true`)

## Troubleshooting

### "MCP Access" option not visible
- Ensure you're using n8n version 1.0 or higher
- Check that you have owner/admin permissions
- Try refreshing the n8n page

### Connection Failed in Cursor
- Verify n8n URL is accessible: `https://n8n.algorityai.com`
- Check MCP Access Token is correct (no extra spaces)
- Ensure MCP access is enabled in n8n settings
- Check Cursor console for error messages

### No Workflows Available
- Ensure workflows are marked as "Available in MCP" in their settings
- Check that at least one workflow is active
- Verify the workflow is saved

### Authentication Issues
- Regenerate MCP Access Token in n8n (Settings → MCP Access → Access Token)
- Update the token in Cursor MCP settings
- Restart Cursor after updating

## Quick Start Checklist

- [ ] Access n8n at `https://n8n.algorityai.com`
- [ ] Enable MCP Access (Settings → MCP Access)
- [ ] Copy MCP Access Token
- [ ] Mark at least one workflow as "Available in MCP"
- [ ] Add n8n to Cursor MCP settings with the token
- [ ] Restart Cursor IDE
- [ ] Test connection by asking about workflows

## Example Usage

Once connected, you can ask Cursor:

- "List all my n8n workflows"
- "Show me the details of the Google Calendar sync workflow"
- "What triggers are configured in my n8n workflows?"
- "Execute the workflow with ID X"

## References

- [n8n MCP Documentation](https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor MCP Documentation](https://cursor.sh/docs/mcp)

