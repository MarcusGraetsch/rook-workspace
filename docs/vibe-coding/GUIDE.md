# Vibe Coding Guide — Rook Workspace

> Für Marcus Grätsch. Maßgeschneidert auf deine Repos, deinen Stack, deine Arbeitsweise.
> Stand: 2026-05-10

## 1. Was Vibe Coding für dich bedeutet

**Definition (Karpathy):** Du beschreibst Software in natürlicher Sprache, ein LLM generiert den Code. Du bist Supervisor, nicht Tippmaschine.

**Deine Variante:** Du bist ein erfahrener Gen-X-Engineer mit 20+ Jahren Erfahrung. Du weißt, was guter Code aussieht. Vibe Coding beschleunigt deine Implementierung — es ersetzt nicht dein Urteilsvermögen.

**Goldene Regel:** Vibe Coding für Prototypen und Features. Traditionelle Praxis für Security, Compliance und Production-Hardening.

---

## 2. Tool-Matrix: Wann welches Tool?

| Aufgabe | Tool | Warum |
|---------|------|-------|
| **Recherche, Docs, Planung** | Rook (OpenClaw) | Kontext über alle Repos, Memory, Wiki-Integration |
| **Komplexe Refactoring** | Claude Code | Besseres Architekturverständnis, Plan Mode, Tests |
| **Quick Features, Prototypen** | Codex (OpenAI) | Schnell, direkt, gut für Greenfield |
| **Shell-Scripts, Ops** | Rook oder Claude | Rook hat VM-Zugriff, Claude hat bessere Shell-Intuition |
| **TypeScript/React Frontend** | Claude Code | Überlegen bei JSX, Hooks, Type-Inference |
| **Kubernetes/Infrastruktur** | Rook + Claude | Rook für VM/Ops, Claude für YAML/Helm/Terraform |
| **Markdown, Schreiben, Theorie** | Rook | Kontext über Research, Zitate, Struktur |
| **Security-kritische Änderungen** | **Nicht allein** | Immer Human-in-the-Loop, nie blind akzeptieren |

### Sessions mit Rook vs. ACP-Harness (Claude/Codex)

**Rook (diese Session):**
- Vorteil: Kontext über alle Repos, MEMORY.md, Wiki, Cron-Jobs
- Nutzen für: Orchestrierung, Recherche, Git-Management, System-Ops
- Limit: Keine direkte IDE-Integration, kein Plan Mode

**Claude Code (ACP-Harness):**
- Vorteil: Direkter Repo-Zugriff, Plan Mode, Test-Ausführung, Refactoring
- Nutzen für: Code-Generierung, Testing, Architektur-Entscheidungen
- Starten: `/acp claude` oder `sessions_spawn` mit `runtime="acp"`, `agentId="claude"`

**Codex (OpenAI):**
- Vorteil: Schnell, pragmatisch, gut für Boilerplate
- Nutzen für: Prototypen, kleine Features, Ad-hoc-Scripts
- Limit: Weniger Architektur-Tiefe als Claude

---

## 3. Der Vibe-Coding-Lifecycle für deine Repos

### Phase 1: Kontext aufbauen (mit Rook)

Vor jeder Coding-Session:
1. Rook liest `CLAUDE.md` / `AGENTS.md` des Ziel-Repos
2. Rook prüft aktuellen Git-Status, offene Branches, TODOs
3. Rook erstellt Session-Plan mit Ziel, Constraints, Off-Limits-Zonen
4. Bei komplexen Änderungen: Rook delegiert an Claude/Codex-ACP mit Kontext

### Phase 2: Planen (mit Claude/Codex)

**Immer Plan Mode nutzen (Claude):**
```
/plan
"Implementiere [Feature]. Liste alle Dateien, die du ändern wirst.
Liste Annahmen. Zeige Funktionssignaturen."
```

**Prinzip:** Nie Code generieren lassen ohne vorherigen Plan. Der Plan ist dein Vertrag mit dem AI.

### Phase 3: Implementieren

**Scoped Prompts schreiben:**
- Ziel benennen
- Constraints listen
- Sagen was NICHT angerührt werden darf
- Beispiel-Datei referenzieren (Style-Guide)

**Beispiel (gut):**
```
"Füge eine neue API-Route /api/health/detailed hinzu.

Constraints:
- Nutze das bestehende Pattern aus src/app/api/metrics/route.ts
- Keine neuen Dependencies
- Muss auth-geschützt sein (siehe middleware.ts)
- Antwortformat: JSON mit { status, checks[], timestamp }

Beispiel-Datei zum Stil: src/app/api/metrics/route.ts"
```

**Beispiel (schlecht):**
```
"Füge Health Checks hinzu."
```

### Phase 4: Review

