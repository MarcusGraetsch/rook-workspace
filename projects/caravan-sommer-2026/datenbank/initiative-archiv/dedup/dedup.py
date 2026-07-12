#!/usr/bin/env python3
"""
Deduplizierung der Caravan-Sommer-2026 Initiative-Archiv-Rohdaten.

Strategie (2026-07-05):
  1) Tagge jeden Eintrag als "initiative" (Ort/Projekt) oder "artikel"
     (Hintergrundmaterial über Initiativen).
  2) Intra-Datei-Dedup: gleiche source_url -> zusammengeführt,
     reichhaltigster Eintrag bleibt.
  3) Cross-Datei-Dedup (nur initiatives): Match-Key =
     normalisierter Name + normalisierter Ort (city+country).
  4) Output:
       initiativen.jsonl   – ein Eintrag pro einzigartiger Initiative,
                             mit "sources": [array aller Original-URLs]
       artikel.jsonl       – Hintergrund-Artikel, dedupliziert nach URL
       clusters.jsonl      – Audit-Trail: welche Original-IDs gemerged wurden
       REPORT-dedup.md     – Statistik + Methodik

Bewusst NICHT gemacht:
  - Lat/Lon-Anreicherung (Handarbeit / OSM)
  - Type-Mapping aufs Master-Schema (Kuration, nicht Dedup)
  - Schreiben in /datenbank/orte.jsonl (Master-Datei ist kuratiert,
    Crawler-Output ist Rohstoff – manueller Merge-Schritt)
"""

import json
import os
import re
import unicodedata
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv")
OUT = ROOT / "dedup"
OUT.mkdir(exist_ok=True)

# ---------- Quelldateien ----------
SOURCES = [
    ("contraste",          ROOT / "contraste/contraste_initiativen.jsonl"),
    ("kontrapolis",        ROOT / "kontrapolis/kontrapolis_initiativen.jsonl"),
    ("netzwerk-oekodorf",  ROOT / "netzwerk-oekodorf/netzwerk-oekodorf_initiativen.jsonl"),
    ("wohnprojekte-portal",ROOT / "wohnprojekte-portal/wohnprojekte-portal_initiativen.jsonl"),
    ("squat-net",          ROOT / "squat-net/squat-net_initiativen.jsonl"),
    ("workaway",           ROOT / "workaway/workaway_initiativen.jsonl"),
    ("workaway_dach",      ROOT / "workaway/workaway_dach.jsonl"),
    ("gen-europe",         ROOT / "gen-europe-networks/gen_europe_networks.jsonl"),
]

# ---------- Type -> Klasse ----------
# "initiative" = ein Ort/Projekt, der/das man besuchen könnte
# "artikel"    = Hintergrundmaterial über Orte/Themen, nicht der Ort selbst
ARTICLE_TYPES = {
    "Kontrapolis-Artikel (thematisch)",
    "Kontrapolis-Artikel (initiativen-bezogen)",
    "Squat-Artikel (initiativen-bezogen)",
    "Hausprojekt-Artikel",
    "Wagenplatz-Artikel",
}

# ---------- Normalisierung ----------
def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s)
                   if not unicodedata.combining(c))

