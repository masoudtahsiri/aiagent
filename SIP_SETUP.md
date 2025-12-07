# SIP Setup with FreeSWITCH

This document describes the SIP/FreeSWITCH setup on the VPS for connecting phone calls to Gemini AI.

## Server Details

- **VPS IP:** 37.27.104.198
- **SIP Provider:** Bulutfon
- **SIP Host:** trgw01.bulutfon.net
- **Username:** 903322379153
- **Phone Number:** 903322379153

## Architecture

```
Phone Call → Bulutfon SIP → FreeSWITCH → Gemini Bridge → Gemini AI
```

## Components

### 1. FreeSWITCH
- **Location:** `/usr/local/freeswitch`
- **Status:** `systemctl status freeswitch`
- **Logs:** `/usr/local/freeswitch/var/log/freeswitch/freeswitch.log`

### 2. Gemini Bridge
- **Location:** `/opt/gemini-bridge`
- **Status:** `systemctl status gemini-bridge`
- **Logs:** `journalctl -u gemini-bridge -f`
- **Port:** 9090

### 3. SIP Configuration
- **Gateway Config:** `/usr/local/freeswitch/etc/freeswitch/sip_profiles/external/bulutfon.xml`
- **Dialplan:** `/usr/local/freeswitch/etc/freeswitch/dialplan/public/00_bulutfon_inbound.xml`

## Configuration Files

### Bulutfon SIP Gateway
```xml
<!-- /usr/local/freeswitch/etc/freeswitch/sip_profiles/external/bulutfon.xml -->
<include>
  <gateway name="bulutfon">
    <param name="username" value="903322379153"/>
    <param name="password" value="R25LllgOibOLKw"/>
    <param name="realm" value="trgw01.bulutfon.net"/>
    <param name="proxy" value="trgw01.bulutfon.net"/>
    <param name="register" value="true"/>
    <param name="register-transport" value="udp"/>
    <param name="expire-seconds" value="3600"/>
  </gateway>
</include>
```

### Inbound Dialplan
```xml
<!-- /usr/local/freeswitch/etc/freeswitch/dialplan/public/00_bulutfon_inbound.xml -->
<include>
  <extension name="bulutfon_inbound">
    <condition field="destination_number" expression="^(.*)$">
      <action application="answer"/>
      <action application="sleep" data="500"/>
      <action application="socket" data="127.0.0.1:9090 async full"/>
    </condition>
  </extension>
</include>
```

## Gemini Bridge Code

The bridge code is located at `/opt/gemini-bridge/server.js` on the VPS.

**Note:** The current implementation has an issue where Gemini doesn't initiate the greeting. The AI waits for the caller to speak first.

## Useful Commands

```bash
# Check FreeSWITCH status
systemctl status freeswitch

# Check Gemini bridge status
systemctl status gemini-bridge

# View bridge logs
journalctl -u gemini-bridge -f

# View FreeSWITCH logs
tail -f /usr/local/freeswitch/var/log/freeswitch/freeswitch.log

# Reload FreeSWITCH config
fs_cli -x "reloadxml"

# Check SIP registration
fs_cli -x "sofia status gateway bulutfon"

# Restart services
systemctl restart freeswitch
systemctl restart gemini-bridge
```

## Environment Variables

The Gemini bridge requires:
- `GEMINI_API_KEY` - Set in `/opt/gemini-bridge/.env`

## Known Issues

1. **Gemini doesn't greet first** - The AI waits for caller to speak before responding. This is a limitation of the audio-only Gemini Live API mode.

## Future Improvements

- Add pre-recorded greeting before connecting to Gemini
- Implement better error handling
- Add call recording/logging