**Regel:** Jeder Diff wird wie ein PR von einem Junior-Dev reviewt.

Checkliste pro Änderung:
- [ ] Was wurde gelöscht? (Stille Löschungen sind gefährlich)
- [ ] Neue Dependencies? (Nur wenn nötig)
- [ ] API-Änderungen? (Breaking changes?)
- [ ] Off-Limits-Dateien berührt? (z.B. Secrets, Config)
- [ ] Type-Safety? (TypeScript strict mode)
- [ ] Tests vorhanden / angepasst?

### Phase 5: Validieren

**Nach jeder Akzeptanz:**
```bash
# TypeScript-Projekte
npm run typecheck
npm run lint
npm run test

# Shell/Python-Projekte
shellcheck *.sh
python -m py_compile *.py

# Kubernetes
helm lint
kubeconform
```

---

## 4. Kontext-Management: Die Config-Files

### 4.1 CLAUDE.md (für Claude Code)

Ort: Repo-Root (`rook-workspace/CLAUDE.md`, `rook-k8s-lab/CLAUDE.md`, etc.)

**Struktur (max. 50 Zeilen, lean):**
```markdown
# [Repo-Name]

## Stack
- [Tech 1], [Tech 2]

## Build/Test
- npm run dev / npm run build / npm run test

## Konventionen
- [Naming, Style]

## Off-Limits
- [Dateien/Dirs, die nie angerührt werden]

## Beispiel-Datei
- [Pfad zu einer Model-Datei für Stil]
```

**Was rein kommt:**
- Build/Test-Kommandos
- Folder-Structure Overview
- Naming/Style-Konventionen
- Off-Limits-Dateien und -Verzeichnisse
- Testing-Framework

**Was NICHT rein kommt:**
- Bug-Kontext von letzter Woche
- Temporäre Deadlines
- Experimente, die du gleich löschst
- Lange Erklärungen von Entscheidungen

### 4.2 AGENTS.md (für Codex)

Ort: Repo-Root (`rook-k8s-lab/AGENTS.md`, etc.)

Codex nutzt `AGENTS.md` als System-Kontext. Gleiche Struktur wie `CLAUDE.md`, aber Codex-spezifisch:
- Fokus auf pragmatische Prompts
- Explizite Build-Kommandos
- Security-Regeln prominenter

### 4.3 Rook-Kontext (via MEMORY.md + Wiki)

Rook hat kein `CLAUDE.md` — er hat MEMORY.md und das Wiki. Für Sessions mit Rook:
- MEMORY.md wird automatisch geladen (Main Session)
- Wiki-Topics bei Bedarf referenzieren
- Projektspezifische Kontexte via `sessions_spawn` mit Attachments

---

## 5. Session-Struktur: So läufst du eine Session

### 5.1 Kurze Feature-Session (30-90 Min)

**Mit Rook:**
```
1. "Ich will [Feature] in [Repo]. Aktueller Stand?"
2. Rook prüft Git-Status, liest relevante Dateien
3. Rook: "Plan: 1) X ändern, 2) Y hinzufügen, 3) Testen"
4. Rook implementiert oder spawnt Claude/Codex-ACP
5. Review: Rook zeigt Diff, du prüfst
6. Commit + Push
```

**Mit Claude Code (ACP):**
```
1. cd repo && claude
2. /plan: "Feature X implementieren"
3. Plan reviewen, Fragen stellen
4. Implementieren lassen
5. Diff reviewen
6. /commit + ggf. PR
```

### 5.2 Lange Architektur-Session (2-4h)

**Pattern:**
```
1. Rook: Recherche + Planung (30 Min)
2. Claude Code: Implementierung (1-2h)
3. Rook: Review, Tests, Dokumentation (30 Min)
4. Git: Commit, Push, Merge
```

**Wichtig:** Zwischen den Phasen Context resetten (`/clear` bei Claude, neue Rook-Session).

### 5.3 Multi-Repo-Sessions

Wenn ein Feature mehrere Repos berührt:
```
1. Rook orchestriert: "Wir brauchen Änderungen in repo-A und repo-B"
2. Rook erstellt Plan mit Abhängigkeiten
3. Claude/Codex arbeitet repo für repo (separate Sessions)
4. Rook synchronisiert: Commits, Tags, Submodule-Updates
```

---

## 6. Prompt-Patterns (wiederverwendbar)

### 6.1 Feature-Implementierung
```
"Implementiere [Feature-Name].

Plan:
1. Welche Dateien werden geändert/erstellt?
2. Welche Funktionssignaturen?
3. Edge Cases?
4. Abhängigkeiten?

Constraints:
- Nutze Stil von [Beispiel-Datei]
- Keine neuen Dependencies ohne Approval
- Muss [Test/Lint/Typecheck] bestehen
- Berühre nicht: [Off-Limits-Dateien]

Liste deine Annahmen auf."
```

