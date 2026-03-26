---
title: "Digital Capitalism Research: Ein kollektives Forschungsprojekt"
date: 2026-03-14
tags: ["forschung", "digital-capitalism", "platform-studies", "ki", "arbeit", "kollektiv", "methodologie"]
author: "marcus+rook"
process_log: "./digital-capitalism-research.process.md"
---

## Was ist das Digital Capitalism Research Projekt?

Seit Anfang 2026 betreiben wir ein kontinuierliches Forschungsprojekt zum Thema **Digital Capitalism / Platform Studies / Future of Work**. Das Projekt ist eine Experimentierfeld für eine neue Art der akademischen Forschung: Mensch und Maschine arbeiten zusammen, nicht nacheinander.

Die zentrale Fragestellung lautet: **Wie transformiert die Plattformökonomie (Uber, Amazon, Gig-Economy-Apps) die Arbeitswelt?** Dabei geht es uns nicht nur um abstrakte Theorie, sondern um konkrete Phänomene: Arbeitskämpfe bei Amazon, die Uberisierung ganzer Branchen, KI-basierte Überwachung am Arbeitsplatz, und die ökologischen Kosten der Digitalisierung.

## Die Methodik: Kontinuierliche statt projekthafte Forschung

Traditionelle Forschung arbeitet projekthaft: Man beantragt Fördermittel, forscht zwei Jahre, publiziert. Wir machen das anders: **kontinuierliche Forschung**.

Jeden Tag laufen automatisierte Prozesse:

- **Newsletter-Monitoring**: ~20 Newsletter zu Tech, Arbeit, KI werden gescannt
- **Content-Extraktion**: Artikel werden aus Emails extrahiert, bereinigt, kategorisiert
- **Wissensgraph**: Eine Ontologie verknüpft Artikel, Konzepte und Forschungsfragen
- **Wöchentliches Briefing**: Jeden Sonntag ein automatischer Report mit Neuigkeiten

Das Ergebnis: Eine wachsende Datenbank mit aktuell **1.104 Artikeln**, systematisch erschlossen und vernetzt.

## Die Technische Infrastruktur

Das Projekt läuft auf einer virtuellen Maschine in der Cloud. Die Architektur ist modular und open-source:

### 1. Die Pipeline

**Input**: Newsletter aus drei dedizierten Gmail-Accounts
- `bigtech-digest@`: Big Tech, Überwachung, Regulation
- `newworkculture@`: Gewerkschaften, Gig Economy, Arbeitsrecht  
- `ai-general@`: KI-Forschung, Kritische Theorie, Global South

**Verarbeitung**:
- `scan_v5.py`: Extrahiert Links aus Emails, scraped Artikel
- `clean_smart.py`: Entfernt Navigation/Werbung, erkennt Paywalls
- `label_articles.py`: Kategorisiert mit Tags (KI, Arbeitswelt, Big Tech...)

**Output**: Bereinigte Artikel in SQLite-Datenbank + Markdown-Dateien

### 2. Die Ontologie

Nur speichern reicht nicht. Wir bauen einen **Knowledge Graph**:

- **12 Konzepte**: Platform Capitalism, Surveillance Capitalism, Gig Economy, Data Extractivism, Green Colonialism...
- **7 Research Tasks**: Konkrete Kapitel/Ziele mit Deadlines
- **8.332+ Verknüpfungen**: Artikel diskutieren Konzepte, Tasks decken Konzepte ab, Artikel sind thematisch verknüpft

Das ermöglicht Anfragen wie: *"Zeige mir alle Artikel über KI + Arbeitswelt, die mit Task X verknüpft sind"*

### 3. Das Dashboard

Ein interaktives HTML-Dashboard visualisiert den Graphen mit D3.js:
- Knoten: Artikel (blau), Konzepte (rot), Tasks (grün)
- Kanten: Diskutiert, deckt ab, ist verwandt mit
- Filter: Zeige nur Konzepte, nur Artikel, etc.

### 4. Automatisierte Briefings

Jeden Sonntag um 8:00 Uhr:
- Scan aller Newsletter
- Generierung eines Briefings mit:
  - Diese Woche gesammelt: X neue Artikel
  - Task-Fortschritt: Y neue Artikel für Task Z
  - Lücken-Analyse: Welche Themen fehlen?
  - Lesetipp der Woche: Bester neuer Artikel
- Versand per Telegram

## Die menschliche Seite

All diese Automatisierung wäre wertlos ohne menschliche Entscheidungen. Das Projekt lebt von der Intervention:

**Marcus** (Human):
- Entscheidet, welche Newsletter abonniert werden
- Definiert Research Tasks und Prioritäten
- Liest, analysiert, schreibt
- Trifft inhaltliche Auswahlentscheidungen

**Rook** (AI):
- Baut und wartet die technische Infrastruktur
- Schreibt Code für neue Features
- Generiert Zusammenfassungen und strukturiert Daten
- Schlägt Verknüpfungen vor, die der Mensch übersehen könnte

Die Arbeitsteilung ist nicht: Mensch denkt, Maschine arbeitet. Sondern: Beide denken, beide arbeiten – auf unterschiedliche Weise.

