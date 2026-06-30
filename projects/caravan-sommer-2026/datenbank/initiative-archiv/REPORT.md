# Phase-2-Crawler Report — Erste Iteration

**Datum:** 2026-06-27
**Scope:** Validierung der Pipeline, 2 Quellen getestet, 5–20+ echte Einträge
**Status:** Pipeline funktioniert. Roh-Output vorhanden, weitere Iteration nötig.

---

## Was funktioniert

### contraste.org ✅

- **21 Einträge extrahiert** (4 Kleinanzeigen + 17 Termine)
- **Laufzeit:** ~1,2 Sekunden für 2 HTTP-Requests
- **Output:** `datenbank/initiative-archiv/contraste/contraste_initiativen.jsonl`
- **Schema-Felder-Abdeckung:** 81% Adresse, 81% City, 72% Region, 72% Country, 19% Email (nur Kleinanzeigen), 76% URL
- **Beispiele extrahiert:**
  - Kleinanzeige "Mitmacher:innen gesucht" (MiMaMarkt Klagenfurt, AT) → `hallo@mimamarkt.at`, Kärnten
  - Kleinanzeige "ZEGG-Gemeinschaft/Ökodorf sucht Mitwirkende" → `geschaeftsfuehrung@zegg.de`, Bad Belzig/Brandenburg
  - Kleinanzeige "Künstlerin unterstützt bei Kreativität und Gartengestaltung" (Anna Magnet) → `+43 676 3866441`, Maria Elend/Kärnten
  - Termine "Svobodni! Befreit!" (Klagenfurt), "Alpine Peace Crossing" (Salzburg–Südtirol), "Kollapscamp" (Wittstock), "System Change Camp" (Frankfurt), etc.

### kontrapolis.info ✅

- **45 Einträge extrahiert** (gleiche Größenordnung wie Original-Crawler)
- **Laufzeit:** ~12 Sekunden für 60 Requests
- **Output:** `datenbank/initiative-archiv/kontrapolis/kontrapolis_initiativen.jsonl`
- **Davon initiativen-bezogen:** 4/45 Artikel (Hausprojekt × 2, Wagenplatz × 1, Squat × 1)
- **Themen-Top:** Repression und Knast (9), Repression (6), Solidarität (5), Überwachung (5), Anarchismus (4)

### Pipeline-Aspekte ✅

- **Wiederverwendung:** Crawlee + BeautifulSoup + JSONL-Pattern vom
  Original-Kontrapolis-Crawler (`/root/.openclaw/workspace/data/crawler/`)
  wurde 1:1 übernommen.
- **Venv:** gemeinsam genutzt (`/root/.openclaw/workspace/data/crawler/crawlee_venv`)
- **Output-Format:** JSONL, eine Zeile pro Eintrag (append-fähig)
- **CLI:** `--source {contraste|kontrapolis|all}`, `--max-requests N`

---

## Was nicht funktioniert / Bugs

### contraste.org

1. **Type-Heuristik ist Keyword-basiert** — False positives möglich:
   - "Energiegemeinschaft" → wurde fälschlich als "Energieprojekt" erkannt
     (MiMaMarkt macht mehr als Energie). Behoben durch Verschärfung auf
     Compound-Begriffe.
   - "freiwillige Spenden" → wurde fälschlich als "Wwoofing-Hof" erkannt
     (Anna Magnet). Behoben durch Ausschluss von "freiwillig" alleine.
2. **Event-Date-Parsing deaktiviert** — Regex war zu unzuverlässig in
   erster Iteration (mehrdeutige Formate: "19. und 20. Juni",
   "29. Juni bis 03. Juli", "02. Juli, 19:00"). Platzhalter `None`.
   **TODO:** Eigene `parse_german_date_range(body)`-Funktion mit
   Monatsmapping.
3. **Location-Region nur DACH** — Funktioniert für DE/AT/CH, sonst `null`.
   **TODO:** Länder-Mapping erweitern (FR/IT/NL) + Region-Detection für
   ausländische Quellen.
4. **Pagination fehlt** — contraste.org Kleinanzeigen-Seite zeigt nur
   aktuellste Anzeigen, ältere Anzeigen verschwinden. Archiv-Sicht nötig
   via `/online-archiv/` oder `/kategorie/<slug>/`.

### kontrapolis.info

1. **Nur 4/45 initiativen-bezogen** — Rest sind thematische Artikel
   (Repression, Antimilitarismus, Antifaschismus). Brauchbar als
   **Hintergrundmaterial**, nicht als primäre Initiative-Quelle.
2. **Location-Extraktion fast immer leer** — kontrapolis-Artikel
   erwähnen Orte, aber Adressen sind selten strukturiert. Heuristik
   versagt bei "in Berlin" vs. "in Hamburg" weil die Artikel zu
   viele Städte nennen.
3. **Mention-Heuristik zu grob** — nur 12 Keywords. Echtes NLP würde
   z.B. "Hausprojekt" von "Wagenplatz-Initiative" unterscheiden.

### Allgemein

1. **Bit.ly-URLs werden gemerkt** aber im Code als "weniger wertvoll"
   aussortiert. Tatsächlich sind sie oft die einzige URL in Termine-
   Anzeigen — beim Anreichern lohnt es sich, sie aufzulösen (HEAD-
   Request).
2. **Keine Cross-Source-Deduplication** — gleiche Initiative in
   contraste + kontrapolis → 2 Einträge. Merge-Schritt fehlt.
