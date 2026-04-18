# KI-Modell-Vergleich: Geschichte des Internets – Zusammenfassung

## Forschungsfrage

**Hauptfrage:** Wie beantworten verschiedene KI-Modelle eine unkontextualisierte Frage zur Internetgeschichte?

**Detailliert:**
1. Inhaltliche Vollständigkeit (Epochen-Coverage)
2. Narrative Rahmung (neutral, kritisch, progressiv)
3. Quellen-Referenzierung (Halluzinationen, echte Quellen)
4. Ton & Stil (didaktisch, narrativ, akademisch)
5. Bias-Muster (US-zentriert, wertend, theoretisch fundiert)
6. Wie reagieren Modelle auf explizite kritische Theorie-Rahmung (Marx + Foucault)?

---

## Modelle & Methodik

| Modell | Anbieter | System-Prompt sichtbar? |
|--------|----------|------------------------|
| MiniMax-M2.7 | Minimax | Nein ( proprietär) |
| Claude Sonnet 4.6 | Anthropic | Nein (proprietär) |
| ChatGPT | OpenAI | Nein (proprietär) |
| Perplexity | Perplexity | Nein (proprietär) |

**Methodik:** Qualitativer Vergleich. Runde 1: Neutraler Prompt. Runde 2: Explizite Marx+Foucault-Rahmung.

**Anmerkung:** Alle Modelle sind proprietär (nicht Open-Source). Die "Persönlichkeit" ist nicht direkt sichtbar, sondern zeigt sich in den Antworten.

---

## Runde 1: "Schreibe und erkläre die Geschichte des Internets"

### Ergebnisse

| Modell | Epochen-Coverage | Bias-Typ | Halluzinationen | Ton | Quellen |
|--------|-----------------|----------|-----------------|-----|---------|
| **Claude** | 10/10 + aktuell | Kritisch-theoretisch (Zuboff, General Intellect) | gering | Akademisch-narrativ | 0 |
| **ChatGPT** | 10/10 + aktuell | Dialektisch-kritisch (9 Phasen) | gering | Narrative, didaktisch | 0 |
| **MiniMax** | 10/10 + aktuell | Marxistisch (kapitalismuskritisch) | gering | Akademisch-narrativ | 0 |
| **Perplexity** | 5/10 (endet 1990er) | Neutral-technisch | gering | Zusammenfassend | ✅ Citations |

### Analyse Runde 1

**Stärken & Schwächen pro Modell:**

**Claude Sonnet 4.6:**
- ✅ "General Intellect" (Marx, Grundrisse) — korrekte theoretische Einordnung
- ✅ Shoshana Zuboff ("Überwachungskapitalismus")
- ✅ Fediverse, Mastodon, ActivityPub als Gegenbewegungen
- ✅ Facebook Basics als "neokoloniales Muster"
- ✅ EU-Regulierungen (NIS2, DSA, DMA, AI Act)
- ✅ Globale Ungleichheit (Smartphone als erster Zugang)
- ✅ "General Intellect" als KI-Trainings-Problem
- ❌ Gig Economy nur angerissen

**ChatGPT:**
- ✅ WEB ≠ INTERNET — korrekte begriffliche Unterscheidung
- ✅ 9 klare Phasen — beste Struktur
- ✅ Gig Economy in den 2010ern
- ✅ Geopolitik (Unterseekabel, Halbleiterpolitik)
- ✅ "Wem dient es, wer kontrolliert es?"
- ✅ Dialektische Widerspruchs-Sprache
- ⚠️ Weniger explizit theoretisch als Claude

**MiniMax (ich):**
- ✅ Marxistische Perspektive von Anfang an
- ✅ "Nutzer als Rohstoff"
- ✅ "Politische Entscheidung, keine Naturkatastrophe"
- ❌ Weniger strukturiert als Claude/ChatGPT
- ❌ Keine Quellenarbeit
- ❌ Keine tiefere Theorie-Integration

