#!/bin/bash
# Helper script to manage LiveKit SIP dispatch rules
# This script helps delete and recreate dispatch rules when needed

set -e

cd /opt/livekit-gemini

# Load environment variables
if [ ! -f .env ]; then
    echo "ERROR: .env file not found in /opt/livekit-gemini"
    exit 1
fi

source .env

# Check if LiveKit CLI is installed
if ! command -v lk &> /dev/null; then
    echo "Installing LiveKit CLI..."
    curl -sSL https://get.livekit.io/cli | bash
fi

echo "=========================================="
echo "  LiveKit SIP Dispatch Rule Manager"
echo "=========================================="
echo ""

# Set LiveKit connection details
export LIVEKIT_URL=http://127.0.0.1:7880
export LIVEKIT_API_KEY=$LIVEKIT_API_KEY
export LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET

# List existing dispatch rules
echo "Current dispatch rules:"
echo "----------------------"
lk sip dispatch list || echo "No dispatch rules found or error listing rules"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Delete a dispatch rule by ID"
echo "2) Delete a dispatch rule by name"
echo "3) Create new dispatch rule (phone-number-routing)"
echo "4) Recreate dispatch rule (delete old + create new)"
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        read -p "Enter dispatch rule ID to delete: " rule_id
        echo "Deleting dispatch rule: $rule_id"
        lk sip dispatch delete "$rule_id"
        echo "Dispatch rule deleted successfully"
        ;;
    2)
        read -p "Enter dispatch rule name to delete: " rule_name
        echo "Deleting dispatch rule: $rule_name"
        lk sip dispatch delete "$rule_name"
        echo "Dispatch rule deleted successfully"
        ;;
    3)
        echo "Creating new dispatch rule..."
        cat > /tmp/dispatch-rule.json << 'EOFDISPATCH'
{
  "dispatch_rule": {
    "rule": {
      "dispatch_rule_individual": {
        "room_prefix": "sip-call-"
      }
    },
    "name": "phone-number-routing",
    "room_config": {
      "agents": [
        {
          "agent_name": "ai-receptionist"
        }
      ]
    }
  }
}
EOFDISPATCH
        lk sip dispatch create /tmp/dispatch-rule.json
        echo "Dispatch rule created successfully"
        ;;
    4)
        echo "Recreating dispatch rule..."
        # Delete old rule by name (ignore errors if it doesn't exist)
        lk sip dispatch delete phone-number-routing 2>/dev/null || echo "No existing rule to delete"
        
        # Create new rule
        cat > /tmp/dispatch-rule.json << 'EOFDISPATCH'
{
  "dispatch_rule": {
    "rule": {
      "dispatch_rule_individual": {
        "room_prefix": "sip-call-"
      }
    },
    "name": "phone-number-routing",
    "room_config": {
      "agents": [
        {
          "agent_name": "ai-receptionist"
        }
      ]
    }
  }
}
EOFDISPATCH
        lk sip dispatch create /tmp/dispatch-rule.json
        echo "Dispatch rule recreated successfully"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Updated dispatch rules:"
echo "----------------------"
lk sip dispatch list

echo ""
echo "Done!"





