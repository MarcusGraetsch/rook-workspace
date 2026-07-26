# Bereichsanweisungen: OpenClaw Operations

## Einordnung

- **Arbeitsmodus:** `operations-runtime`
- **Scope:** betriebliche Zustände, Runbooks, Task-State, Health, Events und kontrollierte Betriebsautomatisierung

## Regeln

- Globale `~/.openclaw/AGENTS.md` lesen.
- `~/.openclaw/prompts/operations-runtime.md` lesen.
- Keine Anwendungsquellcodeänderung ohne explizite Scope-Erweiterung.
- Runtime-State, Logs und Archive nicht pauschal rekursiv lesen.
- Rohlogs und sensible Snapshots ausschließlich unter `.agent-local/` speichern.
- Jede destruktive oder zustandsverändernde Aktion mit Backup- oder Rollbackpfad ausführen.

## Dokumentation

OpenClaw-weite Operationsberichte unter:

```text
~/.openclaw/docs/agent-reports/YYYY/
~/.openclaw/AGENT_CHANGELOG.md
```
