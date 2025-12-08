# Deploy n8n to Server

## Step 1: Copy Files to Server

```bash
# From your local machine
scp -P 35655 -r n8n root@185.8.130.155:/opt/
```

## Step 2: SSH into Server

```bash
ssh -p 35655 root@185.8.130.155
```

## Step 3: Update Configuration

```bash
cd /opt/n8n
nano docker-compose.yml
# Change N8N_BASIC_AUTH_PASSWORD to a secure password
# Update WEBHOOK_URL if needed: http://185.8.130.155:5678/
```

## Step 4: Start n8n

```bash
chmod +x start.sh
./start.sh
```

## Step 5: Open Firewall

```bash
ufw allow 5678/tcp
```

## Step 6: Verify

Wait 30 seconds, then visit:
- http://185.8.130.155:5678

## Troubleshooting

```bash
# Check logs
cd /opt/n8n
docker-compose logs -f n8n

# Check status
docker-compose ps

# Restart
docker-compose restart
```
