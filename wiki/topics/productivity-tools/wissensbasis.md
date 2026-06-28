# Productivity Tools

## Überblick

Obsidian, Terminal Tools, Productivity-Hacks.

## Obsidian

**Vorteile:**
- Lokale Markdown-Files
- Graph View für Verbindungen
- Kein Abo
- Plugins

## Obsidian-CLI

```bash
npx obsidian-cli <command>
# Commands: open, new, search, backup
```

## Terminal Productivity

```bash
grep -r "pattern" .           # Schnelle Suche
fzf                           # Fuzzy Finder
ranger                        # File Manager
bc                            # Calculator
units                         # Unit Conversion
```

## Relevant Conversations

- Obsidian-related conversations in workspace
-e 

## Notiz-Strategie

Marcus' Notiz-System ist **drei-schichtig**:

1. **Schnelle Captures** → Telegram (sich selbst schicken) → täglicher Sync in Obsidian
2. **Strukturierte Notizen** → Obsidian Vault (`workspace/notes/`)
3. **Long-form** → Working Notes Website (working-notes Repo)

Daily Notes als WIP, wöchentliches Review (Sonntag) fördert strukturiertes Material in Topics.

## Sync-Tools

- **Syncthing** — lokale Sync zwischen Devices (Phone, Laptop, VM), E2EE
- **Obsidian Git Plugin** — auto-commit alle 30min in `rook-workspace`
- **OpenClaw auto-save-research** — Research-Dateien werden automatisch committed

Mobile Workflow: Phone-Notizen via Syncthing → Vault → morgens vom LLM in Daily-Note aggregiert.

## Terminal-Workflow (Kern-Setup)

Standard-Tools für jeden Tag:

```bash
fzf              # Fuzzy Finder (Ctrl+R für History, Ctrl+T für Files)
rg              # ripgrep, schneller als grep -r
btm             # bashtop / btop für System-Monitoring
delta            # git diff mit Syntax-Highlighting
zoxide           # smarte cd (z <partial>)
```

Diese Tools sind auf der VM standardmäßig installiert (siehe `linux-devops` Topic).

## Cross-References

- → [[cloud-kubernetes]] — (placeholder)

## Cross-References

- → [[knowledge-management]] — Obsidian als KM-Tool
- → [[linux-devops]] — Terminal-Tools

