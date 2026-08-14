# Adaptive Routing MVP

Status: advisory + dispatch shadow mode
Date: 2026-08-14

## Ziel

Die Routing-Schicht soll Marcus' bestehenden Arbeitsstil nicht verändern:

- Telegram bleibt der normale Einstieg über Rook/OpenClaw und Phoenix/Hermes.
- SSH + Codex/Claude Code bleibt der bewusste Expertenmodus für komplexe Entwicklung.
- Bereits bezahlte Abos/Quota werden vor zusätzlichen Pay-as-you-go-API-Kosten genutzt.
- Explizite Modellwahl durch Marcus hat immer Vorrang.

Der MVP entscheidet und beobachtet **nur**. Er startet keine Modelle, überschreibt keine Agent-Zuweisung und ändert keine Live-Modellkonfiguration.

## Warum kein LiteLLM/OpenRouter/LangChain im MVP?

Diese Werkzeuge können später sinnvoll sein, insbesondere für API-Gateway, Provider-Fallbacks und Pay-as-you-go-Modelle. Der aktuelle Hauptnutzen kommt aber aus bereits vorhandenen subscription-basierten CLI-/OpenClaw-Zugängen. Eine neue API-zentrierte Schicht würde zusätzliche Komplexität und potenziell zusätzliche Kosten einführen, bevor die Routing-Entscheidungen selbst validiert sind.

## Komponenten

- `operations/config/adaptive-routing-policy.json`
  - Backends und Fähigkeiten
  - subscription-first Policy
  - Task-Präferenzen
  - Workflow-Templates
- `operations/bin/adaptive-router.mjs`
  - heuristische Task-Klassifikation
  - Risiko/Komplexität/Qualität/Latenz
  - explizite Modellwahl
  - Budget-Hinweise aus natürlicher Sprache
  - Backend-Scoring
  - Advisory-Ausgabe
  - JSONL-Logging für spätere Evaluation
- `operations/bin/dispatcher/routing-shadow.mjs`
  - baut aus canonical Tasks einen Routing-Kontext
  - protokolliert vor realen Dispatches die Empfehlung
  - verändert Task, Agent, Modell und Dispatch nicht
  - kann mit `ROOK_ADAPTIVE_ROUTING_SHADOW=0` deaktiviert werden
- `operations/bin/routing-report.mjs`
  - aggregiert Shadow-Beobachtungen nach Backend, Task-Typ, Workflow, Reviewer und aktuellem Agent
  - unterstützt `--days N` und `--json`
- `operations/tests/adaptive-router.test.mjs`
  - Tests für Klassifikation, Routing, Kostenpolicy, Shadow Logging und Reporting

## Abgrenzung zum bestehenden model-mode-controller

`model-mode-controller.mjs` bleibt für Availability-/Quota-Fallback zuständig (z. B. Kimi → MiniMax bei Limits).

Der Adaptive Router beantwortet eine andere Frage:

> Welcher Backend-/Workflow-Typ passt zu dieser Aufgabe?

Später muss die Empfehlung zusätzlich den aktuellen Availability-State des model-mode-controller berücksichtigen.

## CLI-Beispiele

Einzelne Aufgabe beraten lassen:

```bash
node operations/bin/adaptive-router.mjs --no-log \
  "Implementiere eine kleine Funktion im Repo und schreibe Tests"
```

JSON-Ausgabe:

```bash
node operations/bin/adaptive-router.mjs --json --no-log \
  "Entwirf eine komplexe Zielarchitektur und prüfe sie gründlich"
```

Zusatzkosten explizit erlauben:

```bash
node operations/bin/adaptive-router.mjs --json --no-log \
  "Recherchiere das gründlich. Zusätzliche Kosten erlaubt, Budget 2,50 Euro"
```

Explizite Modellwahl:

```bash
node operations/bin/adaptive-router.mjs --json --no-log \
  "Bitte nutze Claude und reviewe die Architektur"
```

Shadow-Beobachtungen ansehen:

```bash
node operations/bin/routing-report.mjs
node operations/bin/routing-report.mjs --days 7
node operations/bin/routing-report.mjs --days 30 --json
```

Default-Log:

```text
/root/.openclaw/runtime/operations/routing-decisions.jsonl
```

## Aktueller Rollout

### Phase 1 — Advisory + Shadow

1. Dependency-freie Tests laufen in GitHub Actions.
2. Der Dispatcher ruft den Router vor echten Dispatches im Shadow Mode auf.
3. Entscheidungen werden nur protokolliert.
4. Fehlklassifikationen werden über reale Marcus-Aufträge gesammelt.
5. Mit `routing-report.mjs` wird die Verteilung regelmäßig ausgewertet.

Der Shadow-Hook ist absichtlich **fail-open**: Ein Router- oder Logging-Fehler wird im Dispatcher-Log als `adaptive_routing_shadow_failed` festgehalten, der echte Dispatch läuft trotzdem weiter.

Dry-runs erzeugen keine Shadow-Beobachtung.

### Phase 2 — Outcome-Korrelation

Routing-Beobachtungen werden über `task_id` mit realen Dispatcher-/Task-Ergebnissen verbunden:

- tatsächlich verwendeter Executor/Backend
- erfolgreich / fehlgeschlagen
- Retry/Eskalation
- Dauer
- Review-/Test-Ergebnis
- menschlich akzeptiert / nachgebessert, soweit erfassbar

Erst danach lässt sich sinnvoll bewerten, ob die Empfehlung besser oder schlechter als die bisherige Zuweisung war.

### Phase 3 — Availability + Quota

Routing-Engine liest zusätzlich:

- `model-mode-state.json`
- installierte/angemeldete CLIs
- ggf. Provider-Quota/Rate-Limit-State

Nicht verfügbare Backends werden aus der Kandidatenliste entfernt.

### Phase 4 — Controlled Auto-Routing

Nur für klar abgegrenzte, risikoarme Task-Klassen darf die Empfehlung die Executor-/Modellwahl automatisch beeinflussen. High-risk, produktive oder strategische Aufgaben behalten Review-/Human-Gates.

### Phase 5 — Externe Model-Daten

Erst dann externe Benchmark-/Preis-Feeds oder API-Gateways anbinden. Kandidaten wären LiteLLM/OpenRouter oder eine kleine eigene Feed-Schicht. Die Routing-Policy bleibt dabei unsere eigene.

## Sicherheitsregeln

- Keine Secrets in Policy oder Routing-Logs.
- Kein Pay-as-you-go ohne explizite Policy/Freigabe.
- Produktive/high-risk Tasks benötigen Verifikation bzw. unabhängigen Review.
- Manuelle Modellwahl durch Marcus überschreibt Routing.
- Shadow-/Advisory-Modus bleibt der Default, bis reale Daten die Automatisierung rechtfertigen.
- Shadow-Fehler dürfen den echten Dispatcher nicht blockieren.