def norm_text(s: str) -> str:
    """Lowercase + accent-strip + collapse whitespace + strip punct."""
    if not s:
        return ""
    s = strip_accents(s).lower()
    s = re.sub(r"[\"'`´„”‚‘’«»()\[\]{}<>!?.,;:*/\\|]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def match_key(entry: dict) -> tuple[str, str]:
    """Match-Key für Cross-Dedup: (name, ort).
    Bei Workaway: nutze _workaway_host_id als Primärschlüssel, sonst Name.
    Cross-Match über generische Titel wie 'Au Pair' oder 'House / pet
    sitting' ist Gift — die sind Crawler-Fehler, keine echten Namen."""
    src = entry.get("_source_file", "")
    # Workaway: ID-basiert, niemals name-basiert cross-matchen
    if "workaway" in src:
        wid = entry.get("_workaway_host_id") or ""
        loc = entry.get("location") or {}
        country = (loc.get("country") or "").upper()
        return (f"workaway:{wid}", country.lower())
    name = norm_text(entry.get("name") or "")
    loc = entry.get("location") or {}
    city = norm_text(loc.get("city") or "")
    region = norm_text(loc.get("region") or "")
    country = (loc.get("country") or "").upper()
    if city:
        ort = city
    elif region:
        ort = region
    else:
        ort = country.lower()
    return (name, ort)

def richness(entry: dict) -> int:
    """Wie viele nützliche Felder hat der Eintrag?"""
    score = 0
    for k in ("name", "description", "type", "character", "cost"):
        v = entry.get(k)
        if v and not (isinstance(v, str) and len(v) < 5):
            score += 2
    loc = entry.get("location") or {}
    for k in ("city", "region", "address", "country"):
        if loc.get(k):
            score += 1
    contact = entry.get("contact_url") or entry.get("contact_email") or entry.get("contact_phone")
    if contact:
        score += 3
    if entry.get("activities"):
        score += 1
    return score

# ---------- Hauptlogik ----------
def main():
    raw = []  # (source_file, idx, entry)
    for tag, path in SOURCES:
        if not path.exists():
            print(f"  ⚠️  fehlt: {path}")
            continue
        with open(path) as f:
            for idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                except json.JSONDecodeError as e:
                    print(f"  ⚠️  JSON-Fehler in {path}:{idx}: {e}")
                    continue
                d["_source_file"] = tag
                d["_orig_idx"] = idx
                raw.append((tag, idx, d))

    print(f"\n📥 Roh geladen: {len(raw)} Einträge aus {len({s for s,_,_ in raw})} Quellen")

    # ---- Tagging: initiative vs. artikel ----
    initiatives = []
    articles = []
    for tag, idx, d in raw:
        t = d.get("type", "")
        if t in ARTICLE_TYPES or "(artikel" in t.lower() or "(thematisch)" in t:
            d["_class"] = "artikel"
            articles.append(d)
        else:
            d["_class"] = "initiative"
            initiatives.append(d)

    print(f"   ├─ Initiativen/Orte:  {len(initiatives)}")
    print(f"   └─ Artikel:           {len(articles)}")

    # ---- Intra-Datei-Dedup ----
    # URL allein reicht NICHT — manche Crawler aggregieren mehrere Items
    # unter derselben Übersichts-URL (z.B. contraste /termine/, /kleinanzeigen/).
    # Wir brauchen ZUSÄTZLICH einen Identifikator:
    #   - Workaway: _workaway_host_id
    #   - Kontrapolis/Squat: nichts, URL reicht (jeder Artikel hat eine eindeutige URL)
    #   - Andere: normalisierter name (Fallback)
    def entry_identity(d):
        """Sekundärer Identifikator. Gleiche URL + gleicher Identifikator = Dup."""
        src = d.get("_source_file", "")
        if "workaway" in src:
            return d.get("_workaway_host_id") or ""
        # Kontrapolis/Squat: jeder Artikel hat eine eigene URL, kein Identifikator nötig
        if src in ("kontrapolis", "squat-net"):
            return ""
        # Für alle anderen (incl. contraste): issue_ref wenn vorhanden, sonst name
        ref = d.get("issue_ref")
        if ref:
            return f"issue:{norm_text(ref)}"
        return f"name:{norm_text(d.get('name',''))}"

    def dedup(items):
        buckets = defaultdict(list)
        no_url = []
        for d in items:
            url = d.get("source_url")
            ident = entry_identity(d)
            if not url:
                no_url.append(d)
                continue
            # Wenn kein Identifikator: nur dann dedupen, wenn name exakt gleich ist
            if not ident:
                ident = f"name:{norm_text(d.get('name',''))}"
            key = (url, ident)
            buckets[key].append(d)
        kept = []
        for key, group in buckets.items():
            if len(group) == 1:
                kept.append(group[0])
            else:
                group.sort(key=richness, reverse=True)
                winner = group[0]
                winner["_dup_count"] = len(group)
                winner["_dup_sources"] = [d.get("_source_file") for d in group]
                kept.append(winner)
        return kept + no_url

    init_after_url = dedup(initiatives)
    art_after_url = dedup(articles)

    print(f"\n🔗 Nach URL-Dedup:")
    print(f"   ├─ Initiativen: {len(initiatives)} → {len(init_after_url)} (-{len(initiatives)-len(init_after_url)})")
    print(f"   └─ Artikel:     {len(articles)} → {len(art_after_url)} (-{len(articles)-len(art_after_url)})")

    # ---- Cross-Datei-Dedup (nur initiatives, per match_key) ----
    # Zusätzlich: niemals Workaway mit Nicht-Workaway kreuzen
    clusters = defaultdict(list)
    for d in init_after_url:
        key = match_key(d)
        # Workaway-Keys bekommen Namespace, damit sie sich nicht mit anderen kreuzen
        if "workaway" in d.get("_source_file", ""):
            key = ("__WA__",) + key
        clusters[key].append(d)

    init_final = []
    cluster_log = []
    for key, group in clusters.items():
        if len(group) == 1:
            init_final.append(group[0])
        else:
            group.sort(key=richness, reverse=True)
            winner = group[0]
            merged = {
                "_class": "initiative",
                "name": winner.get("name"),
                "type": winner.get("type"),
                "types": winner.get("types"),
                "location": winner.get("location"),
                "contact_url": winner.get("contact_url"),
                "contact_email": winner.get("contact_email"),
                "contact_phone": winner.get("contact_phone"),
                "character": winner.get("character"),
                "cost": winner.get("cost"),
                "activities": winner.get("activities"),
                "description": winner.get("description"),
                "_sources": [],
                "_matched_in_files": [],
                "_match_count": len(group),
            }
            for d in group:
                src = {
                    "file": d.get("_source_file"),
                    "url": d.get("source_url"),
                    "scraped_at": d.get("scraped_at"),
                }
                merged["_sources"].append(src)
                if d.get("_source_file") not in merged["_matched_in_files"]:
                    merged["_matched_in_files"].append(d.get("_source_file"))
                # Bessere Kontaktdaten ergänzen, falls vorhanden
                for ck in ("contact_url", "contact_email", "contact_phone"):
                    if not merged.get(ck) and d.get(ck):
                        merged[ck] = d.get(ck)
            init_final.append(merged)
            cluster_log.append({
                "match_key": key,
                "name": winner.get("name"),
                "city": (winner.get("location") or {}).get("city"),
                "country": (winner.get("location") or {}).get("country"),
                "count": len(group),
                "sources": [s["url"] for s in merged["_sources"]],
                "files": merged["_matched_in_files"],
            })

    print(f"\n🌐 Nach Cross-Dedup:")
    print(f"   └─ Initiativen: {len(init_after_url)} → {len(init_final)} (-{len(init_after_url)-len(init_final)})")
    merged_clusters = [c for c in cluster_log if c["count"] > 1]
    print(f"   └─ Cluster mit ≥2 Treffern: {len(merged_clusters)}")

    # ---- Schreibe Outputs ----
    def clean(d):
        """Interne _-Keys raus für Output.
        Wichtig: _source_file bleibt für nicht-gemergte Einträge erhalten,
        _sources/_matched_in_files für gemergte. Alles andere raus."""
        keep = {
            "_sources", "_matched_in_files", "_match_count",
            "_dup_count", "_dup_sources",
            "_workaway_host_id", "_workaway_rating",
            "_workaway_categories", "_dach_label",
            "_source_file",  # für nicht-gemergte Einträge (immer vorhanden)
        }
        # Falls merged: gib _sources als 'sources' raus (ohne Unterstrich)
        if "_sources" in d:
            out = {k: v for k, v in d.items() if k in keep or not k.startswith("_")}
            out["sources"] = out.pop("_sources")
            out["matched_in_files"] = out.pop("_matched_in_files")
            return out
        # Sonst: normalisieren auf 'sources' für Konsistenz
        out = {k: v for k, v in d.items() if k in keep or not k.startswith("_")}
        out["sources"] = [{
            "file": d.get("_source_file"),
            "url": d.get("source_url"),
            "scraped_at": d.get("scraped_at"),
        }]
        return out

    with open(OUT / "initiativen.jsonl", "w") as f:
        for d in init_final:
            f.write(json.dumps(clean(d), ensure_ascii=False) + "\n")

    with open(OUT / "artikel.jsonl", "w") as f:
        for d in art_after_url:
            f.write(json.dumps(clean(d), ensure_ascii=False) + "\n")

    with open(OUT / "clusters.jsonl", "w") as f:
        for c in cluster_log:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    # ---- Statistik ----
    by_file = Counter()
    by_country = Counter()
    by_char = Counter()
    for d in init_final:
        srcs = d.get("_sources") or [{"file": d.get("_source_file")}]
        for s in srcs:
            by_file[s["file"]] += 1
        country = (d.get("location") or {}).get("country")
        if country:
            by_country[country] += 1
        if d.get("character"):
            by_char[d["character"]] += 1

    # ---- REPORT ----
    lines = []
    lines.append("# Deduplizierungs-Report — Caravan-Sommer-2026")
    lines.append("")
    lines.append(f"**Datum:** 2026-07-05  ")
    lines.append(f"**Methode:** URL-Dedup + normalisierter (Name, Ort)-Match  ")
    lines.append(f"**Input:** {len(raw)} Einträge aus {len({s for s,_,_ in raw})} Crawler-Dateien  ")
    lines.append(f"**Output:** {len(init_final)} Initiativen + {len(art_after_url)} Artikel  ")
    lines.append("")
    lines.append("## 1. Phasen")
    lines.append("")
    lines.append("| Phase | Initiativen | Artikel |")
    lines.append("|---|---|---|")
    lines.append(f"| Roh geladen | {len(initiatives)} | {len(articles)} |")
    lines.append(f"| Nach URL-Dedup (intra-Datei) | {len(init_after_url)} | {len(art_after_url)} |")
    lines.append(f"| Nach Cross-Dedup (Name+Ort) | **{len(init_final)}** | {len(art_after_url)} |")
    lines.append(f"| **Reduktion Initiativen** | **{len(initiatives)-len(init_final)} Einträge** ({100*(len(initiatives)-len(init_final))/max(1,len(initiatives)):.1f}%) | – |")
    lines.append("")
    lines.append("## 2. Cross-Cluster (Initiativen in ≥2 Quellen)")
    lines.append("")
    if merged_clusters:
        lines.append(f"Es gibt **{len(merged_clusters)} Cluster** mit Mehrfach-Treffern:")
        lines.append("")
        lines.append("| Name | Stadt | Land | Treffer | Dateien |")
        lines.append("|---|---|---|---|---|")
        for c in sorted(merged_clusters, key=lambda x: -x["count"])[:30]:
            lines.append(f"| {(c['name'] or '')[:50]} | {c['city'] or ''} | {c['country'] or ''} | {c['count']} | {', '.join(c['files'])} |")
        if len(merged_clusters) > 30:
            lines.append(f"| ... | | | | _({len(merged_clusters)-30} weitere)_ |")
    else:
        lines.append("_Keine Cross-Quelle-Matches gefunden._")
    lines.append("")
    lines.append("## 3. Initiativen pro Datei (nach Cross-Dedup)")
    lines.append("")
    lines.append("| Datei | Initiativen |")
    lines.append("|---|---|")
    for tag, n in by_file.most_common():
        lines.append(f"| `{tag}` | {n} |")
    lines.append("")
    lines.append("## 4. Verteilung nach Land")
    lines.append("")
    lines.append("| Land | Initiativen |")
    lines.append("|---|---|")
    for c, n in by_country.most_common():
        lines.append(f"| {c} | {n} |")
    lines.append("")
    lines.append("## 5. Verteilung nach Charakter")
    lines.append("")
    lines.append("| Charakter | Initiativen |")
    lines.append("|---|---|")
    for c, n in by_char.most_common():
        lines.append(f"| {c} | {n} |")
    lines.append("")
    lines.append("## 6. Methodik")
    lines.append("")
    lines.append("**Klassen-Trennung:** Einträge mit Type in {Kontrapolis-Artikel, Squat-Artikel, Hausprojekt-Artikel, Wagenplatz-Artikel} sind Hintergrund-Material. Sie werden nicht mit Initiativen dedupliziert.")
    lines.append("")
    lines.append("**URL-Dedup:** Innerhalb jeder Datei: identische `source_url` → ein Eintrag, der reichhaltigste bleibt.")
    lines.append("")
    lines.append("**Cross-Dedup:** Initiativen werden über normalisierten Key `(name, ort)` zusammengeführt. `ort` = city falls vorhanden, sonst region, sonst country. Match-Threshold: exakte Gleichheit nach Normalisierung (lowercase, accent-strip, punct-strip).")
    lines.append("")
    lines.append("**Was NICHT gemacht wurde:** GPS-Anreicherung, Type-Mapping aufs Master-Schema, manuelles Kuratieren. Das ist Handarbeit / OSM und bleibt ein zweiter Schritt.")
    lines.append("")
    lines.append("## 7. Dateien")
    lines.append("")
    lines.append("- `initiativen.jsonl` — deduplizierte Initiativen, ein Eintrag pro einzigartigem Ort")
    lines.append("- `artikel.jsonl` — Hintergrund-Artikel, dedupliziert nach URL")
    lines.append("- `clusters.jsonl` — Audit: alle Cross-Quelle-Cluster mit Quell-URLs")
    lines.append("- `REPORT-dedup.md` — diese Datei")
    lines.append("")
    lines.append("## 8. Cross-Reference: Städte mit Initiativen + Artikel-Geschichte")
    lines.append("")
    lines.append("**Wofür?** Orte, an denen es heute Initiativen gibt UND die historisch in")
    lines.append("Squat/Wagenplatz-Berichten auftauchen — oft die spannendsten Reise-Standorte,")
    lines.append("weil dort Subkultur-Tiefe + aktive Orte zusammentreffen.")
    lines.append("")
    init_stadt = Counter()
    init_stadt_country = {}
    art_stadt = Counter()
    art_stadt_types = defaultdict(set)
    for d in init_final:
        loc = d.get("location") or {}
        c = (loc.get("city") or "").strip().lower()
        if c:
            init_stadt[c] += 1
            init_stadt_country[c] = loc.get("country")
    for d in art_after_url:
        loc = d.get("location") or {}
        c = (loc.get("city") or "").strip().lower()
        if c:
            art_stadt[c] += 1
            art_stadt_types[c].add(d.get("type", "?"))
    both = sorted([(s, init_stadt[s], art_stadt[s]) for s in init_stadt if art_stadt[s] > 0],
                  key=lambda x: -(x[1] + x[2]))
    if both:
        lines.append("| Stadt | Land | Initiativen | Artikel | Artikel-Typen |")
        lines.append("|---|---|---|---|---|")
        for s, i, a in both[:20]:
            land = init_stadt_country.get(s, "?")
            types = ", ".join(sorted(art_stadt_types[s]))
            lines.append(f"| {s.title()} | {land or '?'} | {i} | {a} | {types} |")
        if len(both) > 20:
            lines.append(f"| _..._ | | | | _({len(both)-20} weitere)_ |")
    else:
        lines.append("_Keine Überschneidung gefunden._")

    with open(OUT / "REPORT-dedup.md", "w") as f:
        f.write("\n".join(lines))

    print(f"\n📝 Outputs:")
    print(f"   ├─ {OUT}/initiativen.jsonl  ({len(init_final)} Einträge)")
    print(f"   ├─ {OUT}/artikel.jsonl      ({len(art_after_url)} Einträge)")
    print(f"   ├─ {OUT}/clusters.jsonl     ({len(cluster_log)} Cluster, davon {len(merged_clusters)} mit ≥2)")
    print(f"   └─ {OUT}/REPORT-dedup.md")
    print()

if __name__ == "__main__":
    main()