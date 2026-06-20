---
name: "repo-analyst"
description: "Analysiert GitHub-Repos nach 5 Leitfragen (Nützlichkeit, Teile, Umbau, Hardware, Kosten) und liefert standardisierten Bewertungsreport."
---

# repo-analyst

Analysiert ein GitHub-Repository (oder lokalen Pfad) nach einem festen Schema und liefert eine standardisierte Bewertung als Markdown-Report. Optimiert für die wiederkehrende Aufgabe "schick mir mal einen Repo-Check".

## Trigger

- User postet GitHub-URL mit Bitte um Analyse / Check / Bewertung
- User sagt "repo durchchecken", "Repo analysieren", "Was ist mit X?"
- User ruft explizit: `repo-analyst <url> [--context "<hint>"]`

## Input-Parameter

| Parameter | Pflicht? | Zweck |
|---|---|---|
| `url` oder `path` | ja | GitHub-URL (`https://github.com/owner/repo`) oder lokaler Pfad |
| `context` | nein | Optionaler Kontext-Hint: "für Kundenprojekt", "Privat-Setup", "Edge-Computing", etc. — beeinflusst Bewertungs-Gewichtung |
| `compare_to_setup` | nein (default: ja) | Soll das aktuelle Marcus-Setup (aus MEMORY.md + known repos) als Vergleichsbaseline genutzt werden? |

## Workflow (6 Phasen)

### Phase 1 — Recon (~30s)
Sammelt Repository-Metadaten:
- `gh repo view owner/repo --json name,description,stargazerCount,forkCount,licenseInfo,createdAt,pushedAt,primaryLanguage,languages,repositoryTopics,defaultBranchRef`
- Alternativ für lokale Pfade: `git log` + `find` + Datei-Stats
- Erfasst: Stars/Forks, Alter, letzte Aktivität, primäre Sprache, Lizenz, Topics

### Phase 2 — README + Docs (~30s)
- `web_fetch` auf README (max 15K chars)
- Falls Docs-Site vorhanden (erkennbar an Links im README): `web_fetch` auf Docs-Landing
- Extrahiert: Zweck, Installation, Modi, Algorithmen, Integrations-Liste, Benchmarks

### Phase 3 — Code-Struktur (~1-2 min)
Nur wenn `compare_to_setup=yes` und der User das aktuelle Setup kennen soll:
- `git clone --depth=1` in `/tmp/<repo>-check/`
- `ls -la`, `find . -type d -name '<spezifisch>'`
- Schlüsselfiles lesen: `pyproject.toml` / `package.json` / `Cargo.toml`, Docker-Setup, Plugin-/Integration-Code, `LICENSE`
- Falls Repo zu groß (>5K Files): nur Top-Level-Struktur + pyproject/manifest + Plugins/Integrations-Code

### Phase 4 — Bewertung nach 5 Leitfragen
Standardisierter Markdown-Report mit diesen Sektionen:

#### 4.1 Steckbrief
Tabelle: Zweck, Modi, Stack, Lizenz, Stars, Letzte Aktivität, OpenClaw-Integration?

#### 4.2 5 Leitfragen
1. **Nützlich für unser Setup?** → Ja / Teilweise / Nein + Begründung
2. **Wenn nur Teile nützlich: welche?** → P1/P2/P3-Tabelle mit "Warum für uns"
3. **Was muss umgebaut/eingebaut werden?** → Konkrete Setup-Schritte (Code-Blöcke), Aufwand-Schätzung
4. **Erst sinnvoll mit eigener Hardware?** → Ja/Nein + Begründung + Synergie-Hinweis
5. **Kosten?** → Tabelle: Lizenz, Hosting, Einmalig, Laufend, Einsparungen, Versteckte Risiken

#### 4.3 Empfehlung
- Konkrete Schritt-für-Schritt-Liste (Quick-Win-Reihenfolge)
- **Offene Fragen** an den User, die für den Quick-Test nötig sind (Blocker für nächste Phase)

