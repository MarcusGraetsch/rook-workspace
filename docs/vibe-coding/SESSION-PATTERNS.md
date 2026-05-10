# Vibe Coding Session Patterns

> Ergänzung zu `docs/vibe-coding/GUIDE.md`. So arbeitest du effektiv mit mehreren Agents.
> Stand: 2026-05-10

---

## Die drei Kern-Muster

### Muster 1: Rook als Supervisor, Claude/Codex als Executor

**Wann:** Komplexe Features, Architektur-Entscheidungen, Security-relevante Änderungen.

**Flow:**
```
1. Du → Rook: "Implementiere Feature X in repo Y"
2. Rook:
   - Liest Repo-Kontext (CLAUDE.md, aktuelle Commits)
   - Prüft Git-Status, offene TODOs
   - Erstellt Plan mit Constraints + Off-Limits
   - Spawnt Claude/Codex-ACP mit Kontext
3. Claude/Codex (ACP):
   - /plan zeigt lassen
   - Implementiert
   - Diff zeigt
4. Rook:
   - Review des Diff (Checks: Security, Style, Tests)
   - Feedback geben
   - Commit + Push
5. Rook → du: Zusammenfassung + was als nächstes
```

**Warum:** Rook hat den Überblick über alle Repos, MEMORY.md, Wiki. Claude/Codex hat die IDE-Integration und kann direkt Dateien ändern.

### Muster 2: Rook für Ops, Claude für Code

**Wann:** Infrastruktur-Änderungen (Kubernetes, Ansible, Shell-Scripts).

**Flow:**
```
Rook (Kontext + Plan):
  - Liest aktuelle Config, versteht Abhängigkeiten
  - Erstellt Plan: Welche Files, welche Risks
  - Definiert Off-Limits (z.B. Production-Secrets)

Claude (Implementierung):
  - Hat den Plan + Constraints
  - Ändert direkt im Repo
  - Zeigt Diff
  - Führt Tests/Lint aus

Rook (Validation):
  - Review des Diff
  - Security-Check (Secrets? Hardcoded Values?)
  - Commit, wenn OK
```

### Muster 3: Schnelle Session (Rook allein)

**Wann:** Quick Fixes, Recherchen, kleine Scripts, Documentation.

**Flow:**
```
Du → Rook: "Schreib ein Script, das X macht"
Rook:
  - Prüft ob es bereits ähnliches gibt (Wiki, memory)
  - Implementiert direkt
  - Zeigt Ergebnis
  - Review + Commit
```

---

## Context-Transfer zwischen Agents

**Problem:** Wenn du von Rook zu Claude Code wechselst, gehen Infos verloren.

**Lösung: Expliziter Context-Bundle beim Spawn**

```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "claude",
  attachments: [
    { name: "context-bundle.md", content: rookSessionSummary }
  ],
  task: "Implementiere Feature X. Siehe context-bundle.md für Details."
})
```

**Context-Bundle enthält:**
- Was ist das Ziel?
- Was wurde bereits versucht?
- Was darf NICHT angerührt werden?
- Wo ist die Beispiel-Datei für Stil?
- Aktueller Git-Status (kurz)

**Für Claude Code (terminal):**
```
/project switch repo-name
/project read CLAUDE.md
/context load von meiner Zusammenfassung
```

---

## Throwaway vs. Keep: Die wichtigste Entscheidung

**Vor jeder Session: Wird das ein Wegwerf-Prototyp oder was Langfristiges?**

| Kriterium | Throwaway | Keep |
|-----------|-----------|------|
| Lebensdauer | Wochenend-Spass, Proof-of-Concept | Monate+, Production |
| Quality-Gate | Nur "funktioniert" | Typecheck + Lint + Tests |
| Review-Tiefe | Schneller Check | Voller PR-Review |
| Docs | Keine oder Minimal | Vollständig |
| Naming | Egal | Konsistent |
| Security | Später | Von Anfang an |
| Commit-Messages | "wip" | Conventional Commits |
| Tech-Debt | Erlaubt | Vermeiden |

### Schnelle Entscheidung

Frag dich: **Wirst du in 3 Monaten noch an diesem Code arbeiten?**

- **Ja** → Investiere in Quality, Tests, Docs, Security.
- **Nein** → Mach es schnell, check nur "funktioniert", wirf es nicht weg aber pflege es auch nicht übermäßig.

