---
title: Knowledge Graph
layout: base.njk
date: 2026-03-14
---

# Knowledge Graph

Visualisierung unserer Forschungsontologie: Konzepte, Tasks und Artikel in ihren Verknüpfungen.

<div id="graph-container" style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; position: relative; background: #fafafa;">
    
    <!-- Controls -->
    <div style="position: absolute; top: 10px; left: 10px; z-index: 10;">
        <button onclick="filterGraph('all')" style="font-size: 12px; padding: 6px 12px; margin-right: 5px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Alle</button>
        <button onclick="filterGraph('concept')" style="font-size: 12px; padding: 6px 12px; margin-right: 5px; background: #c0392b; color: white; border: none; border-radius: 4px; cursor: pointer;">Konzepte</button>
        <button onclick="filterGraph('task')" style="font-size: 12px; padding: 6px 12px; margin-right: 5px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Tasks</button>
        <button onclick="filterGraph('article')" style="font-size: 12px; padding: 6px 12px; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer;">Artikel</button>
    </div>
    
    <!-- Legend -->
    <div style="position: absolute; bottom: 10px; left: 10px; z-index: 10; font-size: 12px; background: rgba(255,255,255,0.95); padding: 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 5px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #c0392b; border-radius: 50%; margin-right: 5px;"></span>
            Konzepte (12)
        </div>
        <div style="margin-bottom: 5px;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #27ae60; border-radius: 50%; margin-right: 5px;"></span>
            Research Tasks (7)
        </div>
        <div>
            <span style="display: inline-block; width: 12px; height: 12px; background: #2980b9; border-radius: 50%; margin-right: 5px;"></span>
            Artikel (1,104+)
        </div>
    </div>
</div>

## Über den Graphen

### Was ist das?

Der Knowledge Graph ist eine **Ontologie** – eine formale Darstellung unseres Wissens über Digital Capitalism. Er verknüpft:

- **Konzepte** (rot): Theorien und Phänomene wie "Platform Capitalism", "Surveillance Capitalism", "Gig Economy", "Green Colonialism"
- **Research Tasks** (grün): Konkrete Kapitel/Ziele mit Deadlines
- **Artikel** (blau): Die gesammelten Quellen aus Newslettern

### Wie funktioniert es?

- **Knoten** = Entitäten (Konzepte, Tasks, Artikel)
- **Kanten** = Beziehungen ("Artikel X diskutiert Konzept Y", "Task Z deckt Konzept W ab")
- **Interaktiv**: Drag & Drop zum Neuanordnen, Mausrad zum Zoomen, Filter-Buttons

### Warum?

Traditionelle Forschung arbeitet mit Ordnern und Dateien. Wir arbeiten mit **Verknüpfungen**. Das ermöglicht:

- Schnelle Navigation: "Zeige mir alle Artikel zu KI + Arbeitswelt"
- Lückenerkennung: "Welche Konzepte haben wenig Artikel?"
- Task-Tracking: "Welche Artikel sind relevant für Task X?"

### Technisch

Die Ontologie wird als [JSON-LD](https://json-ld.org/) gespeichert und kann maschinell verarbeitet werden. Sie ist Teil unseres [GitHub-Repositories](https://github.com/MarcusGraetsch/digital-capitalism-research/tree/master/memory/ontology).

---

*Der Graph wird automatisch aus unserer Forschungsdatenbank generiert. Letzte Aktualisierung: {{ page.date | date: "%d.%m.%Y" }}*

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
(function() {
    const data = {
        nodes: [
            { id: "c1", name: "Platform Capitalism", type: "concept", size: 25 },
            { id: "c2", name: "Surveillance Capitalism", type: "concept", size: 28 },
            { id: "c3", name: "Gig Economy", type: "concept", size: 26 },
            { id: "c4", name: "Green Colonialism", type: "concept", size: 24 },
            { id: "c5", name: "Data Extractivism", type: "concept", size: 22 },
            { id: "c6", name: "Precarious Work", type: "concept", size: 20 },
            { id: "c7", name: "Digital Climate Impact", type: "concept", size: 26 },
            { id: "c8", name: "Critical Minerals", type: "concept", size: 24 },
            { id: "t1", name: "Platform Theory", type: "task", size: 18 },
            { id: "t2", name: "Gig Empirics", type: "task", size: 20 },
            { id: "t3", name: "Labor Organizing", type: "task", size: 18 },
            { id: "t4", name: "AI Impact", type: "task", size: 20 },
            { id: "t5", name: "Environmental Impact", type: "task", size: 22 },
            { id: "a1", name: "Uber Labor", type: "article", size: 12 },
            { id: "a2", name: "Amazon Union", type: "article", size: 12 },
            { id: "a3", name: "KI & Arbeit", type: "article", size: 12 },
            { id: "a4", name: "Data Centers", type: "article", size: 12 },
            { id: "a5", name: "Cobalt Mining", type: "article", size: 12 },
        ],
        links: [
            { source: "a1", target: "c3" },
            { source: "a1", target: "c6" },
            { source: "a2", target: "t3" },
            { source: "a3", target: "t4" },
            { source: "a4", target: "c7" },
            { source: "a5", target: "c4" },
            { source: "t1", target: "c1" },
            { source: "t2", target: "c3" },
            { source: "t5", target: "c7" },
            { source: "c1", target: "c2" },
            { source: "c3", target: "c6" },
        ]
    };
    
    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = 600;
    
    const svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g');
    
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.5, 3])
        .on('zoom', (e) => g.attr('transform', e.transform)));
    
    const colors = {
        concept: '#c0392b',
        task: '#27ae60',
        article: '#2980b9'
    };
    
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
    
    const link = g.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', '#bdc3c7')
        .attr('stroke-width', 1.5);
    
    const node = g.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .call(d3.drag()
            .on('start', (e, d) => {
                if (!e.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on('end', (e, d) => {
                if (!e.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            }));
    
    node.append('circle')
        .attr('r', d => d.size)
        .attr('fill', d => colors[d.type])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
    
    node.append('text')
        .text(d => d.name)
        .attr('x', 0)
        .attr('y', d => d.size + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#2c3e50');
    
    node.append('title')
        .text(d => d.name);
    
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    window.filterGraph = function(type) {
        if (type === 'all') {
            node.style('opacity', 1);
            link.style('opacity', 1);
        } else {
            node.style('opacity', d => d.type === type ? 1 : 0.1);
            link.style('opacity', 0.1);
        }
    };
})();
</script>
