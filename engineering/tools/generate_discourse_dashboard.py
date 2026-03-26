#!/usr/bin/env python3
"""Generate a self-contained discourse network dashboard from literature.db.

Queries persons, works, mentions, concepts, and citation metrics,
computes co-authorship / co-citation / directed edges, and embeds
everything as JSON inside a static HTML file with D3.js v7.
"""

import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

LITERATURE_DB = Path("literature_pipeline/literature.db")
OUTPUT_FILE = Path("discourse-dashboard.html")


def get_connection(db_path):
    """Return a read-only SQLite connection."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ---------------------------------------------------------------------------
# Data queries
# ---------------------------------------------------------------------------

def get_persons(conn):
    """All non-merged persons with mention counts and pipeline breakdown."""
    rows = conn.execute("""
        SELECT
            p.id, p.canonical_name, p.display_name, p.role, p.fields,
            p.h_index, p.cited_by_count, p.works_count, p.is_seed,
            COALESCE(mc.mention_count, 0) AS mention_count,
            COALESCE(mc.lit_count, 0)     AS lit_count,
            COALESCE(mc.news_count, 0)    AS news_count,
            COALESCE(mc.pod_count, 0)     AS pod_count
        FROM persons p
        LEFT JOIN (
            SELECT
                mentioned_person_id AS pid,
                COUNT(*)                                    AS mention_count,
                SUM(CASE WHEN source_id IS NOT NULL THEN 1 ELSE 0 END) AS lit_count,
                SUM(CASE WHEN article_id IS NOT NULL THEN 1 ELSE 0 END) AS news_count,
                SUM(CASE WHEN episode_id IS NOT NULL THEN 1 ELSE 0 END) AS pod_count
            FROM mentions
            WHERE mentioned_person_id IS NOT NULL
            GROUP BY mentioned_person_id
        ) mc ON mc.pid = p.id
        WHERE p.merged_into_id IS NULL
          AND (COALESCE(mc.mention_count, 0) >= 1 OR p.is_seed = 1)
        ORDER BY COALESCE(mc.mention_count, 0) DESC
    """).fetchall()
    return rows


def get_top_works_for_person(conn, person_id, limit=5):
    """Top works for a person by citation count."""
    return conn.execute("""
        SELECT w.id, w.canonical_title AS title, w.year, w.cited_by_count
        FROM works w
        JOIN work_authors wa ON wa.work_id = w.id
        WHERE wa.person_id = ?
          AND w.merged_into_id IS NULL
        ORDER BY COALESCE(w.cited_by_count, 0) DESC
        LIMIT ?
    """, (person_id, limit)).fetchall()


def get_works(conn):
    """All non-merged works with mention counts and author names."""
    rows = conn.execute("""
        SELECT
            w.id, w.canonical_title AS title, w.work_type AS type,
            w.year, w.cited_by_count,
            COALESCE(mc.mention_count, 0) AS mention_count,
            GROUP_CONCAT(p.display_name, '; ') AS authors
        FROM works w
        LEFT JOIN (
            SELECT mentioned_work_id AS wid, COUNT(*) AS mention_count
            FROM mentions WHERE mentioned_work_id IS NOT NULL
            GROUP BY mentioned_work_id
        ) mc ON mc.wid = w.id
        LEFT JOIN work_authors wa ON wa.work_id = w.id
        LEFT JOIN persons p ON p.id = wa.person_id AND p.merged_into_id IS NULL
        WHERE w.merged_into_id IS NULL
          AND (COALESCE(mc.mention_count, 0) >= 1 OR COALESCE(w.cited_by_count, 0) > 0)
        GROUP BY w.id
        ORDER BY COALESCE(mc.mention_count, 0) DESC
    """).fetchall()
    return rows


def get_concepts(conn):
    """Concepts with linked person IDs (via concept_sources → work_authors)."""
    concept_rows = conn.execute("""
        SELECT c.id, c.name, c.display_name, c.category
        FROM concepts c ORDER BY c.name
    """).fetchall()

    concepts = []
    for c in concept_rows:
        person_ids = [r[0] for r in conn.execute("""
            SELECT DISTINCT wa.person_id
            FROM concept_sources cs
            JOIN work_authors wa ON wa.work_id IS NOT NULL
            JOIN sources s ON s.id = cs.source_id
            JOIN works w ON w.source_id = s.id AND w.merged_into_id IS NULL
            WHERE cs.concept_id = ?
              AND wa.work_id = w.id
        """, (c["id"],)).fetchall()]
        concepts.append({
            "id": c["id"],
            "name": c["display_name"] or c["name"],
            "category": c["category"],
            "person_ids": person_ids,
        })
    return [c for c in concepts if c["person_ids"]]


def compute_coauthorship_edges(conn):
    """Co-authorship: persons sharing a work_id."""
    rows = conn.execute("""
        SELECT wa1.person_id AS source, wa2.person_id AS target,
               COUNT(DISTINCT wa1.work_id) AS weight
        FROM work_authors wa1
        JOIN work_authors wa2 ON wa1.work_id = wa2.work_id
                              AND wa1.person_id < wa2.person_id
        JOIN persons p1 ON p1.id = wa1.person_id AND p1.merged_into_id IS NULL
        JOIN persons p2 ON p2.id = wa2.person_id AND p2.merged_into_id IS NULL
        GROUP BY wa1.person_id, wa2.person_id
    """).fetchall()
    return [dict(r) for r in rows]


def compute_cocitation_edges(conn):
    """Co-citation: persons mentioned together in the same source (>= 2 shared)."""
    rows = conn.execute("""
        SELECT m1.mentioned_person_id AS source,
               m2.mentioned_person_id AS target,
               COUNT(DISTINCT m1.source_id) AS weight
        FROM mentions m1
        JOIN mentions m2 ON m1.source_id = m2.source_id
                        AND m1.mentioned_person_id < m2.mentioned_person_id
        WHERE m1.mentioned_person_id IS NOT NULL
          AND m2.mentioned_person_id IS NOT NULL
          AND m1.source_id IS NOT NULL
        GROUP BY m1.mentioned_person_id, m2.mentioned_person_id
        HAVING COUNT(DISTINCT m1.source_id) >= 2
    """).fetchall()
    return [dict(r) for r in rows]


def compute_directed_edges(conn):
    """Directed edges: author of source → mentioned person, with type/sentiment."""
    rows = conn.execute("""
        SELECT
            wa.person_id AS source,
            m.mentioned_person_id AS target,
            m.mention_type AS type,
            m.sentiment,
            COUNT(*) AS count
        FROM mentions m
        JOIN sources s ON s.id = m.source_id
        JOIN works w ON w.source_id = s.id AND w.merged_into_id IS NULL
        JOIN work_authors wa ON wa.work_id = w.id
        JOIN persons p1 ON p1.id = wa.person_id AND p1.merged_into_id IS NULL
        JOIN persons p2 ON p2.id = m.mentioned_person_id AND p2.merged_into_id IS NULL
        WHERE m.mentioned_person_id IS NOT NULL
          AND m.source_id IS NOT NULL
          AND wa.person_id != m.mentioned_person_id
        GROUP BY wa.person_id, m.mentioned_person_id, m.mention_type, m.sentiment
    """).fetchall()
    return [dict(r) for r in rows]


def get_summary_stats(conn):
    """Counts for the stats grid."""
    def c(sql):
        return conn.execute(sql).fetchone()[0]
    return {
        "person_count": c("SELECT COUNT(*) FROM persons WHERE merged_into_id IS NULL"),
        "work_count": c("SELECT COUNT(*) FROM works WHERE merged_into_id IS NULL"),
        "mention_count": c("SELECT COUNT(*) FROM mentions"),
        "concept_count": c("SELECT COUNT(*) FROM concepts"),
        "quote_count": c("SELECT COUNT(*) FROM quotes"),
        "seed_count": c("SELECT COUNT(*) FROM persons WHERE is_seed = 1"),
    }


# ---------------------------------------------------------------------------
# Assemble dashboard data
# ---------------------------------------------------------------------------

def get_dashboard_data(conn):
    """Run all queries, compute edges, return full data dict."""
    stats = get_summary_stats(conn)

    persons_raw = get_persons(conn)
    persons = []
    for p in persons_raw:
        fields = None
        if p["fields"]:
            try:
                fields = json.loads(p["fields"])
            except (json.JSONDecodeError, TypeError):
                fields = [p["fields"]]
        top_works = [
            {"id": w["id"], "title": w["title"], "year": w["year"],
             "cited_by_count": w["cited_by_count"]}
            for w in get_top_works_for_person(conn, p["id"])
        ]
        persons.append({
            "id": p["id"],
            "name": p["display_name"] or p["canonical_name"],
            "role": p["role"],
            "fields": fields,
            "h_index": p["h_index"],
            "cited_by_count": p["cited_by_count"],
            "works_count": p["works_count"],
            "mention_count": p["mention_count"],
            "is_seed": bool(p["is_seed"]),
            "pipelines": {
                "literature": p["lit_count"],
                "news": p["news_count"],
                "podcast": p["pod_count"],
            },
            "top_works": top_works,
        })

    works_raw = get_works(conn)
    works = [
        {
            "id": w["id"],
            "title": w["title"],
            "type": w["type"],
            "year": w["year"],
            "authors": w["authors"],
            "cited_by_count": w["cited_by_count"],
            "mention_count": w["mention_count"],
        }
        for w in works_raw
    ]

    concepts = get_concepts(conn)

    edges = {
        "coauthorship": compute_coauthorship_edges(conn),
        "cocitation": compute_cocitation_edges(conn),
        "directed": compute_directed_edges(conn),
        "concept_person": [],
    }
    for c in concepts:
        for pid in c["person_ids"]:
            edges["concept_person"].append({"concept": c["id"], "person": pid})

    # Warn if sparse data
    if stats["mention_count"] < 50:
        print(f"WARNING: Only {stats['mention_count']} mentions in DB — "
              "graph may be sparse. Run extraction pipelines first.")

    return {
        "meta": {
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            **stats,
        },
        "persons": persons,
        "works": works,
        "concepts": concepts,
        "edges": edges,
    }


# ---------------------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------------------

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discourse Network Dashboard</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5; color: #333; line-height: 1.6;
        }
        .header {
            background: #1a1a2e; color: white; padding: 1.5rem 2rem;
            display: flex; justify-content: space-between; align-items: center;
        }
        .header h1 { font-size: 1.5rem; }
        .header .timestamp { color: #888; font-size: 0.85rem; }
        .stats-grid {
            display: grid; grid-template-columns: repeat(6, 1fr);
            gap: 0.75rem; padding: 1rem 2rem; max-width: 1400px; margin: 0 auto;
        }
        .stat-card {
            background: white; padding: 1rem; border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;
        }
        .stat-card h3 { color: #666; font-size: 0.75rem; text-transform: uppercase; }
        .stat-card .number { font-size: 1.8rem; font-weight: bold; color: #1a1a2e; }

        .controls {
            padding: 0.75rem 2rem; max-width: 1400px; margin: 0 auto;
            display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;
        }
        .controls label { font-size: 0.85rem; color: #555; }
        .controls select, .controls input[type="text"] {
            padding: 0.3rem 0.5rem; border: 1px solid #ccc; border-radius: 4px;
            font-size: 0.85rem;
        }
        .controls input[type="text"] { width: 180px; }
        .edge-toggles { display: flex; gap: 0.75rem; }
        .edge-toggles label { cursor: pointer; display: flex; align-items: center; gap: 0.25rem; }

        .main-area {
            display: flex; max-width: 1400px; margin: 0.5rem auto; padding: 0 2rem;
            gap: 1rem; min-height: 700px;
        }
        .graph-container {
            flex: 1; background: white; border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; overflow: hidden;
        }
        .graph-container svg { width: 100%; height: 700px; }

        .detail-panel {
            width: 320px; background: white; border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 1.25rem;
            overflow-y: auto; max-height: 700px;
        }
        .detail-panel h2 { font-size: 1.1rem; margin-bottom: 0.5rem; color: #1a1a2e; }
        .detail-panel .role-badge {
            display: inline-block; padding: 0.15rem 0.5rem; border-radius: 12px;
            font-size: 0.75rem; color: white; margin-bottom: 0.75rem;
        }
        .detail-panel .metric { display: flex; justify-content: space-between;
            padding: 0.3rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; }
        .detail-panel .metric .val { font-weight: 600; }
        .detail-panel .section-title {
            font-size: 0.8rem; text-transform: uppercase; color: #888;
            margin: 0.75rem 0 0.4rem; letter-spacing: 0.5px;
        }
        .detail-panel .work-item {
            font-size: 0.8rem; padding: 0.3rem 0; border-bottom: 1px solid #f8f8f8;
        }
        .detail-panel .work-item .year { color: #999; }
        .detail-panel .placeholder { color: #aaa; text-align: center; padding: 3rem 1rem; }
        .pipeline-badges { display: flex; gap: 0.4rem; margin: 0.5rem 0; }
        .pipeline-badges .badge {
            font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 8px;
            background: #eee; color: #555;
        }
        .pipeline-badges .badge.active { background: #d4edda; color: #155724; }

        .tabs {
            max-width: 1400px; margin: 0.5rem auto; padding: 0 2rem;
        }
        .tab-bar {
            display: flex; gap: 0; border-bottom: 2px solid #ddd;
        }
        .tab-btn {
            padding: 0.5rem 1.5rem; cursor: pointer; background: none;
            border: none; font-size: 0.9rem; color: #666;
            border-bottom: 2px solid transparent; margin-bottom: -2px;
        }
        .tab-btn.active { color: #1a1a2e; border-bottom-color: #1a1a2e; font-weight: 600; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .table-container {
            background: white; border-radius: 0 0 8px 8px; padding: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-height: 400px; overflow-y: auto;
        }
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;
             color: #555; cursor: pointer; white-space: nowrap; user-select: none; }
        th:hover { color: #1a1a2e; }
        td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #f0f0f0; }
        tr:hover td { background: #f8f9fa; }

        /* Graph styles */
        .node circle { cursor: pointer; transition: opacity 0.2s; }
        .node text { font-size: 10px; pointer-events: none; fill: #333; }
        .node.seed circle { stroke: white; stroke-width: 2.5px; }
        .node.dimmed { opacity: 0.15; }
        .link { fill: none; transition: opacity 0.2s; }
        .link.dimmed { opacity: 0.05; }
        .link.coauthorship { stroke: #999; stroke-width: 1.5px; }
        .link.cocitation { stroke: #999; stroke-width: 1px; stroke-dasharray: 4 3; }
        .link.agreement { stroke: #27ae60; stroke-width: 1.2px; }
        .link.critique { stroke: #e74c3c; stroke-width: 1.2px; stroke-dasharray: 6 3; }
        .concept-node polygon { fill: #9b59b6; opacity: 0.7; cursor: pointer; }
        .concept-node text { font-size: 8px; fill: #7d3c98; }
        .concept-link { stroke: #d2b4de; stroke-width: 0.5px; }
        .concept-layer { display: none; }
        .concept-layer.visible { display: block; }

        .legend {
            position: absolute; bottom: 10px; left: 10px; background: rgba(255,255,255,0.9);
            padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.75rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .legend-item { display: flex; align-items: center; gap: 0.4rem; margin: 0.2rem 0; }
        .legend-swatch { width: 12px; height: 12px; border-radius: 50%; }

        @media (max-width: 900px) {
            .stats-grid { grid-template-columns: repeat(3, 1fr); }
            .main-area { flex-direction: column; }
            .detail-panel { width: 100%; max-height: 300px; }
        }
    </style>
</head>
<body>

<div class="header">
    <h1>Discourse Network Dashboard</h1>
    <span class="timestamp" id="timestamp"></span>
</div>

<div class="stats-grid" id="stats-grid"></div>

<div class="controls">
    <label>Role:
        <select id="filter-role">
            <option value="all">All</option>
            <option value="scholar">Scholar</option>
            <option value="journalist">Journalist</option>
            <option value="activist">Activist</option>
            <option value="executive">Executive</option>
        </select>
    </label>
    <div class="edge-toggles">
        <label><input type="checkbox" data-edge="coauthorship" checked> Co-authorship</label>
        <label><input type="checkbox" data-edge="cocitation" checked> Co-citation</label>
        <label><input type="checkbox" data-edge="agreement" checked> Agreement</label>
        <label><input type="checkbox" data-edge="critique" checked> Critique</label>
    </div>
    <label>Size:
        <select id="size-metric">
            <option value="h_index">h-index</option>
            <option value="cited_by_count">Cited-by count</option>
            <option value="mention_count">Mention count</option>
        </select>
    </label>
    <label><input type="checkbox" id="toggle-concepts"> Concepts</label>
    <label>Search: <input type="text" id="search-input" placeholder="Filter by name..."></label>
</div>

<div class="main-area">
    <div class="graph-container">
        <svg id="graph-svg"></svg>
        <div class="legend" id="legend"></div>
    </div>
    <div class="detail-panel" id="detail-panel">
        <div class="placeholder">Click a node to see details</div>
    </div>
</div>

<div class="tabs">
    <div class="tab-bar">
        <button class="tab-btn active" data-tab="tab-authors">Author Network</button>
        <button class="tab-btn" data-tab="tab-works">Works Table</button>
        <button class="tab-btn" data-tab="tab-flow">Citation Flow</button>
    </div>
    <div id="tab-authors" class="tab-content active">
        <div class="table-container">
            <table id="table-authors">
                <thead><tr>
                    <th data-col="name">Name</th>
                    <th data-col="role">Role</th>
                    <th data-col="h_index">h-index</th>
                    <th data-col="cited_by_count">Cited by</th>
                    <th data-col="mention_count">Mentions</th>
                    <th data-col="is_seed">Seed</th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
    <div id="tab-works" class="tab-content">
        <div class="table-container">
            <table id="table-works">
                <thead><tr>
                    <th data-col="title">Title</th>
                    <th data-col="authors">Authors</th>
                    <th data-col="year">Year</th>
                    <th data-col="cited_by_count">Cited by</th>
                    <th data-col="mention_count">Mentions</th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
    <div id="tab-flow" class="tab-content">
        <div class="table-container">
            <table id="table-flow">
                <thead><tr>
                    <th data-col="source_name">Source</th>
                    <th data-col="target_name">Target</th>
                    <th data-col="type">Type</th>
                    <th data-col="sentiment">Sentiment</th>
                    <th data-col="count">Count</th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<script>
// --- DATA (injected by generator) ---
const DASHBOARD_DATA = %%DASHBOARD_DATA%%;

// --- Constants ---
const ROLE_COLORS = {
    scholar: '#3498db', journalist: '#e67e22', activist: '#27ae60',
    executive: '#e74c3c', politician: '#8e44ad', null: '#95a5a6', undefined: '#95a5a6'
};
const EDGE_DISTANCES = { coauthorship: 60, cocitation: 100, agreement: 80, critique: 200 };
const EDGE_STRENGTHS = { coauthorship: 0.7, cocitation: 0.3, agreement: 0.5, critique: 0.1 };

// --- Populate stats ---
const meta = DASHBOARD_DATA.meta;
document.getElementById('timestamp').textContent = 'Generated: ' + meta.generated_at;
const statsGrid = document.getElementById('stats-grid');
[
    ['Persons', meta.person_count], ['Works', meta.work_count],
    ['Mentions', meta.mention_count], ['Concepts', meta.concept_count],
    ['Quotes', meta.quote_count], ['Seed Persons', meta.seed_count]
].forEach(([label, val]) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<h3>${label}</h3><div class="number">${val}</div>`;
    statsGrid.appendChild(card);
});

// --- Legend ---
const legend = document.getElementById('legend');
legend.innerHTML = Object.entries(ROLE_COLORS)
    .filter(([k]) => k !== 'null' && k !== 'undefined')
    .map(([role, color]) =>
        `<div class="legend-item"><div class="legend-swatch" style="background:${color}"></div>${role}</div>`
    ).join('');

// --- Build lookup ---
const personMap = new Map(DASHBOARD_DATA.persons.map(p => [p.id, p]));

// --- Prepare graph data ---
function buildGraphData() {
    const roleFilter = document.getElementById('filter-role').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    let persons = DASHBOARD_DATA.persons;
    if (roleFilter !== 'all') persons = persons.filter(p => p.role === roleFilter);
    if (searchTerm) persons = persons.filter(p => p.name.toLowerCase().includes(searchTerm));

    const idSet = new Set(persons.map(p => p.id));
    const nodes = persons.map(p => ({ ...p }));

    const links = [];
    const edgeToggles = {};
    document.querySelectorAll('[data-edge]').forEach(cb => {
        edgeToggles[cb.dataset.edge] = cb.checked;
    });

    if (edgeToggles.coauthorship) {
        DASHBOARD_DATA.edges.coauthorship.forEach(e => {
            if (idSet.has(e.source) && idSet.has(e.target))
                links.push({ source: e.source, target: e.target, type: 'coauthorship', weight: e.weight });
        });
    }
    if (edgeToggles.cocitation) {
        DASHBOARD_DATA.edges.cocitation.forEach(e => {
            if (idSet.has(e.source) && idSet.has(e.target))
                links.push({ source: e.source, target: e.target, type: 'cocitation', weight: e.weight });
        });
    }
    if (edgeToggles.agreement || edgeToggles.critique) {
        DASHBOARD_DATA.edges.directed.forEach(e => {
            if (!idSet.has(e.source) || !idSet.has(e.target)) return;
            const isAgreement = ['agreement', 'extension', 'application'].includes(e.type);
            const isCritique = e.type === 'critique';
            if (isAgreement && edgeToggles.agreement)
                links.push({ source: e.source, target: e.target, type: 'agreement', weight: e.count });
            else if (isCritique && edgeToggles.critique)
                links.push({ source: e.source, target: e.target, type: 'critique', weight: e.count });
        });
    }

    return { nodes, links, idSet };
}

// --- Size scale ---
function sizeScale(persons) {
    const metric = document.getElementById('size-metric').value;
    const vals = persons.map(p => p[metric] || 0);
    const maxVal = Math.max(1, ...vals);
    return p => 4 + 16 * Math.sqrt((p[metric] || 0) / maxVal);
}

// --- D3 Force Graph ---
const svg = d3.select('#graph-svg');
const width = 900;
const height = 700;
svg.attr('viewBox', [0, 0, width, height]);

const defs = svg.append('defs');
defs.append('marker').attr('id', 'arrow-agreement').attr('viewBox', '0 -5 10 10')
    .attr('refX', 20).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#27ae60');
defs.append('marker').attr('id', 'arrow-critique').attr('viewBox', '0 -5 10 10')
    .attr('refX', 20).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#e74c3c');

const g = svg.append('g');
svg.call(d3.zoom().scaleExtent([0.2, 5]).on('zoom', e => g.attr('transform', e.transform)));

const linkGroup = g.append('g').attr('class', 'links');
const conceptLinkGroup = g.append('g').attr('class', 'concept-layer concept-links');
const conceptNodeGroup = g.append('g').attr('class', 'concept-layer concept-nodes');
const nodeGroup = g.append('g').attr('class', 'nodes');

let simulation;

function renderGraph() {
    const { nodes, links, idSet } = buildGraphData();
    const getSize = sizeScale(nodes);

    // Stop previous simulation
    if (simulation) simulation.stop();

    // Links
    linkGroup.selectAll('*').remove();
    const linkSel = linkGroup.selectAll('line').data(links)
        .join('line')
        .attr('class', d => 'link ' + d.type)
        .attr('marker-end', d => (d.type === 'agreement' || d.type === 'critique')
            ? `url(#arrow-${d.type})` : null);

    // Nodes
    nodeGroup.selectAll('*').remove();
    const nodeSel = nodeGroup.selectAll('g').data(nodes, d => d.id)
        .join('g')
        .attr('class', d => 'node' + (d.is_seed ? ' seed' : ''));

    nodeSel.append('circle')
        .attr('r', d => getSize(d))
        .attr('fill', d => ROLE_COLORS[d.role] || ROLE_COLORS[null])
        .attr('stroke', d => d.is_seed ? 'white' : '#fff')
        .attr('stroke-width', d => d.is_seed ? 2.5 : 0.5);

    nodeSel.append('text')
        .attr('dx', d => getSize(d) + 3)
        .attr('dy', '0.35em')
        .text(d => d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name);

    // Drag
    nodeSel.call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); })
    );

    // Double-click unpin
    nodeSel.on('dblclick', (e, d) => { d.fx = null; d.fy = null; });

    // Hover highlight
    nodeSel.on('mouseover', (e, d) => {
        const neighbors = new Set();
        links.forEach(l => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            if (sid === d.id) neighbors.add(tid);
            if (tid === d.id) neighbors.add(sid);
        });
        neighbors.add(d.id);
        nodeSel.classed('dimmed', n => !neighbors.has(n.id));
        linkSel.classed('dimmed', l => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return sid !== d.id && tid !== d.id;
        });
    }).on('mouseout', () => {
        nodeSel.classed('dimmed', false);
        linkSel.classed('dimmed', false);
    });

    // Click detail
    nodeSel.on('click', (e, d) => showDetail(d));

    // Concepts overlay
    conceptNodeGroup.selectAll('*').remove();
    conceptLinkGroup.selectAll('*').remove();
    const concepts = DASHBOARD_DATA.concepts.filter(c => c.person_ids.some(pid => idSet.has(pid)));
    const conceptNodes = concepts.map(c => ({
        id: 'c_' + c.id, name: c.name, isConcept: true, fx: null, fy: null
    }));
    const conceptLinks = [];
    concepts.forEach(c => {
        c.person_ids.forEach(pid => {
            if (idSet.has(pid))
                conceptLinks.push({ source: 'c_' + c.id, target: pid });
        });
    });

    // Simulation
    const allNodes = [...nodes, ...conceptNodes];
    const allLinks = [...links, ...conceptLinks];

    simulation = d3.forceSimulation(allNodes)
        .force('link', d3.forceLink(allLinks).id(d => d.id)
            .distance(d => {
                if (d.source.isConcept || d.target.isConcept) return 50;
                return EDGE_DISTANCES[d.type] || 100;
            })
            .strength(d => {
                if (d.source.isConcept || d.target.isConcept) return 0.1;
                return EDGE_STRENGTHS[d.type] || 0.3;
            })
        )
        .force('charge', d3.forceManyBody().strength(d => d.isConcept ? -20 : -120))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.isConcept ? 6 : getSize(d) + 2));

    // Concept visuals
    const cLinkSel = conceptLinkGroup.selectAll('line').data(conceptLinks)
        .join('line').attr('class', 'concept-link');
    const cNodeSel = conceptNodeGroup.selectAll('g').data(conceptNodes, d => d.id)
        .join('g').attr('class', 'concept-node');
    cNodeSel.append('polygon').attr('points', '-5,0 0,-5 5,0 0,5');
    cNodeSel.append('text').attr('dx', 7).attr('dy', '0.35em').text(d => d.name);

    simulation.on('tick', () => {
        linkSel
            .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
        cLinkSel
            .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        cNodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

// --- Detail panel ---
function showDetail(person) {
    const panel = document.getElementById('detail-panel');
    const color = ROLE_COLORS[person.role] || ROLE_COLORS[null];
    const pipelines = person.pipelines || {};
    const badgeClass = (n) => n > 0 ? 'badge active' : 'badge';

    let worksHtml = '';
    if (person.top_works && person.top_works.length) {
        worksHtml = person.top_works.map(w =>
            `<div class="work-item">${w.title} <span class="year">(${w.year || '?'})</span>` +
            (w.cited_by_count ? ` — ${w.cited_by_count} cit.` : '') + `</div>`
        ).join('');
    } else {
        worksHtml = '<div class="work-item" style="color:#aaa">No works linked</div>';
    }

    // Gather mention edges for this person
    const mentionLines = [];
    DASHBOARD_DATA.edges.directed.forEach(e => {
        if (e.target === person.id) {
            const src = personMap.get(e.source);
            if (src) mentionLines.push(`<div class="work-item">${src.name} &rarr; ${e.type} (${e.count})</div>`);
        }
        if (e.source === person.id) {
            const tgt = personMap.get(e.target);
            if (tgt) mentionLines.push(`<div class="work-item">&rarr; ${tgt.name}: ${e.type} (${e.count})</div>`);
        }
    });

    panel.innerHTML = `
        <h2>${person.name}</h2>
        <span class="role-badge" style="background:${color}">${person.role || 'unknown'}</span>
        ${person.fields ? `<div style="font-size:0.8rem;color:#777;margin-bottom:0.5rem">${person.fields.join(', ')}</div>` : ''}
        <div class="metric"><span>h-index</span><span class="val">${person.h_index ?? '—'}</span></div>
        <div class="metric"><span>Cited by</span><span class="val">${person.cited_by_count ?? '—'}</span></div>
        <div class="metric"><span>Works</span><span class="val">${person.works_count ?? '—'}</span></div>
        <div class="metric"><span>Mentions</span><span class="val">${person.mention_count}</span></div>
        <div class="pipeline-badges">
            <span class="${badgeClass(pipelines.literature || 0)}">Lit: ${pipelines.literature || 0}</span>
            <span class="${badgeClass(pipelines.news || 0)}">News: ${pipelines.news || 0}</span>
            <span class="${badgeClass(pipelines.podcast || 0)}">Pod: ${pipelines.podcast || 0}</span>
        </div>
        <div class="section-title">Top Works</div>
        ${worksHtml}
        ${mentionLines.length ? `<div class="section-title">Discourse Edges</div>${mentionLines.join('')}` : ''}
    `;
}

// --- Tables ---
function populateTables() {
    // Authors table
    const aTbody = document.querySelector('#table-authors tbody');
    aTbody.innerHTML = DASHBOARD_DATA.persons.map(p => `<tr>
        <td>${p.name}</td><td>${p.role || ''}</td><td>${p.h_index ?? ''}</td>
        <td>${p.cited_by_count ?? ''}</td><td>${p.mention_count}</td>
        <td>${p.is_seed ? 'Yes' : ''}</td>
    </tr>`).join('');

    // Works table
    const wTbody = document.querySelector('#table-works tbody');
    wTbody.innerHTML = DASHBOARD_DATA.works.map(w => `<tr>
        <td>${w.title}</td><td>${w.authors || ''}</td><td>${w.year || ''}</td>
        <td>${w.cited_by_count ?? ''}</td><td>${w.mention_count}</td>
    </tr>`).join('');

    // Flow table
    const fTbody = document.querySelector('#table-flow tbody');
    fTbody.innerHTML = DASHBOARD_DATA.edges.directed.map(e => {
        const src = personMap.get(e.source);
        const tgt = personMap.get(e.target);
        return `<tr>
            <td>${src ? src.name : e.source}</td><td>${tgt ? tgt.name : e.target}</td>
            <td>${e.type}</td><td>${e.sentiment || ''}</td><td>${e.count}</td>
        </tr>`;
    }).join('');
}

// --- Table sorting ---
document.querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const colIdx = Array.from(th.parentNode.children).indexOf(th);
        const asc = th.dataset.sort !== 'asc';
        th.parentNode.querySelectorAll('th').forEach(t => delete t.dataset.sort);
        th.dataset.sort = asc ? 'asc' : 'desc';
        rows.sort((a, b) => {
            let va = a.children[colIdx].textContent.trim();
            let vb = b.children[colIdx].textContent.trim();
            const na = parseFloat(va), nb = parseFloat(vb);
            if (!isNaN(na) && !isNaN(nb)) return asc ? na - nb : nb - na;
            return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        });
        rows.forEach(r => tbody.appendChild(r));
    });
});

// --- Tab switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// --- Control event handlers ---
document.getElementById('filter-role').addEventListener('change', renderGraph);
document.getElementById('size-metric').addEventListener('change', renderGraph);
document.getElementById('search-input').addEventListener('input', renderGraph);
document.querySelectorAll('[data-edge]').forEach(cb => cb.addEventListener('change', renderGraph));
document.getElementById('toggle-concepts').addEventListener('change', e => {
    document.querySelectorAll('.concept-layer').forEach(el => {
        el.classList.toggle('visible', e.target.checked);
    });
});

// --- Init ---
renderGraph();
populateTables();
</script>
</body>
</html>"""


def generate_html(data):
    """Inject dashboard data JSON into the HTML template."""
    data_json = json.dumps(data, ensure_ascii=False, default=str)
    return HTML_TEMPLATE.replace("%%DASHBOARD_DATA%%", data_json)


def main():
    if not LITERATURE_DB.exists():
        print(f"ERROR: Database not found: {LITERATURE_DB}")
        sys.exit(1)

    conn = get_connection(LITERATURE_DB)
    data = get_dashboard_data(conn)
    html = generate_html(data)
    OUTPUT_FILE.write_text(html, encoding="utf-8")
    conn.close()

    p = data["meta"]
    print(f"Discourse dashboard generated: {OUTPUT_FILE}")
    print(f"  {p['person_count']} persons, {p['work_count']} works, "
          f"{p['mention_count']} mentions, {p['concept_count']} concepts")


if __name__ == "__main__":
    main()
