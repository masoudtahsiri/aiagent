#!/bin/bash
# Script to delete old dispatch rule and recreate with new configuration
# Run this on the VPS after updating the code

set -e

echo "=========================================="
echo "  Recreate SIP Dispatch Rule"
echo "=========================================="
echo ""

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

# Set LiveKit connection details
export LIVEKIT_URL=http://127.0.0.1:7880
export LIVEKIT_API_KEY=$LIVEKIT_API_KEY
export LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET

# List existing dispatch rules
echo "Current dispatch rules:"
echo "----------------------"
lk sip dispatch list || echo "No dispatch rules found"
echo ""

# Try to delete by name first (phone-number-routing)
echo "Attempting to delete dispatch rule by name: phone-number-routing"
if lk sip dispatch delete phone-number-routing 2>/dev/null; then
    echo "✓ Successfully deleted dispatch rule by name"
else
    echo "Could not delete by name. Please delete manually using the ID from the list above."
    echo ""
    read -p "Enter dispatch rule ID to delete (or press Enter to skip): " rule_id
    if [ -n "$rule_id" ]; then
        echo "Deleting dispatch rule: $rule_id"
        if lk sip dispatch delete "$rule_id"; then
            echo "✓ Successfully deleted dispatch rule"
        else
            echo "✗ Failed to delete dispatch rule. Continuing anyway..."
        fi
    else
        echo "Skipping deletion. Continuing with rebuild..."
    fi
fi

echo ""
echo "Rebuilding agent container..."
docker-compose build agent

echo ""
echo "Running deploy.sh to create new dispatch rule..."
./deploy.sh

echo ""
echo "=========================================="
echo "  Verification"
echo "=========================================="
echo ""
echo "New dispatch rules:"
echo "----------------------"
lk sip dispatch list

echo ""
echo "Done! The new dispatch rule with dispatch_rule_individual should now be active."
echo ""
echo "To monitor agent logs:"
echo "  docker-compose logs -f agent"





