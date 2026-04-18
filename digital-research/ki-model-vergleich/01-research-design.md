# Research Design: KI-Modell-Vergleich

## Thema
**"Schreibe und erkläre die Geschichte des Internets"** – Vergleichende Analyse von KI-Modellen

## Forschungsfrage
Wie beantworten verschiedene KI-Modelle eine unkontextualisierte Frage zur Internetgeschichte in Bezug auf:
- Inhaltliche Vollständigkeit
- Narrative Rahmung
- Quellen-Referenzierung
- Ton & Stil
- Bias-Muster
- KI-spezifische Analyse

## Modelle

| Modell | Anbieter | Version |
|--------|----------|---------|
| MiniMax-M2.7 | Minimax | aktuell (mein Modell) |
| Claude | Anthropic | aktuell |
| ChatGPT | OpenAI | aktuell |
| Perplexity | Perplexity | aktuell |

## Identischer Prompt (Runde 1)

```
Schreibe und erkläre die Geschichte des Internets
```

Bewusst: Kein Zusatzkontext, keine Zielgruppe, keine Sprachvorgabe. Das Modell soll zeigen, was es *von sich aus* strukturell und perspektivisch mitliefert.

## Identischer Prompt (Runde 2)

```
Mache dazu separat eine Analyse:
1. der Geschichte des Klassenkampfs im Internet (marxistische Perspektive: Wer arbeitet, wer profitiert?)
2. der kulturellen Veränderungen (Wer wird sichtbar/unsichtbar gemacht? Welche Stimmen fehlen?)
3. der Veränderung des Selbst im Foucaultschen Sinne (Subjektivierung, Selbstoptimierung, Überwachung, Identität im Netz)
```

**Begründung:** Nach dem ersten, unkontextualisierten Prompt geben wir jedem Modell eine explizit kritische Aufgabe. Wir testen:1. Erkennt das Modell die klassepplorischen und kulturellen Dimensionen von sich aus?
2. Wie reagiert es, wenn wir eine spezifische theoretische Rahmung vorgeben (Marx, Foucault)?
3. Wird es einfacher oder detaillierter?

## Forschungsdesign: Zwei-Runden-Modell

| Runde | Prompt | Ziel |
|------|--------|------|
| 1 | "Schreibe und erkläre die Geschichte des Internets" | Was liefert das Modell ohne Rahmung? |
| 2 | Klassenkampf, Kultur, Selbst (Marx + Foucault) | Wie reagiert es auf explizite Theorie-Rahmung? |

**Erwartung:**
- Runde 1: Die meisten Modelle antworten neutral-technisch
- Runde 2: Die meisten Modelle können es "abspulen", aber unterschiedlich tief
- Interessant: Welches Modell integriert die Perspektiven schon in Runde 1?

## Evaluations-Achsen

### 1. Inhaltliche Vollständigkeit (Checkliste)

| Epoche | Behandlung (ja/nein/teilweise) | Anmerkung |
|-------|-------------------------------|-----------|
| ARPANET (1969) | | |
| TCP/IP (1974) | | |
| NSFNET/DNS (1983) | | |
| WWW (Berners-Lee, 1989) | | |
| Mosaic Browser (1993) | | |
| Dotcom-Blase (2000/01) | | |
| Social Web (ab 2004) | | |
| Cloud Computing (ab 2010) | | |
| Platform Capitalism | | |
| KI/GPT-Ära (ab 2022) | | |

### 2. Narrative Rahmung

- [ ] Fortschritts-Narrativ (linear, gut, Alternativen)
- [ ] Bedrohungs-Narrativ (Kontrolle, Überwachung, Verfall)
- [ ] Neutral-technisch (Protokolle, Protokolle, Protokolle)
- [ ] Marxistische/kritische Perspektive (explizit oder implizit)
- [ ] Marke/Eigentum benannt (Google, Facebook etc. als Akteure)

### 3. Quellen-Referenzierung

- [ ] Explizite Quellenangaben (Fußnoten, Links)
- [ ] Implizite Referenzen ("laut Studie...", "es wird gesagt...")
- [ ] Halluzinationen (falsche Daten, erfundene Zitate, Jahreszahlen)
- [ ] Returned: "Ich habe keine externen Quellen"

### 4. Ton & Stil

- [ ] Didaktisch (1-2-3, für Anfänger)
- [ ] Narrative (wie eine Geschichte erzählt)
- [ ] Technisch-akademisch (Fachbegriffe ohne Erklärung)
- [ ] Trocken-Enzyklopädisch
- [ ] Persönlich (Ich-Perspektive, Meinungen)

