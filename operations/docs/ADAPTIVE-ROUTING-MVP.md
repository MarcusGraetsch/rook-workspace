# Adaptive Routing MVP

Status: advisory + dispatch shadow + availability + outcome correlation
Date: 2026-08-14

## Ziel

Die Routing-Schicht soll den bestehenden Arbeitsstil nicht verändern:

- Telegram bleibt der normale Einstieg über Rook/OpenClaw und Phoenix/Hermes.
- SSH + Codex/Claude Code bleibt der bewusste Expertenmodus für komplexe Entwicklung.
- Bereits bezahlte Abos/Quota werden vor zusätzlichen Pay-as-you-go-API-Kosten genutzt.
- Explizite Modellwahl hat immer Vorrang.

Der MVP entscheidet und beobachtet **nur**. Er startet keine neuen Backend-Typen automatisch, überschreibt keine Agent-Zuweisung und ändert keine Live-Modellkonfiguration.

## Warum kein LiteLLM/OpenRouter/LangChain im MVP?

Diese Werkzeuge können später sinnvoll sein, insbesondere für API-Gateway, Provider-Fallbacks und Pay-as-you-go-Modelle. Der aktuelle Hauptnutzen kommt aber aus bereits vorhandenen subscription-basierten CLI-/OpenClaw-Zugängen. Eine neue API-zentrierte Schicht würde zusätzliche Komplexität und potenziell zusätzliche Kosten einführen, bevor die Routing-Entscheidungen selbst validiert sind.

## Komponenten

- `operations/config/adaptive-routing-policy.json`
  - Backends und Fähigkeiten
  - subscription-first Policy
  - Task-Präferenzen
  - Workflow-Templates
  - explizite Trennung zwischen OpenClaw-ausführbaren Backends und manuellen CLI-Backends
- `operations/bin/adaptive-router.mjs`
  - heuristische Task-Klassifikation
  - Risiko/Komplexität/Qualität/Latenz
  - explizite Modellwahl
  - Budget-Hinweise aus natürlicher Sprache
  - Backend-Scoring
  - Availability-aware Ranking
  - getrennte Ausgabe von fachlicher Empfehlung und autonomem Dispatcher-Kandidaten
  - Advisory-Ausgabe und JSONL-Logging
- `operations/bin/routing-availability.mjs`
  - liest `model-mode-state.json` für Kimi/MiniMax
  - markiert Kimi während aktivem Fallback als degraded
  - erkennt Codex/Claude read-only über ausführbare CLI-Dateien im `PATH`
  - führt keine Testprompts aus und verbraucht keine Modell-Quota
  - meldet pro Backend `status`, `available`, `dispatcher_executable`, `interaction`, Quelle und Grund
- `operations/bin/dispatcher/routing-shadow.mjs`
  - baut aus canonical Tasks einen Routing-Kontext
  - liest Availability vor dem Shadow-Routing
  - protokolliert vor realen Dispatches Empfehlung, Dispatcher-Kandidat und Availability
  - verändert Task, Agent, Modell und Dispatch nicht
  - kann mit `ROOK_ADAPTIVE_ROUTING_SHADOW=0` deaktiviert werden
- `operations/bin/routing-report.mjs`
  - aggregiert fachliche Empfehlungen und autonome Dispatcher-Kandidaten getrennt
  - zeigt Availability-Status und benötigte manuelle Handoffs
  - unterstützt `--days N` und `--json`
- `operations/bin/routing-outcomes.mjs`
  - korreliert Shadow-Entscheidungen über `task_id` mit canonical/archive Tasks und Runtime-Overlays
  - liest tatsächliches `dispatch.model`, Executor, Attempts, Ergebnis und Status
  - normalisiert aktuelle Modelle auf Kimi, MiniMax, Claude und Codex
  - berechnet Erfolg/Failure/Pending sowie Empfehlung-vs.-Ist
- `operations/tests/adaptive-router.test.mjs`
  - Tests für Klassifikation, Routing, Kostenpolicy, Availability, Shadow Logging, Reporting und Outcome-Korrelation

## Drei getrennte Fragen

Der Router unterscheidet jetzt bewusst:

1. **Welches Backend wäre für die Aufgabe fachlich am besten?**
2. **Welches Backend ist gerade verfügbar?**
3. **Welches verfügbare Backend kann der aktuelle OpenClaw-Dispatcher autonom starten?**

Beispiel:

```text
Fachliche Empfehlung: Codex CLI
Availability: available
Dispatcher-ausführbar: nein
Autonomer Dispatcher-Kandidat: Kimi Code
Manueller Handoff: ja
```

Wenn Kimi wegen Quota/Rate-Limit im bestehenden `model-mode-controller` auf Fallback steht:

```text
Fachliche Empfehlung: Codex CLI
Kimi: degraded
MiniMax: available
Autonomer Dispatcher-Kandidat: MiniMax
```

Der Router verändert dabei den bestehenden `model-mode-controller` nicht.

## Abgrenzung zum model-mode-controller

`model-mode-controller.mjs` bleibt für Kimi/MiniMax Availability-/Quota-Fallback zuständig.

Der Adaptive Router beantwortet dagegen:

> Welcher Backend-/Workflow-Typ passt zur Aufgabe, welcher ist verfügbar, und welcher davon ist mit der aktuellen Ausführungsarchitektur automatisch nutzbar?

## CLI-Beispiele

Availability prüfen:

```bash
node operations/bin/routing-availability.mjs
node operations/bin/routing-availability.mjs --json
```

Einzelne Aufgabe beraten lassen:

```bash
node operations/bin/adaptive-router.mjs --no-log \
  "Implementiere eine kleine Funktion im Repo und schreibe Tests"
```

Availability für Debugging ignorieren:

```bash
node operations/bin/adaptive-router.mjs --no-availability --no-log \
  "Implementiere eine kleine Funktion im Repo und schreibe Tests"
```

JSON-Ausgabe:

```bash
node operations/bin/adaptive-router.mjs --json --no-log \
  "Entwirf eine komplexe Zielarchitektur und prüfe sie gründlich"
```

Shadow-Beobachtungen ansehen:

```bash
node operations/bin/routing-report.mjs
node operations/bin/routing-report.mjs --days 7
node operations/bin/routing-report.mjs --days 30 --json
```

Outcome-Korrelation ansehen:

```bash
node operations/bin/routing-outcomes.mjs
node operations/bin/routing-outcomes.mjs --details
node operations/bin/routing-outcomes.mjs --json --details
```

Default-Log:

```text
/root/.openclaw/runtime/operations/routing-decisions.jsonl
```

## Rollout-Stufen

### Phase 1 — Advisory + Shadow

- Dispatcher beobachtet Routing-Entscheidungen fail-open.
- Keine Empfehlung verändert den echten Dispatch.
- Fehlklassifikationen werden mit realen Tasks gesammelt.

### Phase 2 — Outcome-Korrelation

`routing-outcomes.mjs` verbindet Routing-Beobachtungen mit realen Dispatcher-/Task-Ergebnissen. Dafür werden bestehende canonical/archive Tasks und Runtime-Task-State verwendet; es wird noch keine neue Datenbank benötigt.

### Phase 2a — Availability-aware Advisory/Shadow

Aktuell umgesetzt:

- Kimi/MiniMax Runtime-State aus `model-mode-state.json`
- Codex/Claude Installation über read-only `PATH`-Probe
- fachliche Empfehlung getrennt vom autonomen Dispatcher-Kandidaten
- Kimi wird bei aktivem Fallback nicht automatisch empfohlen
- Codex/Claude können empfohlen werden, erzwingen aber derzeit einen manuellen CLI-/SSH-Handoff

Bewusste Grenze: CLI-Installation bedeutet noch nicht verifizierte Authentifizierung. Der Availability-Status enthält deshalb für Codex/Claude `auth: unknown`.

### Phase 3 — Controlled Executor Integration

Erst nach realen Shadow-Daten wird entschieden, ob und wie Codex/Claude als echte Dispatcher-Executors eingebunden werden. Bis dahin bleiben sie manuelle Expertenpfade.

### Phase 4 — Controlled Auto-Routing

Nur für klar abgegrenzte, risikoarme Task-Klassen darf die Empfehlung die Executor-/Modellwahl automatisch beeinflussen. High-risk, produktive oder strategische Aufgaben behalten Review-/Human-Gates.

### Phase 5 — Externe Model-Daten

Erst dann externe Benchmark-/Preis-Feeds oder API-Gateways anbinden. Kandidaten wären LiteLLM/OpenRouter oder eine kleine eigene Feed-Schicht. Die Routing-Policy bleibt dabei unsere eigene.

## Sicherheitsregeln

- Keine Secrets in Policy oder Routing-Logs.
- Kein Pay-as-you-go ohne explizite Policy/Freigabe.
- Produktive/high-risk Tasks benötigen Verifikation bzw. unabhängigen Review.
- Manuelle Modellwahl überschreibt Routing.
- Shadow-/Advisory-Modus bleibt der Default, bis reale Daten die Automatisierung rechtfertigen.
- Shadow-Fehler dürfen den echten Dispatcher nicht blockieren.
- Availability-Probes führen keine Modell-Prompts aus.
- Reporting-/Outcome-Tools arbeiten read-only auf bestehenden Logs und Task-Dateien.