### 6.2 Refactoring
```
"Refactore [Modul/Datei].

Ziel: [Was soll besser werden?]

Constraints:
- Keine Änderung an externen APIs
- Tests müssen weiterhin bestehen
- Schrittweise, eine Datei nach der anderen

Vorher: Zeige mir den aktuellen Plan.
Nachher: Zeige mir den Diff vor dem Commit."
```

### 6.3 Bugfix
```
"Fixe [Bug-Beschreibung].

Reproduktion:
1. [Schritt 1]
2. [Schritt 2]

Erwartet: [Was soll passieren?]
Tatsächlich: [Was passiert stattdessen?]

Constraints:
- Minimaler Fix, keine übermäßigen Änderungen
- Regression-Test hinzufügen
- Berühre nicht andere Features"
```

### 6.4 Dokumentation
```
"Dokumentiere [Komponente/Feature].

Ziel: [Wer liest es? Was muss verstanden werden?]

Format: [Markdown/Docusaurus/Inline]

Constraints:
- Keine Halluzinationen — nur existierende Funktionalität
- Code-Beispiele müssen funktionieren
- Verlinke verwandte Docs"
```

### 6.5 Security-Review
```
"Reviewe [Datei/Modul] auf Security.

Fokus:
- Input-Validation
- Auth/AuthZ
- Secrets-Handling
- SQL-Injection / XSS / Command-Injection
- CORS-Konfiguration

Output:
- Risiko-Rating (Critical/High/Medium/Low)
- Konkrete Zeilenreferenzen
- Fix-Vorschläge"
```

---

## 7. Security-Regeln für deine Projekte

### 7.1 Absolute No-Gos (nie allein via Vibe Coding)

- **Secrets:** Keine API-Keys, Passwörter, Tokens in Code
- **Auth-Systeme:** Keycloak, OAuth, SSO — immer Human-Review
- **Netzwerk-Policies:** Kubernetes NetworkPolicies, Firewalls
- **Compliance-Docs:** BSI C5, NIS2, ISO 27001 — immer verifizieren
- **Production-Config:** Nie blind auf Prod anwenden

### 7.2 Input-Validation-Checkliste

Für jeden API-Endpunkt, den du vibe-codest:
- [ ] Alle Inputs validiert und sanitisiert
- [ ] SQL-Parameterized Queries (keine String-Concatenation)
- [ ] XSS-Schutz bei HTML-Output
- [ ] Rate-Limiting bei öffentlichen Endpunkten
- [ ] CORS restrictiv konfiguriert (kein `*`)

### 7.3 Secrets-Management

- `.env` niemals commiten
- Environment-Variables nutzen
- Kubernetes: Sealed Secrets oder External Secrets Operator
- Lokal: `direnv` oder `.envrc`, nicht `.env`

### 7.4 Repository-Sichtbarkeit

| Repo | Sichtbarkeit | Vibe-Coding-Einschränkung |
|------|-------------|---------------------------|
| rook-workspace | public | Keine Secrets, keine internen IPs |
| rook-k8s-lab | private | Security-kritische Änderungen nur mit Review |
| idp-customer-onboarding | private | Kundendaten niemals im Prompt |
| rook-agent | private | Config-Files ohne Secrets |
| digital-capitalism-research | public | Keine persönlichen Daten |
| working-notes | public | Keine internen System-Details |
| critical-theory-digital | public | Keine persönlichen Daten |

---

## 8. Quality-Gates

### 8.1 Vor jedem Commit

```bash
# TypeScript
npm run typecheck      # Keine any-Types schleichen ein
npm run lint           # Keine Style-Verstöße
npm run test           # Keine broken Tests

# Python
python -m py_compile   # Syntax-Check
ruff check             # Linting
pytest                 # Tests

# Shell
shellcheck *.sh        # Shell-Script-Safety

# Kubernetes
helm lint              # Helm-Chart-Validierung
kubeconform            # YAML-Validierung
```

### 8.2 Nach jeder Session

- [ ] CHANGELOG.md oder Commit-Message mit Kontext
- [ ] Dokumentation aktualisiert (wenn nötig)
- [ ] Tests hinzugefügt/angepasst
- [ ] Git-Status sauber (keine uncommitted Changes)
- [ ] MEMORY.md aktualisiert (wenn wichtige Erkenntnisse)

### 8.3 Wöchentliches Review

- Offene Branches prüfen
- Laufende Experiments aufräumen
- `CLAUDE.md` / `AGENTS.md` aktualisieren (veraltete Info entfernen)

---

## 9. Repo-Spezifische Guidelines

### rook-workspace (Orchestrierung, Docs, Ops)

