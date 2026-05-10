# rook-workspace

> Main workspace for Rook. Shell scripts, Python, Markdown docs, Wiki, Operations.
> Public repository. Keine Secrets, keine internen IPs.

## Stack
- **Shell:** bash (scripts in `operations/bin/`)
- **Python:** 3.10+, Typ-Hints wo sinnvoll
- **Node:** 22.x (für OpenClaw, Dashboard)
- **Docs:** Markdown, Docusaurus (Wiki)
- **DB:** SQLite (Kanban Board)
- **Git:** Multi-repo workspace mit Submodules

## Build/Test
```bash
# Shell-Scripts validieren
find operations/bin -name "*.sh" -exec shellcheck {} +

# Python validieren
python3 -m py_compile operations/bin/*.py

# Dashboard (wenn aktiv)
cd engineering/rook-dashboard && npm run typecheck && npm run lint
```

## Konventionen
- **Shell:** `set -euo pipefail`, lowercase mit Unterstrichen, `log()` Funktion
- **Python:** PEP 8, Type-Hints, Docstrings für komplexe Funktionen
- **Docs:** Klare Hierarchie, Quellen zitieren, keine Halluzinationen
- **Git:** Conventional Commits, kein `git push -f` auf main
- **Naming:** `kebab-case` für Dateien, `snake_case` für Variablen

## Folder Structure
```
operations/bin/          # Shell/Python-Scripts
operations/config/       # JSON-Config (keine Secrets)
operations/schemas/      # JSON Schemas
operations/systemd/      # systemd Units
docs/                    # Dokumentation
wiki/                    # LLM-Wiki (Karpathy Pattern)
memory/                  # Tägliche Notizen
engineering/             # Code-Projekte (Submodules)
tasks/                   # Legacy TODOs
```

## Off-Limits (NIEMALS ändern)
- `operations/config/` — Config-Files nur mit Marcus-Approval
- `.env`, `.envrc` — Secrets-Files (in .gitignore)
- `engineering/*/node_modules/` — Auto-generiert
- `wiki/topics/*/wissensbasis.md` — Nur via Wiki-Lint/Review-Prozess
- `MEMORY.md` — Nur Marcus oder explizite Anweisung

## Beispiel-Datei (Shell-Stil)
Siehe: `operations/bin/start-dashboard.sh`

## Testing
- Shell: `shellcheck`
- Python: `python3 -m py_compile`
- Keine Unit-Tests nötig für Ops-Scripts — Integrationstests via Dry-Run

## Security
- Keine Secrets in Code
- Keine internen IPs/Hostnames in public Commits
- Input-Validation bei allen extern-facing Scripts
- Backup/Restore vor destruktiven Änderungen
