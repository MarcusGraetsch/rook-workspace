# Backup-Würdige Konfigurationen

## Diese Dateien sollten mit in Backups:

### 1. Rclone Config (KRITISCH)
- **Pfad:** `~/.config/rclone/rclone.conf`
- **Inhalt:** Google Drive OAuth Token
- **Backup:** JA, aber VORSICHTIG (enthält Tokens)
- **Restore:** Kopieren, Token evtl. erneuern

### 2. Kimi Config
- **Pfad:** `~/.kimi/config.toml`
- **Inhalt:** API Key / Session
- **Backup:** JA
- **Restore:** ODER neu: `kimi login`

### 3. Claude Config
- **Pfad:** `~/.config/claude/`
- **Inhalt:** Auth Token
- **Backup:** JA
- **Restore:** ODER neu: `claude auth`

### 4. Codex Config
- **Pfad:** `~/.config/codex/`
- **Inhalt:** OpenAI Auth
- **Backup:** JA
- **Restore:** ODER neu: `codex login`

### 5. SSH Keys (falls verwendet)
- **Pfad:** `~/.ssh/`
- **Backup:** JA (privat!)
- **Restore:** Kopieren

### 6. OpenClaw Config
- **Pfad:** `~/.openclaw/`
- **Inhalt:** Agent Config, Sessions
- **Backup:** JA
- **Restore:** Kopieren

## Was NICHT funktioniERT beim Restore:

❌ OAuth Tokens (verfallen oder Account-spezifisch)
❌ API Keys (sollten nicht committed werden)
❌ Session Cookies (verfallen)

## Empfohlene Backup-Strategie:

```bash
# 1. Struktur (Repos, DBs) → Git + Google Drive ✅
# 2. Secrets (API Keys) → 1Password / Bitwarden
# 3. Configs → Verschlüsselter Backup-Ordner
# 4. OAuth → Manuell neu authentifizieren
```

## Manuelle Schritte nach Restore:

1. Git Repositories klonen
2. rclone config neu (OAuth)
3. Kimi/Codex/Claude neu authentifizieren
4. API Keys aus Password Manager holen
5. Telegram Bot neu einrichten
6. Datenbanken aus Backup restoren