## Aktuelle Forschungsfragen

Das Projekt verfolgt mehrere parallele Spuren:

### 1. Plattformökonomie und Arbeit
Wie verändern Algorithmen bei Uber, Lieferando, Amazon Flex die Arbeitsrealität? Was bedeutet "Flexibilität" für die Prekarisierung? Wie organisieren sich Gig-Worker?

### 2. Überwachungskapitalismus
Shoshana Zuboffs Konzept der "Surveillance Capitalism" als Ausgangspunkt: Wie extrahieren Plattformen Verhaltensdaten als Rohstoff? Wie beeinflusst das Demokratie und Autonomie?

### 3. KI und die Zukunft der Arbeit
Automatisierung, Algorithmic Management, KI-gestützte Hiring-Entscheidungen. Wer profitiert, wer verliert? Wie verändert sich das Skill-Profil von Arbeitnehmer:innen?

### 4. Umwelt und Digitalisierung *(neu seit März 2026)*
Die ökologischen Kosten waren lange unterrepräsentiert. Seit neuestem tracken wir auch:
- Energy Consumption von Data Centern
- Critical Minerals (Lithium, Kobalt) für Hardware
- E-Waste und Green Colonialism
- Environmental Justice im Tech-Kontext

### 5. Globaler Süden
Plattformkapitalismus ist nicht nur ein westliches Phänomen. Wie sieht es aus in Indien, Brasilien, Afrika? Wer moderiert den Content, den wir konsumieren? Wo werden die Rohstoffe abgebaut?

## Ergebnisse und Zwischenstände

**Quantitativ** (Stand März 2026):
- 1.104 Artikel gesammelt und bereinigt
- ~20 Newsletter aktiv abonniert
- 7 Research Tasks definiert
- 6 Kerntheorien/Konzepte kartiert
- 8.332+ Verknüpfungen im Graphen

**Qualitativ**:
- Kontinuierliche Aktualität statt veralteter Literatur
- Systematische Erschließung (keine zufällige Sammlung)
- Transparente Provenienz (jeder Artikel mit Quelle)
- Vernetztes Wissen statt isolierter Fakten

## Öffentliche Einsehbarkeit

Das gesamte Projekt ist öffentlich dokumentiert:

- **GitHub-Repository**: github.com/MarcusGraetsch/digital-capitalism-research
- **Dashboard**: Interaktive Visualisierung des Forschungsgraphen
- **Weekly Briefings**: Automatisch generierte Zusammenfassungen
- **Ontologie**: Vollständiger Knowledge Graph als JSON-LD

Wir glauben an **public research**: Nicht erst das fertige Buch, sondern der gesamte Prozess ist öffentlich. Das macht Fehler sichtbar, ermöglicht Kollaboration, und unterläuft die Tendenz zur akademischen Einschließung.

## Was kommt als Nächstes?

Die nächsten Schritte sind sowohl technisch als auch inhaltlich:

**Inhaltlich**:
- Vertiefung der Umwelt-Dimension (neuer Fokus seit März 2026)
- Fallstudien zu konkreten Arbeitskämpfen (Amazon Labor Union, etc.)
- Vergleich EU-Regulation (DMA, DSA) mit US-Praxis

**Technisch**:
- Integration von LLM-basierten Analyse-Features
- Verbesserung der Ontologie durch automatische Konzept-Extraktion
- Öffentliches API für die Forschungsdaten

**Publizistisch**:
- Dieser Artikel ist der erste einer Serie, die das Projekt vorstellt
- Geplante Artikel zu spezifischen Sub-Themen (Gig Economy, KI-Regulation, etc.)
- Eventuell: Podcast-Format mit Interviews aus der Community

## Ein Experiment in öffentlicher Wissenschaft

Das Digital Capitalism Research Projekt ist ein Experiment. Es testet:

1. **Kann kontinuierliche Forschung funktionieren?** Statt projekthaft: immer weiter.
2. **Was leistet Human-AI-Kollaboration?** Nicht Ersatz, sondern Erweiterung.
3. **Ist transparente Forschung praktikabel?** Alles öffentlich, nicht nur Ergebnisse.
4. **Wie verbindet man Aktivismus und Akademie?** Theorie mit politischem Bezug.

Wir wissen nicht, ob es funktioniert. Aber wir wissen, dass die alternative – isolierter Autor, hinter Paywalls, ohne technische Infrastruktur – nicht mehr zeitgemäß ist.

**Wenn du mitlesen, mitdenken oder mitarbeiten willst**: Das GitHub-Repo ist öffentlich. Die Weekly Briefings kann man (theoretisch) abonnieren. Und Feedback ist jederzeit willkommen – per Mail, Mastodon, oder Telegram.

---

*Dieser Artikel wurde gemeinsam verfasst von Marcus (Human) und Rook (AI). Die Arbeitsteilung: Marcus hat die inhaltliche Vision und Auswahlentscheidungen getroffen, Rook hat die technische Infrastruktur gebaut und den Text strukturiert. Der Prozess ist dokumentiert in der Datei `digital-capitalism-research.process.md`.*

*Lizenz: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)*
