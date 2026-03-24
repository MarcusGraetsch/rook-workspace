# LLM Provider Final Status - 2026-03-24

## Ergebnis der Tests

### ❌ WAS NICHT FUNKTIONIERT

**Claude Code (automatisch)**
- Problem: `--dangerously-skip-permissions` blockiert für root
- Grund: Anthropic Sicherheitsmaßnahme
- Versuch: `claude --dangerously-skip-permissions --print`
- Fehler: "cannot be used with root/sudo privileges"
- Status: **UNMÖGLICH** auf der VM

**Codex (automatisch)**
- Problem: CLI erfordert interaktives Terminal (TTY)
- Versuch: `codex exec --full-auto`, `script` Wrapper
- Fehler: "stdin is not a terminal" / keine Ausgabe
- Status: **NUR INTERAKTIV** via SSH

---

### ✅ WAS FUNKTIONIERT

**Kimi**
- ✅ Pro Subscription verbunden
- ✅ Funktioniert mit piping (kein TTY nötig)
- ✅ Keine Root-Einschränkungen
- ✅ Bereit für automatische Tasks
- Nutzung: `echo "prompt" | kimi`

**Claude Code (interaktiv)**
- ✅ Pro Subscription verbunden
- ✅ Funktioniert wenn DU per SSH eingeloggt bist
- ✅ Du siehst alle "Darf ich...?" Fragen
- ✅ Du hast volle Kontrolle
- Nutzung: `claude` (interaktiv)

**Codex (interaktiv)**
- ✅ Pro Subscription verbunden
- ✅ Funktioniert wenn DU per SSH eingeloggt bist
- ✅ Interaktive Nutzung möglich
- Nutzung: `codex` (interaktiv)

---

## FINALER WORKFLOW

### Automatische Tasks (VM, Cron, Pipelines)
**Tool:** Kimi (via `kimi` CLI)
- Newsletter Zusammenfassungen
- Artikel-Tagging
- Text-Generierung
- Einzelne Befehle (nicht komplexe Projekte)

### Komplexe Coding-Tasks
**Tool:** Du nutzt Claude/Codex interaktiv
1. Ich analysiere/plane mit Kimi
2. Ich gebe dir die Prompts
3. Du führst in Claude/Codex aus (SSH)
4. Wir diskutieren Ergebnisse

---

## REGELN

1. **KEINE Pay-per-Use APIs** (OpenAI API, Anthropic API)
2. **Kimi = Automatisierung** (funktioniert auf VM)
3. **Claude/Codex = Interaktiv** (nur wenn du eingeloggt bist)
4. **Sicherheit vor Automatisierung** (kein `--dangerously-skip-permissions` für root)

---

## DATEIEN

- `~/.env` - API Key Template (aktuell leer/nicht verwendet)
- `llm_provider.py` - Multi-provider Wrapper (nur Kimi funktioniert automatisch)
- `memory/LLM_POLICY.md` - No Pay-per-Use Policy
- `memory/LLM_USAGE_WORKFLOW.md` - Workflow Dokumentation
