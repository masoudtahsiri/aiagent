#!/bin/bash
cd /opt/livekit-gemini
docker-compose logs -f --tail=100 agent