### 5. Sprachstil

- Sprache: DE / EN / gemischt
- Komplexität: einfach / mittel / komplex
- Sprachwechsel mitten drin?

### 6. KI-spezifische Analyse

- [ ] GPT-Ära/KI-Ära ab 2022 erwähnt?
- [ ] Aktuelle Entwicklungen (2025/2026)?
- [ ] Wie wird das eigene Modell eingeordnet?

### 7. Bias-Muster

- [ ] US-zentriert (keine globalen Kontexte, z.B. China, Indien)
- [ ] Privatisierung als Problem benannt?
- [ ] Wer sind die zentralen Akteure? (Nutzer, Unternehmen, Staaten, Protokolle)
- [ ] Wertungsfrei oder wertend?

## Forschungsfragen-Vertiefung (Optional)

1. **Sprach-Effekt:** Gleicher Prompt auf Englisch → Unterschied?
2. **Kontext-Effekt:** Gleicher Prompt mit Zielgruppe ("für Nicht-Techniker") → Passt das Modell an?
3. **Iteration:** Zweiter Prompt mit Korrektur ("jetzt mit kritischer Perspektive") → Veränderung?

## Dokumentation der Modell-Antworten

Pro Modell ein eigenes Dokument:
- `modell-minimax.md`
- `modell-claude.md`
- `modell-chatgpt.md`
- `modell-perplexity.md`

Darin: Rohe Antwort + Auswertung.

## Output-Vergleich (Zusammenfassung)

### Runde 1

| Modell | Epochen-Coverage | Bias-Typ | Halluzinationen | Ton | Quellen |
|--------|-----------------|----------|-----------------|-----|---------|
| MiniMax | 10/10 | Kritisch-Theorie | gering | Akademisch-Narrativ | 0 |
| Claude | | | | | |
| ChatGPT | | | | | |
| Perplexity | | | | | |

### Runde 2

| Modell | Marx: Klassenkampf | Marx: Arbeiter Unsichtbar | Foucault: Subjektivierung | Foucault: Überwachung | Integration |
|--------|------------------|-------------------------|--------------------------|---------------------|------------|
| MiniMax | | | | | |
| Claude | | | | | |
| ChatGPT | | | | | |
| Perplexity | | | | | |

---

## Achsen für Runde 2 (Marx + Foucault)

### Marx-Analyse: Klassenkampf im Internet

| Dimension | Behandlung (ja/nein/teilweise) | Anmerkung |
|---------|-------------------------------|-----------|
| User Generated Content als unbezahlte Arbeit | | |
| Data Center Arbeiter (physische Basis Cloud) | | |
| Gig Economy (Scheinselbstständigkeit) | | |
| KI-Training als Data Extraction | | |
| Enclosure der digital commons | | |
| Kapitalkonzentration (Monopole) | | |

### Kulturelle Dimension

| Dimension | Behandlung (ja/nein/teilweise) | Anmerkung |
|---------|-------------------------------|-----------|
| Frauen in der Computergeschichte | | |
| Nicht-westliche Perspektiven (Globaler Süden) | | |
| Kolonialismus der Netzwerke | | |
| Cultural Appropriation durch KI | | |
| Wer wird sichtbar/unsichtbar gemacht? | | |

### Foucault-Analyse: Veränderung des Selbst

| Dimension | Behandlung (ja/nein/teilweise) | Anmerkung |
|---------|-------------------------------|-----------|
| Subjektivierung (Identitätskonstruktion im Netz) | | |
| Selbstoptimierung (Quantified Self, Biofeedback) | | |
| Überwachung (Panopticon, Social Scoring) | | |
| Disziplinarmacht (Plattformen als Kontrollinstanzen) | | |
| Bio-Macht (Daten als Lebensführung) | | |
| Widerstand (aktive Formung von Identität) | | |

---

## Methodische Anmerkung

Dies ist ein **qualitativer, interpretativer Vergleich**. Die Kriterien sind nicht objektiv messbar, sondern erfordern Einschätzung. Daher:

- Jedes Modell wird **blind** bewertet (ohne Wissen, welches Modell die Antwort gegeben hat)
- Zwei-Durchgänge: erst rohe Einschätzung, dann comparative Gesamtbild
- Marcus als einziger Interpret ( субективектив? Ja – aber mit klarem Framework)

---

*Erstellt: 2026-04-15*
