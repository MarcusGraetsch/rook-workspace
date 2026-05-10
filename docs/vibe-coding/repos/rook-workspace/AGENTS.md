# rook-workspace

> Main workspace for Rook. Shell scripts, Python, Markdown docs, Wiki, Operations.
> Public repository. Keine Secrets, keine internen IPs.

## Stack
- Shell: bash (scripts in operations/bin/)
- Python: 3.10+, Type-Hints wo sinnvoll
- Node: 22.x (für OpenClaw, Dashboard)
- Docs: Markdown, Docusaurus (Wiki)
- DB: SQLite (Kanban Board)

## Build/Test
```bash
find operations/bin -name "*.sh" -exec shellcheck {} +
python3 -m py_compile operations/bin/*.py
cd engineering/rook-dashboard && npm run typecheck && npm run lint
```

## Konventionen
- Shell: set -euo pipefail, lowercase mit Unterstrichen, log() Funktion
- Python: PEP 8, Type-Hints, Docstrings
- Docs: Klare Hierarchie, Quellen zitieren
- Git: Conventional Commits

## Off-Limits
- operations/config/ — Config-Files nur mit Marcus-Approval
- .env, .envrc — Secrets-Files
- wiki/topics/*/wissensbasis.md — Nur via Wiki-Lint
- MEMORY.md — Nur Marcus oder explizite Anweisung

## Beispiel-Datei
operations/bin/start-dashboard.sh

## Security
- Keine Secrets in Code
- Keine internen IPs/Hostnames in public Commits
- Input-Validation bei extern-facing Scripts
- Backup/Restore vor destruktiven Änderungen