### Deine Projekte eingeschätzt

| Repo | Typ | Vibe-Coding-Modus |
|------|-----|-------------------|
| rook-workspace | Langfristig (Ops, Docs) | **Keep** — Quality matters, aber pragmatisch |
| rook-k8s-lab | Langfristig + Security | **Keep** — Immer Security-First, nie blind |
| working-notes | Langfristig | **Keep** — TypeScript strict, sauberer Code |
| digital-capitalism-research | Mittelfristig | **Keep-ish** — Akademie, Fakten zählen |
| idp-customer-onboarding | Langfristig, Kunde | **Keep** — Production-Quality, Doku |
| critical-theory-digital | Langfristig, Buch | **Keep** — Keine Halluzinationen, Zitation |

**Merke:** Fast alles was du baust, ist Keep. Also: Quality-Gates immer.

---

## Token-Ökonomie: Wann welches Modell?

**Deine aktuelle Config:**
- Default: `kimi/moonshot-k2-6` (Kimi K2.5)
- Fallbacks: `minimax/MiniMax-M2.7`, `anthropic/claude-sonnet-4-6`

**Kosten-Bewusstsein:**

| Modell | Kosten | Nutzen | Wann nutzen |
|--------|--------|--------|-------------|
| **Kimi K2.5** | Mittel | Gut für Code, Ops | Normale Sessions, Ops, Docs |
| **MiniMax M2.7** | Niedrig | OK für einfache Tasks | Quick Fixes, wenn Kimi limitiert |
| **Claude Sonnet** | Mittel-Hoch | Stark bei Code, Testing | Komplexe Refactoring, Security-Review |
| **Codex (GPT-5)** | Hoch | Sehr stark für Coding | Architektur, komplexe Features |

### Praktische Regel

1. **Routine-Aufgaben** (Doku, Ops-Scripts, Quick Fixes): Kimi
2. **Komplexe Features** (Architektur, Refactoring): Claude oder Codex
3. **Security-kritische Änderungen**: Immer Claude (besseres Reasoning)
4. **Wenn Kimi limitiert**: MiniMax als Fallback, nicht Codex (spart Kosten)

### Token-Sparen bei Prompts

**Kurz:** Definiere Ziel + Constraints + Off-Limits → weniger Nachfragen → weniger Tokens.

**Beispiel:**
```
# Schlechter Prompt (vague, braucht viele Rückfragen)
"Füge Error Handling hinzu"

# Guter Prompt (scoped, braucht keine Rückfragen)
"Füge Error Handling zur API-Route /api/tasks hinzu.
Nutze das Pattern aus src/lib/api/errors.ts.
Erwartete Errors: 400 (bad input), 401 (unauthorized), 404 (not found).
Wirf keine generischen Exceptions.
Füge Tests hinzu in src/lib/api/__tests__/tasks.test.ts"
```

---

## Error Recovery: Wenn Vibe Coding schief geht

### Problem 1: AI generiert Unsinn (Halluzination)

**Symptome:**
- Code kompiliert nicht, aber AI behauptet es wäre korrekt
- Falsche API-Signaturen
- Nicht-existierende Dependencies

**Was tun:**
```
1. NIE blind akzeptieren
2. /rewind (Claude) oder History zurücksetzen
3. Erneut prompten mit:
   "Das ist falsch. Hier ist das korrekte Pattern: [Beispiel]
   Versuche es nochmal."
4. Wenn wieder falsch: Selbst schreiben oder anderes Tool
```

**Prävention:**
- Beispiel-Datei immer referenzieren
- Erst Plan zeigen lassen
- Nach jeder Implementierung: `npm run build` / `python -m py_compile`

### Problem 2: Build ist kaputt

**Symptome:**
- `npm run build` fails
- TypeScript Errors
- Import Errors

**Was tun:**
```
1. Sofort stoppen, nicht weiter implementieren
2. Error analysieren (ist es ein Halluzination-Bug oder echter Error?)
3. /rewind zum letzten funktionierenden State
4. Neu: Kleinere Schritte, nach jedem Schritt bauen
```

### Problem 3: Versehentlich Off-Limits geändert

**Symptome:**
- `git diff` zeigt Änderungen an config/ oder secrets-Files
- Production-Config wurde modifiziert