- **Stil:** Pragmatisch, lesbar, nicht über-ingenieurt
- **Shell-Scripts:** `set -euo pipefail`, `shellcheck`-clean
- **Python:** Typ-Hints wo sinnvoll, keine over-engineering
- **Docs:** Markdown, klare Struktur, Quellen zitieren
- **Tests:** Nur wo's Sinn macht — nicht alles muss 100% Coverage haben

### rook-k8s-lab (Infrastruktur, Security)

- **Stil:** Explicite > Implicite, Defense in Depth
- **YAML:** Keine hardcoded Werte, Templates nutzen
- **Shell:** Extrem defensiv, Input-Validierung, keine `eval`
- **Security:** Jede Änderung mit Security-Linse reviewen
- **Compliance:** Änderungen in Compliance-Docs nachführen
- **Tests:** `helm test`, `conftest`, Integration-Tests

### working-notes (Website, Frontend)

- **Stil:** TypeScript strict, Tailwind-Konventionen
- **Komponenten:** Functional components, Hooks
- **API:** Typisiert, Fehler-Handling explizit
- **Performance:** Lazy loading, Code splitting
- **Tests:** Component-Tests mit React Testing Library

### digital-capitalism-research (Research, Writing)

- **Stil:** Markdown, Zotero-Integration, Quellen zitieren
- **Code:** Python für Datenanalyse, Jupyter-Notebooks
- **Struktur:** Kapitel-basiert, klarer Narrative-Flow
- **Review:** Faktencheck, keine Halluzinationen

### critical-theory-digital (Book)

- **Stil:** Markdown → LaTeX/Pandoc
- **Struktur:** Kapitel, Sektionen, Fußnoten
- **Zitate:** Korrekt formatiert, Quellen verifiziert
- **Review:** Akademischer Standard, keine Fiktion als Fakt

---

## 10. Anti-Patterns: Was du NICHT tun solltest

### 10.1 Context-Bleed

**Falsch:** Eine 4-Stunden-Session mit 10 Features.
**Richtig:** Eine Session = Ein Feature. Context resetten dazwischen.

### 10.2 Blind Acceptance

**Falsch:** Alles akzeptieren, nie reviewen.
**Richtig:** Jeder Diff = PR-Review. Auch wenn der AI "sicher" aussieht.

### 10.3 Überladene Config-Files

**Falsch:** `CLAUDE.md` mit 200 Zeilen, inklusive letzter Woche Bug-Details.
**Richtig:** Max. 50 Zeilen, nur aktuelle, relevante Info.

### 10.4 Security-Blindheit

**Falsch:** "Das ist nur ein internes Tool, Auth ist overkill."
**Richtig:** Selbst interne Tools haben Input-Validation und Auth.

### 10.5 No-Plan-Coding

**Falsch:** Direkt "Implementiere X" ohne Plan.
**Richtig:** Immer Plan zeigen lassen, reviewen, dann implementieren.

### 10.6 Dependency-Creep

**Falsch:** Für jede Kleinigkeit eine neue Dependency.
**Richtig:** "Keine neuen Dependencies ohne Approval" — in jedem Prompt.

---

## 11. Checkliste: Vor jeder Vibe-Coding-Session

- [ ] Ziel klar definiert (eine Session = ein Feature/Fix)
- [ ] Repo-Kontext geladen (`CLAUDE.md`, `AGENTS.md`, MEMORY.md)
- [ ] Git-Status sauber (oder bewusst in Branch)
- [ ] Off-Limits-Zonen identifiziert
- [ ] Plan Mode aktiviert (Claude) oder Rook-Plan erstellt
- [ ] Beispiel-Datei referenziert (für Stil)
- [ ] Constraints definiert (was nicht angerührt wird)
- [ ] Backup/Restore-Plan bekannt (falls was schiefgeht)

---

## 12. Nächste Schritte

1. **Config-Files erstellen:** Für jedes aktive Repo ein `CLAUDE.md` und/oder `AGENTS.md`
2. **Prompt-Patterns etablieren:** Deine 5 häufigsten Tasks → Templates
3. **Security-Checkliste integrieren:** In den Review-Prozess für rook-k8s-lab
4. **Session-Architektur testen:** Eine Session mit Rook + Claude ACP kombiniert
5. **Quality-Gates automatisieren:** Pre-commit hooks für TypeScript/Python/Shell

---

*Basierend auf:*
- roadmap.sh/vibe-coding/best-practices
- cloudsecurityalliance.org/secure-vibe-coding-guide
- eweek.com/vibe-coding-cheat-sheet (Konzept)
- Erfahrungen aus 8h IDP-K8s-Lab-Session (2026-04-21)

*Letzte Aktualisierung: 2026-05-10*