3. **Keine GPS-Extraktion** — bewusst weggelassen (Braucht OSM/Nominatim).
4. **Keine Verifikation** — `verified: false` muss beim Anreichern
   gesetzt werden (siehe Master-Schema).

---

## Nächste Quellen (Priorisierung)

### Leicht zu scrapen (⭐⭐⭐) — direkt angehen

| URL | Typ | Erwartete Records | Begründung |
|-----|-----|------------------|------------|
| `https://gen-europe.org/ecovillage-and-network-directory/` | Verzeichnis | 50–200 | Master-Liste aller europäischen Ökodörfer, strukturiertes HTML, ideal |
| `https://www.netzwerk-oekodorf.de/` | Verzeichnis | 20–50 | DACH-Ökodörfer mit Adresse, Kontakt, GPS — direkt in DB |
| `https://www.wohnprojekte-portal.de/` | Verzeichnis | 100–300 | DE-Wohnprojekte, strukturiert nach Stadt, GPS oft vorhanden |
| `https://www.repaircafe.org/` | Verzeichnis | 50–100 (DE-Anteil) | Repair-Cafés weltweit, Filter auf DE möglich |
| `https://www.squat.net/` | Verzeichnis | 100+ | Internationale Squats/Wagenplätze, ähnliche Struktur wie contraste |

### Komplex (⭐⭐) — brauchen mehr Aufwand

| URL | Typ | Schwierigkeit | Begründung |
|-----|-----|---------------|------------|
| `https://urgenci.net/` | Verzeichnis | JS-heavy, lazy-load | CSA/Solawi-Netzwerk, schöne Karte, aber dynamisch |
| `https://www.workaway.info/` | DB | Login-Wall | Größte Workaway-Plattform, viele DE/FR-Höfe, aber Login nötig |
| `https://wwoof.de/host-suche/` (Wwoof Deutschland) | Verzeichnis | Login-Wall | Wwoofing-Höfe DE-only, ggf. öffentliche Teilliste |
| `https://www.noblogs.org/` (Verzeichnis) | Aggregator | viele Subdomains | Indymedia-Ableger, viele Initiativen, komplexe Struktur |
| `https://de.indymedia.org/` | Wire-Service | sehr chaotisch | Termine + Berichte, viel Lärm, braucht starke Filter |
| `https://www.lemonde diplomatique.de/` (Termine) | Verzeichnis | monolingual frz. | Gute FR-Initiativen, aber nur FR-Text |

### Sehr komplex (⭐) — später

| URL | Typ | Schwierigkeit |
|-----|-----|---------------|
| `https://www.openstreetmap.org/` (Overpass API) | DB | Sehr ergiebig, aber Overpass-Query nötig |
| `https://www.kartevonmorgen.org/` | Karte | JSON-API verfügbar, gute Datenqualität |
| `https://www.mitwelten.org/` | Verzeichnis | Transition Towns + Reparatur-Initiativen |
| `https://www.gesellschaftsarchiv.de/` | Archiv | Mietshäuser Syndikat Liste, PDF-Listen |
| Wikipedia-Listen (DE/EN) | Listen | statisch, gut strukturiert, aber Referenz-Listen (Megalith, Kommunen, etc.) |

### PDF-basiert (Phase 1 Backup, noch im Repo)

- `contraste-archiv/texts/` enthält 53 extrahierte contraste-PDFs als
  LLM-Extraktion-Pool. Wenn Crawler mau wird, kann LLM-Extraktion
  aushelfen (siehe MEMORY.md Notiz zu Phase 1).

---

## Konkrete Empfehlung für nächste Iteration

**Top 3 für nächste Subagent-Runde:**

1. **`netzwerk-oekodorf.de`** — direkt in orte.jsonl-masterbar, DACH-Fokus,
   strukturiertes HTML, ca. 30–50 Einträge, niedrig hängende Frucht.
2. **`gen-europe.org/ecovillage...`** — Europa-weit, ideal für Phase 2
   (Tier-1-Regionen + Tier-2), strukturiertes HTML, ca. 100 Einträge.
3. **`squat.net`** — passt zum kontrapolis-Profil (linkspolitisch),
   internationale Squats, ähnliche Struktur wie contraste-Kleinanzeigen.

Diese 3 ergeben zusammen vermutlich 150–250 neue Datenbank-Einträge in
einer Iteration — genug für die Reiseplanung Sommer 2026.

---

## Pfade / Dateien

| Datei | Zweck |
|-------|-------|
| `crawler/initiative_crawl.py` | Haupt-Script (Crawlee + BeautifulSoup) |
| `crawler/README.md` | Setup + Verwendung |
| `datenbank/initiative-archiv/SCHEMA.md` | Roh-Output-Schema (breiter als Master) |
| `datenbank/initiative-archiv/contraste/*.jsonl` | 21 contraste-Einträge |
| `datenbank/initiative-archiv/kontrapolis/*.jsonl` | 45 kontrapolis-Artikel |
| `datenbank/initiative-archiv/REPORT.md` | Diese Datei |

## Nächste Schritte (für Rook)

1. Merge contraste-Einträge in `orte.jsonl` (Type-Mapping: Roh-Type → Master-Type)
2. Manuelle Verifikation der Top-5 (GPS checken, E-Mails gegen Webseite prüfen)
3. Subagent für gen-europe.org + netzwerk-oekodorf.de starten
4. Event-Date-Parsing in `build_contraste_record` nachziehen
5. Bei Bedarf: `parse_german_date_range()` als Helper-Funktion extrahieren