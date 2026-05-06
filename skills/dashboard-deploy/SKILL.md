# Dashboard Deploy Skill

> Buildt das rook-dashboard und deployed es via rsync auf den IONOS server.

## Wann benutzen

Nach Änderungen am Dashboard, wenn der neue Build auf `access-5019640593.webspace-host.com` verfügbar sein soll.

## Workflow

### 1. Build lokal

```bash
cd /root/.openclaw/workspace/engineering/rook-dashboard
rm -rf .next
npm run build
```

### 2. Deploy via rsync

```bash
IONOS_HOST="access-5019640593.webspace-host.com"
IONOS_USER="su641339"
IONOS_PASS="$(cat /root/.openclaw/workspace/projects/working-notes/.env | grep '^IONOS_PASSWORD=' | cut -d= -f2-)"

# Variante A: sshpass + rsync
sshpass -p "$IONOS_PASS" rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no -p 22" \
  .next/ \
  "${IONOS_USER}@${IONOS_HOST}:/path/on/server/"

# Variante B: expect (besser für special chars im Passwort)
expect -c "
spawn rsync -avz --delete -e \"ssh -o StrictHostKeyChecking=no -p 22\" .next/ ${IONOS_USER}@${IONOS_HOST}:/path/on/server/
expect \"password:\"
send \"$IONOS_PASS\r\"
expect eof
"
```

### 3. PM2 Neustart auf IONOS

```bash
sshpass -p "$IONOS_PASS" ssh -o StrictHostKeyChecking=no -p 22 ${IONOS_USER}@${IONOS_HOST} "pm2 restart rook-dashboard"
```

## Bekannte Probleme

### Password mit special chars
Passwort aus `.env`: `(rQBJ}…2206` — die Klammern und special chars können sshpass kaputtmachen.
**Fix:** Passwort in Datei speichern und `sshpass -f` nutzen:
```bash
echo "$IONOS_PASS" > /tmp/ionos_pass
sshpass -f /tmp/ionos_pass rsync ...
rm /tmp/ionos_pass
```

### SSH key nicht in known_hosts
**Fix:** `ssh-keyscan -H -p 22 $IONOS_HOST >> ~/.ssh/known_hosts`

## TODO

- [ ] Exakten Zielpfad auf IONOS Server ermitteln (`/var/www/`?)
- [ ] IONOS password in Datei auslagern für sshpass -f
- [ ] PM2 Service Name verifizieren (`rook-dashboard`?)
- [ ] SSH public key auth einrichten statt password
