# Wissensbasis — Webentwicklung

## Deploy-Lessons

### 1. IONOS

- **Kein SSH-Volllzugriff bei Standard-Tarifen:** Viele IONOS-Webhosting-Pakete bieten nur SFTP, keinen vollständigen SSH-Shell-Zugang. Automatisierungsskripte müssen darauf ausgelegt sein (z.B. kein `ssh user@host "cmd"`).
- **Pfadstruktur beachten:** Der Webroot liegt oft unter `/htdocs` oder `html` — nicht im Home-Verzeichnis. Pfade in Deploy-Skripten immer prüfen.
- **Berechtigungen:** IONOS setzt teils strikte php.ini/Apache-Rechte. Ausführbare CGI-Skripte müssen explizit als `0755` markiert sein.
- **FTP/SFTP-Passwort-Auth:** Key-basierte Authentifizierung ist bei älteren Tarifen nicht verfügbar. Credentials sicher speichern (z.B. via `~/.netrc` mit korrekten Permissions `0600` oder Environment-Variablen).

### 2. Python statt bash source

- **Zuverlässigkeit:** Python-Skripte sind portabler und weniger anfällig für Shell-Interpretation-Probleme (`set -e`, ` errecheck, subshell-Variablen).
- **Kein `source`-Problem:** `bash source`-Befehle (`source .env`) funktionieren nur in bash/zsh. Python kann `.env` mit `python-dotenv` oder `os.environ` sauber lesen — funktioniert überall.
- **Fehlerbehandlung:** Python bietet strukturierte Exception-Handling statt fragile `set -e`.
- **Wartbarkeit:** Python-Code ist einfacher zu testen (unittest/pytest), zu debuggen und weiterzuverteilen.
- **Praxis:** Für Deploy-Skripte, Cron-Jobs und Automation immer Python bevorzugen statt bash-Hacks mit `source`.

### 3. rsync + chmod

- **Problem:** `rsync -avz` erhält Berechtigungen, aber das Zielsystem kann abweichende Defaults haben (z.B. IONOS setzt `0644` für neue Dateien).
- **Lösung:** `--chmod=Du+x` (Directory execute) stellt sicher, dass Verzeichnisse traversierbar bleiben:
  ```bash
  rsync -avz --chmod=Du+x,Dg+x,Do+x /local/path/ user@ionos:/remote/path/
  ```
- **Trockenlauf:** Immer erst `--dry-run` nutzen, um Änderungen vorab zu prüfen.
- **Lokale Kopie:** `rsync -avz /src/ /dest/` (mit trailing slash beim Quellpfad) kopiert konsistent ohne `/src`-Verzeichnis oben drauf.
- **Exclude:** `--exclude='.git/' --exclude='node_modules/'` nicht vergessen, um Deployment-Zeit und Traffic zu sparen.
