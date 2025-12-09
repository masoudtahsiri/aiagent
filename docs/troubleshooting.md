# Troubleshooting Guide

## Backend Issues

### "Module not found" errors

**Problem:** Import errors when starting backend

**Solution:** Run with proper module path:
```bash
cd /path/to/project
python -m uvicorn backend.main:app --reload
```

### "Schema must be one of: graphql_public"

**Problem:** Supabase API not exposing public schema

**Solution:** Run in Supabase SQL Editor:
```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage';
NOTIFY pgrst, 'reload schema';
```

### Database connection timeout

**Problem:** Backend can't connect to Supabase

**Solution:**
1. Check `SUPABASE_URL` is correct (no trailing slash)
2. Check `SUPABASE_KEY` is the service role key
3. Verify network allows outbound HTTPS

## Voice Agent Issues

### Agent not receiving calls

**Problem:** Calls don't reach the agent

**Checklist:**
1. SIP trunk configured correctly
2. Firewall ports open (5060/udp, 10000-20000/udp)
3. `nat_external_ip` in sip.yaml matches server IP
4. Dispatch rule exists: `lk sip dispatch list`

### "Called number not found"

**Problem:** Agent can't extract called phone number

**Solution:** Check dispatch rule uses `dispatch_rule_individual`:
```bash
cd /opt/livekit-gemini
./manage_dispatch_rules.sh
# Choose option 4 to recreate rule
```

### No audio / ticking noise

**Problem:** Call connects but no audio or strange sounds

**Solution:**
1. Check Gemini API key is valid
2. Verify agent logs for errors: `docker-compose logs -f agent`
3. Restart agent: `docker-compose restart agent`

### Business not found for phone number

**Problem:** Agent can't route call to business

**Solution:**
1. Verify `ai_phone_number` is set in database:
```sql
SELECT id, business_name, ai_phone_number FROM businesses;
```
2. Update if needed:
```sql
UPDATE businesses SET ai_phone_number = '+1234567890' WHERE id = 'your-business-id';
```

## Docker Issues

### Container won't start

```bash
# Check logs
docker-compose logs service_name

# Rebuild
docker-compose build --no-cache service_name
docker-compose up -d service_name
```

### Port already in use

```bash
# Find what's using the port
sudo lsof -i :PORT_NUMBER

# Kill if needed
sudo kill -9 PID
```

## Getting Help

1. Check logs first (backend, agent, docker)
2. Search error message in project issues
3. Verify all environment variables are set