### Phase 5 — Vergleich mit aktuellem Setup (optional, default: an)
Wenn `compare_to_setup=yes`:
- Lade relevante Abschnitte aus MEMORY.md (laufende Projekte, Hardware-Stack, Tool-Stack, Resilience-Architektur)
- Markiere konkret, wo das analysierte Repo eingreift:
  - Nutzt es vorhandene Tools / Standards (MCP, Kubernetes, Docker)?
  - Ersetzt oder ergänzt es bestehende Komponenten?
  - Konflikte mit aktuellen Architektur-Entscheidungen?

### Phase 6 — Output
Format: Markdown-Report direkt im Chat (für Telegram: keine Tabellen, nur Bullet-Listen — siehe Messaging-Format-Regel)

Output-Blocks:
1. 📦 Repo-Check: `<owner/repo>` (Header)
2. Steckbrief (Tabelle oder Bullet-Liste)
3. Bewertung (5 Leitfragen)
4. 🎯 Empfehlung
5. Offene Fragen

## Memory-Aktualisierung

Nach Abschluss: Wenn das Repo als "nützlich" oder "zu beobachten" eingestuft wird, schreibe einen kurzen Eintrag in `memory/<YYYY-MM-DD>.md` mit:
- Repo-Name + URL
- Bewertung (1-2 Sätze)
- Empfohlene nächste Schritte
- Verweis auf diesen Report (Pfad oder Chat-Referenz)

Falls dauerhaft relevant: zusätzlich kurzen Eintrag in MEMORY.md unter "Tools / Libraries" oder passender Sektion.

## Tool-Nutzung

| Phase | Tools |
|---|---|
| 1. Recon | `exec` (gh CLI) oder `web_fetch` |
| 2. README | `web_fetch` |
| 3. Code-Struktur | `exec` (git clone, ls, find, cat) |
| 4. Bewertung | LLM-Reasoning (kein Tool) |
| 5. Setup-Vergleich | `memory_get` (gezielt, ggf. `memory_search` falls Index aktiv) |
| 6. Output | direkter Chat-Output |

## Format-Hinweise für Telegram

- Keine Markdown-Tabellen → Bullet-Listen mit Spalten als Sub-Punkten
- Code-Blöcke bleiben (monospace, gut lesbar in Telegram)
- Header mit Emoji (📦, 🎯) — passt zum Telegram-Vibe
- Links als nackte URLs, in `<>` wrappen um Embeds zu unterdrücken
- Maximal 4000 Zeichen pro Message, ggf. aufteilen

## Beispiel-Output (gekürzt)

```
📦 Repo-Check: chopratejas/headroom

Steckbrief:
• Zweck: Context-Optimization für LLM-Apps
• Modi: Library / Proxy / MCP / Agent-Wrapper
• Lizenz: Apache 2.0
• Status: 35.888 ⭐, pushed gestern
• OpenClaw-Integration: ✅ nativ (ContextEngine plugin)

1. Nützlich? → Ja
   - Token-Savings 60-95% auf Cloud-Calls
   - OpenClaw-Plugin existiert
   - CCR reversibel passt zu Privacy-Architektur

2. Welche Teile?
   - P1: headroom proxy + Plugin (zero-code-change)
   - P2: SmartCrusher (JSON)
   - P3: Cross-agent memory
   [...]

🎯 Empfehlung:
1. Quick-Test (Docker + headroom perf)
2. OpenClaw-Plugin installieren
3. Cross-Agent-Memory aktivieren

Offene Fragen:
• Aktuelle Cloud-LLM-Kosten/Monat?
• Rook + Phoenix auf derselben OpenClaw-Instanz?
```

## Notes

- Skill ist **read-only** in Phase 1-3 — nichts wird installiert/geclont außer in `/tmp/`
- Phase 3-Repo-Clone wird nach Analyse wieder aufgeräumt (`rm -rf /tmp/<repo>-check/`)
- Falls Repo privat ist und kein lokaler Pfad: User nach Credentials fragen
- Performance-Budget: 2-5 Min pro Analyse, hard cap 10 Min
- Bei sehr großen Repos (>50K Files): Phase 3 auf pyproject/manifest + Plugins/Top-Level beschränken