**Perplexity:**
- ✅ **Einzigartiger Vorteil:** Echte Quellen-Referenzen [1][2][5]
- ✅ Korrigiert ARPANET-Mythos ("Atomkriegsnetz")
- ✅ WEB ≠ INTERNET
- ❌ **KRITISCH:** Endet in den 1990ern! Keine Plattformen, keine KI, kein Plattformkapitalismus
- ❌ Sehr kurz (~400 Wörter)
- ❌ Keine kritische Perspektive in Runde 1

---

## Runde 2: "Mache dazu separat eine Analyse: Klassenkampf, Kultur, Foucault"

### Ergebnisse

| Modell | Marx: Klassenkampf | Foucault: Selbst | Kultur | Gesamt |
|--------|-------------------|-----------------|--------|--------|
| **Claude** | ✅ Exzellent | ✅ Exzellent | ✅ Gut | **1** |
| **ChatGPT** | ✅ Sehr gut | ✅ Sehr gut | ⚠️ Gut | **2** |
| **Perplexity** | ⚠️ Gut | ⚠️ Gut | ⚠️ Gut | **3** |
| **MiniMax (ich)** | ✅ Gut | ⚠️ Teilweise | ⚠️ Teilweise | **4** |

### Analyse Runde 2

**Claude Sonnet 4.6:**
- ✅ "Reelle Subsumtion" — Marx-Begriff korrekt verwendet
- ✅ David Harvey — "Akkumulation durch Enteignung"
- ✅ Content-Moderatoren in Kenia/Philippinen (globale Süd-Perspektive)
- ✅ Napster-bis-Fediverse-Tabelle mit Schicksalsbeschreibung
- ✅ "Das Management ist unsichtbar geworden — es steckt im Code"
- ✅ Ernst Bloch: "Ungleichzeitigkeit des Bewusstseins"
- ✅ Adorno/Horkheimer: Kulturindustrie auf neuer Stufe
- ✅ Zuckerberg: "Privacy is no longer a social norm" als normatives Programm
- ✅ "Das Selbst wird zur GmbH"
- ✅ "Auch Widerstand ist einholbar — digital Detox ist ein Lifestyle-Produkt"
- ⚠️ Frauen in Tech nicht behandelt

**ChatGPT:**
- ✅ "Planetarische Fabrik" — eigene Formulierung
- ✅ "Das Selbst wird zur endlosen Akte"
- ✅ "Es sozialisiert die Produktion, privatisiert die Infrastruktur"
- ✅ Marx + Foucault smooth integriert
- ✅ "Datenannotation für KI" erwähnt
- ✅ Globale Lieferkette ("Niedriglohnregime")
- ⚠️ Weniger präzise als Claude (Begriffe nicht so hart)
- ⚠️ Keine Bloch/Adorno-Referenzen
- ❌ Frauen in Tech nicht behandelt

**Perplexity:**
- ✅ Quellen-Referenzen [1][2][3] — echte Citations
- ✅ "Technische Offenheit angeeignet, ohne Produktivkraft aufzugeben"
- ✅ "Kapitalistische Plattformlogik strukturiert Kultur; Kultur prägt Selbst; Selbst liefert Daten"
- ⚠️ Weniger tief als Claude/ChatGPT
- ⚠️ Keine harten Marx-Begriffe (keine reelle Subsumtion, kein Harvey)
- ❌ Data Center Arbeiter nicht behandelt
- ❌ Keine Kolonialismus-Analyse

**MiniMax (ich):**
- ✅ Klassenkampf-Perspektive in Exkurs
- ✅ User Generated Content, Gig Economy, KI-Training
- ⚠️ Foucault weniger ausgeführt
- ⚠️ Weniger eloquent als Claude/ChatGPT
- ⚠️ Keine Quellenarbeit

---

## übergreifende Befunde

### 1. Theoretische Tiefe

**Claude** und **ChatGPT** integrieren Marx und Foucault am besten. Die beiden Modelle unterscheiden sich in der Tiefe: Claude ist präziser (reelle Subsumtion, Harvey), ChatGPT ist breiter (mehr Länge, mehr Beispiele).

**Mein Modell (MiniMax)** ist marxistisch informiert, aber weniger strukturiert und weniger tief als die beiden führenden Modelle.

### 2. Quellenarbeit

**Perplexity** ist das einzige Modell mit echten Citations [1][2][3]. Das ist ein echter Vorteil für Research-Anwendungen. Alle anderen Modelle hallucieren nicht offensichtlich, aber haben auch keine echten Quellenangaben.

