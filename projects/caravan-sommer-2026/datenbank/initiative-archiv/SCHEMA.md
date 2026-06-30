# Initiative-Schema (Phase 2 Crawler)

Version 0.1 — 2026-06-27 — Roh-Pipeline, kein Master-Schema.

Dieses Schema gilt **nur für den Initiative-Archiv-Rohoutput** der Crawler.
Es ist **breiter** als das Master-Schema in `datenbank/schema.md` (welches
für die kuratierten `orte.jsonl`-Einträge gilt), weil Crawler-Output
heterogen ist und Anreicherung oft erst in einem zweiten Schritt passiert.

Beim Merge in `orte.jsonl` wird dann auf das Master-Schema projiziert.

## Eintrag-Format (JSONL, eine Zeile pro Eintrag)

```json
{
  "name": "string",
  "type": "string (siehe Type-Lexikon unten)",
  "types": ["array", "von", "type-keys"],
  "location": {
    "region": "string | null (z.B. 'Kärnten', 'Brandenburg')",
    "city": "string | null",
    "address": "string | null",
    "country": "ISO-3166-1-alpha-2 | null"
  },
  "contact_url": "string | null",
  "contact_email": "string | null",
  "contact_phone": "string | null",
  "character": "string | null (linkspolitisch | spirituell | pragmatisch | öko | anarchistisch | basisdemokratisch | ...)",
  "cost": "string | null (kostenlos | tausch | billig | normal | spendenbasis)",
  "activities": ["array", "von", "strings"],
  "description": "string (1-5 Sätze aus Quelle)",
  "issue_ref": "string | null (z.B. 'CONTRASTE Nr. 502-503, Juli-August 2026')",
  "event_date": "string | null (YYYY-MM-DD oder YYYY-MM-DD..YYYY-MM-DD)",
  "source": "string (z.B. 'contraste.org/kleinanzeigen')",
  "source_url": "string (exakte Quell-URL)",
  "scraped_at": "ISO-8601 timestamp"
}
```

## Type-Lexikon (wächst mit jedem Crawl)

Crawler schreibt erstmal einen **frei-text type** rein (z.B. "Solawi",
"Ökodorf", "Hausprojekt"). Beim Merge in `orte.jsonl` wird gegen die
Master-Taxonomie gemappt.

**Roh-Type-Beispiele (contraste.org):**
- `Solawi` → `csa-farm`
- `Ökodorf` → `ecovillage`
- `Kommune` / `Wohngemeinschaft` → `intentional-community`
- `Hausprojekt` / `Wohnprojekt` → `housing-project`
- `Repair-Café` → `repair-cafe`
- `Umsonstladen` → `free-store`
- `Transition Town` → `transition-town`
- `Festival` / `Camp` → `festival`
- `Gedenkort` / `Gedenkstätte` → `memorial-site`
- `Selbsthilfewerkstatt` → `repair-cafe`
- `Soziales Zentrum` → `social-center`
- `Bildungsinitiative` → `meeting-space` oder neues `education-project`
- `Workaway-Hof` / `Wwoofing-Hof` → `wwoof-farm`

**Roh-Type-Beispiele (kontrapolis.info):**
- `Antimilitarismus` → thematisch (kein Ort-Typ)
- `Repression` → thematisch
- `Wagenplatz` → `intentional-community`
- (kontrapolis-Artikel sind oft thematisch, nicht ortsbezogen — daher
  wandern viele Einträge NICHT in `orte.jsonl`, sondern bleiben im
  Kontrapolis-Archiv als Hintergrundmaterial)

## Pflichtfelder (minimum viable record)

- `name` (oder Anzeige-Ersatz, z.B. "unbekannt" wenn nicht lesbar)
- `source` + `source_url` (ohne Quelle = kein Eintrag)
- `scraped_at`

Alles andere ist "best effort". Leere Felder = `null`, **nicht** leerer String.

## Was NICHT in diesem Schema steht

- `id` — wird beim Merge vergeben (kebab-case slug)
- `lat` / `lon` — GPS-Verifikation ist Handarbeit / OSM
- `verified` — wird beim Merge auf `false` gesetzt
- `tags` — werden beim Anreichern vergeben (siehe Master-Schema-Tags)
- `added` / `last_checked` — werden beim Merge gesetzt

## Konventionen

- **Geodaten ohne Berlin-Bias**: kontrapolis.info ist Berliner Zeitung,
  contraste.org hat einen AT/CH/DE-Mix mit starkem Österreich-Schwerpunkt.
  Beim Crawlen bewusst NICHT auf "Berlin" filtern.
- **Sprache**: Originalsprache der Quelle. contraste.org = deutsch,
  kontrapolis.info = deutsch.
- **Duplikate**: Crawler dedupliziert nur exakte URL-Treffer innerhalb
  eines Source-Laufs. Cross-Source-Deduplication ist Merge-Aufgabe.
- **Ad-Block / Cookie-Banner**: contraste.org hat Cookie-Banner — wird
  ignoriert, weil keine Interaktion nötig (nur GET).
- **SSL**: contraste.org = gültig, kontrapolis.info = Zertifikat broken
  → Crawler muss `verify=False` (wie im Original-Script).