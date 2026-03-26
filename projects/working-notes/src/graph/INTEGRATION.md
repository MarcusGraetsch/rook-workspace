# Graph Integration Guide

Die Datei `ontology-graph.html` ist eine **standalone Visualisierung** des Knowledge Graphs.

## Option 1: Als eigene Seite

Einfach die Datei auf den Server kopieren:
```bash
scp ontology-graph.html user@webserver:/var/www/marcus-cyborg/graph/
```

Dann verfügbar unter: `https://working-notes.org/graph/ontology-graph.html`

## Option 2: Per iframe einbetten

In deinen Artikel oder eine bestehende Seite:

```html
<h2>Der Knowledge Graph</h2>
<p>Interaktive Visualisierung unserer Forschungsontologie:</p>

<iframe 
    src="/graph/ontology-graph.html" 
    width="100%" 
    height="600px" 
    frameborder="0"
    style="border: 1px solid #ddd; border-radius: 8px;"
>
</iframe>

<p>
    <small>
        <strong>Legende:</strong> 
        <span style="color: #e74c3c;">● Konzepte</span> | 
        <span style="color: #2ecc71;">● Tasks</span> | 
        <span style="color: #3498db;">● Artikel</span>
    </small>
</p>
```

## Option 3: Direkt in 11ty-Template integrieren

Das Graph-Skript in ein bestehendes Template kopieren:

1. Die `ontology-graph.html` öffnen
2. Den Inhalt zwischen `<script>` und `</script>` kopieren
3. In dein 11ty-Template einfügen
4. Container-Div hinzufügen: `<div id="graph-container" style="height: 600px;"></div>`

## Features

- **32 Knoten**: 12 Konzepte, 7 Tasks, 13 Beispiel-Artikel
- **Interaktiv**: Drag & Drop zum Neuanordnen
- **Zoom**: Mausrad zum Zoomen
- **Filter**: Buttons für Concepts/Tasks/Articles
- **Tooltips**: Hover über Knoten für Details
- **Responsive**: Passt sich der Bildschirmbreite an

## Daten aktualisieren

Der Graph ist momentan mit statischen Daten gefüllt. Für Live-Daten:

1. `generate_graph_data.py` ausführen (exportiert aus Ontologie)
2. Erzeugt `graph-data.json`
3. In der HTML-Datei `graphData` durch Fetch ersetzen:

```javascript
fetch('/data/graph-data.json')
    .then(r => r.json())
    .then(data => {
        graphData = data;
        initGraph();
    });
```

## Dateien

- `ontology-graph.html` - Standalone Graph-Seite
- `ontology-graph.html` kann auch per iframe eingebunden werden