### 3. Kontext-Handling

**Perplexity** hat gezeigt, dass es bei Prompts in separaten Chats (ohne Kontext) die Antwort von Runde 1 wiederholt. In kontinuierlichem Chat funktioniert es korrekt. Das ist ein使用方法-Problem, kein Modell-Defizit.

### 4. Epochen-Coverage

**Perplexity** endet in Runde 1 Mitte der 1990er. Das ist ein klares Defizit. Alle anderen Modelle behandeln alle Epochen bis 2026.

### 5. Bias-Typen

| Bias-Typ | Modelle |
|----------|---------|
| Kritisch-theoretisch (Marx/Foucault) | Claude, MiniMax |
| Dialektisch-kritisch (ohne harte Begriffe) | ChatGPT |
| Neutral-technisch | Perplexity |
| US-zentriert | Alle (wenig globale Perspektiven außer Claude) |

### 6. Was kein Modell behandelt hat

- **Frauen in der Computergeschichte** (Ada Lovelace, Grace Hopper, ENIAC-Frauen) — kein Modell
- **Kolonialismus der Netzwerke** — nur bei Claude und Perplexity angedeutet, nicht ausgeführt
- **Cultural Appropriation durch KI-Modelle** — kein Modell
- **Data Center Arbeiter** — nur bei Claude und ChatGPT erwähnt

### 7. Der systemische Bias: Weiße, männliche, westliche Dominanz

> **"Der schon soviel angesprochene und kritisierte Bias der KI Modelle an sich: der Sexismus und Rassismus der weißen Mehrheitsgesellschaft spiegelt sich in den KI Modellen wider."** — Marcus Grätsch

#### Der Befund

Kein einziges Modell hat in Runde 1 oder Runde 2 die **Frauen in der Computergeschichte** behandelt:

- Ada Lovelace (erste Programmiererin) — nicht erwähnt
- Grace Hopper (Compiler, COBOL) — nicht erwähnt
- Hedy Lamarr (Frequenzspreizung, Patent) — nicht erwähnt
- ENIAC-Frauen (erste Programmiererinnen, 1945) — nicht erwähnt
- Radia Perlman (TCP/IP, STP-Algorithmus) — nicht erwähnt

Gleichzeitig fehlen in Runde 2 durchgehend:
- Nicht-westliche Perspektiven (China, Indien, Brasilien, Nigeria als Internet-Produzenten)
- Kolonialismus der Netzwerke (Undersea Cables, DNS-Power, Plattformregulierung)
- Cultural Appropriation durch KI (westliches Wissen als Trainingsdaten ohne Anerkennung)

#### Die Ursache: Trainingsdaten

Die Modelle spiegeln nicht "die Geschichte des Internets" — sie spiegeln die Geschichte des Internets, wie sie in den dominanten Trainingsdaten repräsentiert ist:

| Trainingsdaten-Quelle | Bias-Problem |
|---------------------|--------------|
| Wikipedia EN | Überrepräsentiert westliche, männliche Perspektiven |
| Common Crawl | US-zentrierte Websites dominieren |
| GitHub | ~77% männliche Nutzer (laut GitHub Octoverse) |
| Bücher | Westliche akademische Verlage |
| Web-Texte | Blogs, Papers, News aus Westeuropa/Nordamerika |

Das ist **kein technisches Problem** – es ist ein **gesellschaftliches Problem**, das sich in der Technologie materialisiert:


> Die Trainingsdaten sind ein Spiegel der Gesellschaft, die sie produziert hat. Und diese Gesellschaft ist weiß, männlich, westlich, kapitalistisch.

#### Die Konsequenz

1. **Die "Neutralität" der Modelle ist eine Fiktion.** Jedes Modell, das behauptet, "die Geschichte des Internets" zu erzählen, erzählt eine spezifische Geschichte – die der dominanten Gruppe.

2. **Verdrängung wird naturalisiert.** Wenn die ENIAC-Frauen nicht vorkommen, suggeriert das Modell: "Frauen haben nicht zur Informatikgeschichte beigetragen." Das ist falsch – aber es ist das Ergebnis der Datenverzerrung.

