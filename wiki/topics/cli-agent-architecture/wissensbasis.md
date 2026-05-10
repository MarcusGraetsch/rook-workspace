# CLI Agent Architecture — Wissensbasis

## Überblick

Warum CLI-basierten Architekturen MCP vorzuziehen sind. Token-Effizienz, Latenz, Kostenersparnis. Das "Wie" — wie zähmt man die rohe Kommandozeile für autonome Agenten?

## Zwei Philosophien

### Position A: Statische Kapselung

- **Thin Wrappers** — kurze Python/PowerShell-Skripte kapseln komplexe Logik
- **JSON-erzwungene CLI-Tools** — `output=json` Flags fest verdrahten
- Beispiel: `kubectl get pods -o json`

### Position B: Dynamische Interaktion

- CLI als Dialog — Agent führt多次 Befehle aus, parsed Zwischenresultate
- Shell-Wrapper für komplexe CLI-Tools (z.B. `gh api repos`)
- Vorteil: Flexibilität, Nachteil: Mehr Token-Verbrauch

## MCP vs CLI

### MCP (Model Context Protocol)

**Vorteile:**
- Strukturierte Schema-Definition
- Type-safe, validierbar
- Gut für statische APIs

**Nachteile:**
- Starre Schemata — bei Änderungen muss das Schema upgedatet werden
- Token-Verbrauch hoch (Schema-Overhead)
- Latenz: Jede MCP-Operation ist ein Roundtrip

### CLI (Command Line Interface)

**Vorteile:**
- Flexibilität: CLI-Tools sind historisch gewachsen
- Lower-Level: Agent kann selbst Parsing machen
- Kein Schema-Overhead
- Token-effizienter

**Nachteile:**
- Kein strukturiertes Schema
- Error-Parsing muss selbst gemacht werden
- Manche Tools haben schlechte JSON-Output

## Praktische Beispiele

### GitHub CLI

```bash
# MCP-Äquivalent: API Call mit festem Schema
gh api repos --jq '.[].name'

# CLI: Dynamisch mit grep/jq
gh repo list --limit 10 | grep -i kubernetes
```

### Kubernetes CLI

```bash
# MCP: Vordefinierte Resource-Definitionen
kubectl get pods -o json

# CLI: Dynamisch mit --custom-columns
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase
```

## Hybride Ansätze

- **CLI-first, MCP-fallback:** Versuche CLI, wenn das nicht funktioniert, nutze MCP
- **CLI als Tool, nicht als Protokoll:** Agent entscheidet wann CLI sinnvoll ist
- **Wrapper-Skripte:** Python-Skript um CLI zu kapseln mit JSON-Output

## Cross-References

- → [[ai-ml]] — AI-Agenten, LLM-Integration
- → [[python-scripting]] — Python-Wrapper für CLI-Tools
- → [[linux-devops]] — Shell, Bash, CLI-Tools
- → [[rook-hermes-bridge]] — Rook/OpenClaw als technische Kontrollebene, Bridge-Governance

## Relevant Sources

- `diskurs-2026-04-02.md` — KI-Agenten: MCP vs CLI Podcast Transkript

---

*Zuletzt aktualisiert: 2026-05-01*