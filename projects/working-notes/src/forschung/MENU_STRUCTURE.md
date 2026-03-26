# Menü-Struktur: Neue Kategorie "Forschung"

## Vorgeschlagene Navigation

```
Home | Über | Arbeiten | Forschung | Manifesto
```

## Unterpunkte "Forschung"

### 1. Übersicht
**URL:** `/forschung/`  
**Titel:** "Forschung"  
**Inhalt:** 
- Kurzvorstellung des Digital Capitalism Research Projekts
- Link zum ausführlichen Artikel
- Aktuelle Statistiken (1.104 Artikel, 12 Konzepte, etc.)
- Link zum Knowledge Graph

### 2. Digital Capitalism Research (Artikel)
**URL:** `/forschung/digital-capitalism-research/`  
**Titel:** "Das Projekt"  
**Inhalt:** Der bereits geschriebene Artikel

### 3. Knowledge Graph
**URL:** `/forschung/graph/`  
**Titel:** "Knowledge Graph"  
**Inhalt:** 
- Interaktive Visualisierung (graph-minimal.html oder ontology-graph.html)
- Kurze Erklärung der Ontologie
- Legende und Bedienungsanleitung

### 4. Weekly Briefings (optional)
**URL:** `/forschung/briefings/`  
**Titel:** "Weekly Briefings"  
**Inhalt:**
- Archiv der wöchentlichen Briefings
- Index/Übersicht
- Neuestes Briefing prominent

### 5. Daten & Methodik (optional)
**URL:** `/forschung/methodik/`  
**Titel:** "Methodik"  
**Inhalt:**
- Pipeline-Architektur erklärt
- Newsletter-Quellen (die funktionieren)
- GitHub-Repository Link
- Technische Dokumentation

## Implementierung in 11ty

### Dateistruktur vorschlagen:
```
src/
├── forschung/
│   ├── index.md                 # Übersichtsseite
│   ├── digital-capitalism-research.md  # Der Artikel
│   ├── graph/
│   │   └── index.md             # Graph-Seite
│   ├── briefings/
│   │   └── index.md             # Briefings-Archiv (optional)
│   └── methodik/
│       └── index.md             # Methodik (optional)
```

### Navigation in _data/navigation.js oder config:
```javascript
// Navigation items
module.exports = [
  { url: '/', title: 'Home' },
  { url: '/ueber/', title: 'Über' },
  { url: '/arbeiten/', title: 'Arbeiten' },
  { 
    url: '/forschung/', 
    title: 'Forschung',
    children: [
      { url: '/forschung/', title: 'Übersicht' },
      { url: '/forschung/digital-capitalism-research/', title: 'Das Projekt' },
      { url: '/forschung/graph/', title: 'Knowledge Graph' },
      // Optional:
      // { url: '/forschung/briefings/', title: 'Weekly Briefings' },
      // { url: '/forschung/methodik/', title: 'Methodik' },
    ]
  },
  { url: '/manifesto/', title: 'Manifesto' },
];
```

### Alternative: Einfache Navigation ohne Dropdown
Wenn Dropdowns kompliziert sind:
```
Home | Über | Arbeiten | Forschung | Manifesto
```

Auf der "Forschung"-Seite dann interne Links:
- [Das Projekt](/forschung/digital-capitalism-research/)
- [Knowledge Graph](/forschung/graph/)
- [Weekly Briefings](/forschung/briefings/)

## Content für Übersichtsseite (forschung/index.md)

```markdown
---
title: Forschung
date: 2026-03-14
---

# Forschung

## Digital Capitalism Research

Ein kontinuierliches Forschungsprojekt zu Plattformökonomie, 
Überwachungskapitalismus und der Zukunft der Arbeit.

**Aktueller Stand:**
- 1.104 Artikel gesammelt
- 12 Kernthemen kartiert  
- 7 aktive Research Tasks
- ~20 Newsletter werden täglich gemonitort

[Mehr über das Projekt](/forschung/digital-capitalism-research/)

## Knowledge Graph

Interaktive Visualisierung unserer Forschungsontologie:
Konzepte, Tasks und Artikel in Beziehung.

[Knowledge Graph erkunden](/forschung/graph/)

---

*Diese Forschung ist öffentlich dokumentiert auf 
[GitHub](https://github.com/MarcusGraetsch/digital-capitalism-research)*
```

## Next Steps

1. **Menü-Datei anpassen** (je nach 11ty-Setup)
2. **forschung/index.md** erstellen
3. **graph/index.md** erstellen (mit iframe oder inline)
4. **Navigation deployen**

Soll ich die Dateien (`forschung/index.md` und `forschung/graph/index.md`) 
erstellen?
