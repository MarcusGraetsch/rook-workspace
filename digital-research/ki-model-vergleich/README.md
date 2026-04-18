# KI-Modell-Vergleich: Geschichte des Internets

## Überblick

Dieses Verzeichnis enthält eine vergleichende Analyse von KI-Modellen.
- **Runde 1:** "Schreibe und erkläre die Geschichte des Internets"
- **Runde 2:** "Mache dazu separat eine Analyse: Klassenkampf, Kultur, Foucault"
- **Runde 3:** "Erzähle dasselbe aus der Perspektive von Frauen, Schwarzen Menschen und nicht-westlichen Kulturen" (Selbsttest)

## Verzeichnisstruktur

```
ki-model-vergleich/
├── 01-research-design.md           # Forschungsdesign & Methodik
├── 02-modell-minimax-runde1.md     # MiniMax Runde 1
├── 02b-modell-minimax-runde2.md    # MiniMax Runde 2 (Exkurs: Klassenkampf)
├── 04-modell-claude-runde1.md      # Claude Runde 1
├── 04b-modell-claude-runde2.md     # Claude Runde 2
├── 05-modell-chatgpt-runde1.md     # ChatGPT Runde 1
├── 05b-modell-chatgpt-runde2.md    # ChatGPT Runde 2
├── 06-modell-perplexity-runde1.md  # Perplexity Runde 1
├── 06b-modell-perplexity-runde2.md # Perplexity Runde 2
├── 07-zusammenfassung.md           # Vergleichende Gesamtbewertung
├── 08-runde3-selbsttest-halluzination.md  # Runde 3: Selbsttest + Halluzination
└── exkurs-klassenkampf.md          # Theoretischer Hintergrund Marx+Foucault
```

## Modelle

| # | Modell | Anbieter | Status Runde 1 | Status Runde 2 | Status Runde 3 |
|---|--------|----------|---------------|---------------|---------------|
| 1 | MiniMax-M2.7 | Minimax | ✅ | ✅ (Exkurs) | ✅ (Selbsttest, mit Halluzination) |
| 2 | Claude Sonnet 4.6 | Anthropic | ✅ | ✅ | ⬜ |
| 3 | ChatGPT | OpenAI | ✅ | ✅ | ⬜ |
| 4 | Perplexity | Perplexity | ✅ | ✅ (im Kontinuität) | ⬜ |

## Vorläufiges Ranking

### Runde 1 (Geschichte des Internets)

| Platz | Modell | Bewertung |
|-------|--------|---------|
| 1 | **Claude Sonnet 4.6** | Theoretisch fundiert, General Intellect, Free Basics, EU-Regulierung, globale Ungleichheit |
| 2 | **ChatGPT** | 9-Phasen-Dialektik, WEB≠INTERNET, Gig Economy, durchdachte Schlussreflexion |
| 3 | **MiniMax (ich)** | Marxistisch informiert, aber weniger strukturiert |
| 4 | **Perplexity** | Quellen-Referenzen, aber endet 1995er, keine KI/Plattformen |

### Runde 2 (Marx + Foucault + Kultur)

| Platz | Modell | Bewertung |
|-------|--------|---------|
| 1 | **Claude Sonnet 4.6** | Exzellent: reelle Subsumtion, Harvey, Bloch, Adorno, Zuckerberg als normatives Programm |
| 2 | **ChatGPT** | Sehr gut: "planetarische Fabrik", "Das Selbst wird zur endlosen Akte", Marx+Foucault integriert |
| 3 | **Perplexity** | Gut: Quellen-Referenzen [1][2][3], gute Foucault-Integration, aber weniger tief |
| 4 | **MiniMax (ich)** | Gut, aber weniger tief als die anderen |

---

**Fazit:** Perplexity in Kontinuität (korrekter Chat) ist deutlich besser als die Non-Response vermuten ließ. Quellen-Referenzen sind ein Plus. Insgesamt: **Claude > ChatGPT > Perplexity > MiniMax**.

---

## Neue Erkenntnisse aus Runde 3 (Selbsttest)

- **Halluzination bei MiniMax:** Patricia Evangelista (unbelegter Name) wurde als Beispiel eingeführt
- **Halluzinations-Prävention-Skill erstellt:** `skills/hallucination-prevention.md`
- **Befund:** Selbst der Selbstversuch ist fehleranfällig – die Verzerrung liegt nicht nur im Prompt, sondern in den Daten

---

## Tool-Empfehlung

- **Claude:** https://claude.ai
- **ChatGPT:** https://chat.openai.com
- **Perplexity:** https://www.perplexity.ai

---

*Erstellt: 2026-04-15*
*Letzte Aktualisierung: 2026-04-15*