**Was tun:**
```
1. SOFORT: git checkout -- <file>
2. Review: Was wurde geändert? War es kritisch?
3. Wenn ja: Security-Check machen
4. Prevent: Vor jeder Session Off-Limits explizit nennen
```

### Problem 4: Context Bleed (AI übernimmt Annahmen aus alter Session)

**Symptome:**
- AI ändert Dateien, die nicht zum aktuellen Feature gehören
- Rename/Refactor in falschem Scope

**Was tun:**
```
1. /clear (Claude) oder neue Session
2. Kontext frisch aufbauen:
   "Ich bin in repo X, Feature Y. Stand: [letzter Commit]"
3. NICHT annehmen, dass AI sich erinnert
```

---

## Die "2am Rule": Schnelle Entscheidungen ohne vollen Review

**Problem:** Du bist um 2am, es brennt, du musst schnell was fixen.

**Regel:** Bei kritischen Fixes (Security, Production-Downtime):
- Schneller Fix OK
- Doku + Alert danach
- Nächstesday Review + ggf. Refactor

**Checkliste "2am Fix":**
- [ ] Backup gemacht?
- [ ] Off-Limits nicht berührt?
- [ ] Minimaler Fix (kein Overengineering)?
- [ ] Issue/Ticket erstellt für später?
- [ ] Alert/Notification an Team?

**NIE um 2am:**
- Architektur-Änderungen
- Neue Dependencies
- Security-Änderungen (außer es brennt wirklich)
- Anything that needs a second pair of eyes

---

## Multi-Repo-Sessions: Orchestrierung bei großen Änderungen

**Wenn ein Feature mehrere Repos betrifft:**

### Beispiel: "Auth-Flow refactoren" (betrifft rook-workspace + working-notes)

```
Phase 1: Plan (Rook)
  - Identifiziere alle betroffenen Repos
  - Erstelle Abhängigkeits-Reihenfolge
  - Definiere Interfaces (wo passieren Datenübergaben?)

Phase 2: Repo A ändern (Claude)
  - Feature-Branch
  - Implementieren
  - Tests
  - Commit

Phase 3: Repo B ändern (Claude)
  - Feature-Branch
  - Anpassen an Repo A's Interfaces
  - Tests
  - Commit

Phase 4: Integration (Rook)
  - Beide PRs reviewen
  - Integration-Tests
  - Merge-Order prüfen
  - Coordinate: Welches zuerst mergen?

Phase 5: Deploy (Rook)
  - Checkliste durchgehen
  - Monitoring
  - Rollback-Plan parat
```

---

## Quality-Gates: Deine Standards

### Minimal (Throwaway)
```bash
# Nur Check "funktioniert"
npm run build || echo "BUILD FAILED"
```

### Standard (Die meisten Sessions)
```bash
# TypeScript
npm run typecheck && npm run lint && npm run test

# Python
ruff check . && pytest

# Shell
shellcheck *.sh
```

### Streng (Security, Compliance, Production)
```bash
# Alles vom Standard +
# + Security-Check
node operations/bin/check-runtime-contract.mjs
# + Backup vorher
bash operations/bin/backup-runtime-to-drive.sh
# + Compliance-Docs prüfen
```

---

## Die Vibe-Checkliste: Vor jeder Session

```
□ Ziel definiert (ein Feature/Fix pro Session)
□ Repo-Kontext geladen (CLAUDE.md)
□ Git-Status sauber (oder bewusst in Branch)
□ Off-Limits identifiziert
□ Beispiel-Datei für Stil vorhanden
□ Quality-Gate gesetzt (minimal/standard/strict)
□ Backup gemacht (bei sicherheitskritischen Änderungen)
□ Token-Budget bekannt (welches Modell?)
□ Error-Recovery-Plan klar (was wenn was schiefgeht?)
```

---

## Nächste Schritte

1. **Config-Files in echte Repos kopieren** — Die CLAUDE.md/AGENTS.md sind erstmal Templates
2. **Session-Patterns testen** — Nächste Coding-Session mit Rook + Claude-Kombination
3. **Error-Recovery-Muskel aufbauen** — Halluzinationen und Build-Fails kommen, Übung macht's besser

*Ergänzung zu: `docs/vibe-coding/GUIDE.md`*