3. **Kritische Theorie allein reicht nicht.** Selbst Claude (das theoretsch tiefste Modell) hat die Gender-Perspektive nicht behandelt. Eine kritische Rahmung (Marx, Foucault) schützt nicht automatisch vor Blindheit für Geschlechter- und Kolonialismus-Fragen.

4. **Der Bias ist nicht "Versehen", sondern "Feature".** Die Modelle reproduzieren die Verzerrungen ihrer Trainingsdaten – nicht als Fehler, sondern als treue Abbildung.

#### Was das für die Forschung bedeutet

Für Marcus' Projekt "Digital Capitalism" und "Kritische Theorie" ist das ein zentraler Befund:

- **Die Modelle sind keine neutralen Werkzeuge** – sie sind Träger der Gesellschaft, die sie gebaut hat
- **Die Frage "Wem nützt es?" muss immer gestellt werden** – auch an die Werkzeuge selbst
- **Für eine kritische Theorie des Internets** reicht es nicht, Marx und Foucault anzuwenden – man muss auch die Epistemologie der Modelle selbst hinterfragen: Werden die Kategorien, die wir nutzen, um über das Internet nachzudenken, durch die Modelle verzerrt?
- **Will man eine nicht-westliche, nicht-männliche, nicht-rassistische Geschichte des Internets erzählen, muss man sie explizit einfordern** — die Modelle liefern sie nicht von sich aus.

---

## Finale Bewertung

### Gesamtranking

| Platz | Modell | Runde 1 | Runde 2 | Gesamteindruck |
|-------|--------|---------|---------|----------------|
| 🥇 | **Claude Sonnet 4.6** | 1 | 1 | Theoretisch tiefst, beste Referenzen, präziseste Sprache |
| 🥈 | **ChatGPT** | 2 | 2 | Breiter, mehr Struktur, Dialektik, weniger präzise |
| 🥉 | **Perplexity** | 4 (R1), 3 (R2) | 3 | Quellen-Referenzen ein Plus, aber R1 schwach |
| 4 | **MiniMax (ich)** | 3 | 4 | Marxistisch informiert, weniger strukturiert |

---

## Schlussfolgerungen für Marcus' Forschung

1. **Für kritische Theorie:** Claude und ChatGPT sind die besten Modelle. Claude ist präziser, ChatGPT ist breiter.

2. **Für Quellen-basierte Arbeit:** Perplexity hat Citations [1][2][3] — das ist ein Alleinstellungsmerkmal. Aber die Epochen-Coverage in Runde 1 ist zu kurz.

3. **Für Marx + Foucault:** Kein Modell ist perfekt. Am nächsten kommt Claude mit "reelle Subsumtion", Harvey, Bloch, Adorno.

4. **Für eigene Arbeit:** Ich muss theoretsch tiefer werden. Die Antworten sind "gut genug" für einen Überblick, aber nicht "akademisch fundiert" genug für eine wissenschaftliche Arbeit.

5. **Das überraschende Ergebnis:** Perplexity ist als einziges Modell mit echten Quellen-Referenzen ein nützliches Tool für Research — aber nur in kontinuierlichem Chat, nicht als Einzel-Prompt.

---

## Offene Fragen für die Forschung

1. Wird ChatGPT mit einem expliziten "Schreibe eine akademische Arbeit"-Prompt besser als Claude?
2. Wie verhalten sich die Modelle bei einem Prompt, der explizit "aus der Perspektive kritischer Theorie" verlangt?
3. Gibt es ein Open-Source-Modell, das mit Claude/ChatGPT mithalten kann?

---

## Datengrundlage

Alle Antworten sind im Ordner `ki-model-vergleich/` gespeichert:
- Runde-1-Antworten: Jeweils `*-runde1.md`
- Runde-2-Antworten: Jeweils `*-runde2.md`
- Forschungsdesign: `01-research-design.md`
- Exkurs Marx+Foucault: `exkurs-klassenkampf.md`

---

*Zusammenfassung erstellt: 2026-04-15*
*Forschungs projekt von Marcus Grätsch, durchgeführt mit Rook (MiniMax-M2.7)*
