# Adaptive Routing MVP

Status: advisory-only MVP
Date: 2026-08-14

## Ziel

Die Routing-Schicht soll Marcus' bestehenden Arbeitsstil nicht verändern:

- Telegram bleibt der normale Einstieg über Rook/OpenClaw und Phoenix/Hermes.
- SSH + Codex/Claude Code bleibt der bewusste Expertenmodus für komplexe Entwicklung.
- Bereits bezahlte Abos/Quota werden vor zusätzlichen Pay-as-you-go-API-Kosten genutzt.
- Explizite Modellwahl durch Marcus hat immer Vorrang.

Der MVP entscheidet **nur**. Er startet keine Modelle und ändert keine Live-Konfiguration.

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
- `operations/tests/adaptive-router.test.mjs`
  - Basistests für Coding, Architektur, Operations, explizite Modellwahl und Zusatzkosten

## Abgrenzung zum bestehenden model-mode-controller

`model-mode-controller.mjs` bleibt für Availability-/Quota-Fallback zuständig (z. B. Kimi → MiniMax bei Limits).

Der Adaptive Router beantwortet eine andere Frage:

> Welcher Backend-/Workflow-Typ passt zu dieser Aufgabe?

Später muss die Empfehlung zusätzlich den aktuellen Availability-State des model-mode-controller berücksichtigen.

## CLI-Beispiele

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

## Geplanter Rollout

### Phase 1 — Advisory

1. Tests auf der VM ausführen.
2. 20–50 echte Marcus-Aufträge manuell durch den Router laufen lassen.
3. Falschklassifikationen sammeln.
4. Policy und Heuristiken korrigieren.

### Phase 2 — Rook Integration

Rook/Orchestrator ruft den Router vor einem echten Dispatch auf. Die Entscheidung wird im Task/Log gespeichert. Rook nennt kurz Backend + Workflow + Begründung.

Kein automatischer Providerwechsel ohne vorhandene Executor-Unterstützung.

### Phase 3 — Availability + Quota

Routing-Engine liest zusätzlich:

- `model-mode-state.json`
- installierte/angemeldete CLIs
- ggf. Provider-Quota/Rate-Limit-State

Nicht verfügbare Backends werden aus der Kandidatenliste entfernt.

### Phase 4 — Experience Feedback

Für ausgeführte Tasks werden Outcome-Daten ergänzt:

- erfolgreich / fehlgeschlagen
- Retry/Eskalation
- menschlich akzeptiert / nachgebessert
- Laufzeit
- verwendetes Backend/Modell
- Kosten soweit messbar

Die eigene Historie wird stärker gewichtet als allgemeine Benchmark-Rankings.

### Phase 5 — Externe Model-Daten

Erst dann externe Benchmark-/Preis-Feeds oder API-Gateways anbinden. Kandidaten wären LiteLLM/OpenRouter oder eine kleine eigene Feed-Schicht. Die Routing-Policy bleibt dabei unsere eigene.

## Sicherheitsregeln

- Keine Secrets in Policy oder Routing-Logs.
- Kein Pay-as-you-go ohne explizite Policy/Freigabe.
- Produktive/high-risk Tasks benötigen Verifikation bzw. unabhängigen Review.
- Manuelle Modellwahl durch Marcus überschreibt Routing.
- Advisory-Modus bleibt der Default, bis reale Daten die Automatisierung rechtfertigen.
