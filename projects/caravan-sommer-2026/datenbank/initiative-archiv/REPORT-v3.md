# Phase-2-Crawler v3 Report — Caravan Sommer 2026

**Datum:** 2026-06-27  
**Zeit-Box:** ~45 Minuten  
**Gesamt-Stand nach dieser Iteration:** 1159 Einträge (vorher: 946)

---

## 1. workaway.info — FUNKTIONIERT ✅

**Status:** Erfolgreich gecrawlt  
**Einträge:** 200  
**Output:** `datenbank/initiative-archiv/workaway/workaway_initiativen.jsonl`  
**Crawler:** `crawler/workaway_crawl.py`

### Was funktioniert
- `/en/hostlist/europe` ist Server-Side-Rendered HTML (keine JS-App)
- Jede Seite hat ~20–25 Host-Einträge
- Pagination via `?Page=N` funktioniert
- Einträge enthalten: Land, Kategorien (Sustainable project, Language exchange, Cultural exchange, Farm, Community…), Titel, Beschreibung, Bewertung, Link

### Länder-Verteilung (Top 10)
| Land | Anzahl |
|------|--------|
| Spain | 36 |
| Italy | 35 |
| France | 29 |
| Germany | 20 |
| Portugal | 14 |
| Ireland | 13 |
| Austria | 7 |
| Norway | 7 |
| Turkey | 6 |
| Greece | 6 |

**DACH-Anteil:** 29/200 (14,5%) — Germany 20, Austria 7, Switzerland 2

### Character-Verteilung
- pragmatisch: 180
- basisdemokratisch: 13
- spirituell: 7

### Top-Beispiele (7 ausgewählt)

1. **Learn from nature at a permaculture farm and food forest in Oberösterreich, Austria**  
   Land: Austria | Activities: Sprach-/Kulturaustausch, Öko-Projekt  
   https://www.workaway.info/en/host/373243549898

2. **Become part of our family and share cultures in Stühlingen, Germany**  
   Land: Germany | Activities: Sprach-/Kulturaustausch, Öko-Projekt  
   https://www.workaway.info/en/host/144493745625

3. **Experience living on a small non-commercial organic farm in Bavaria, Germany**  
   Land: Germany | Activities: Sprach-/Kulturaustausch, Öko-Projekt  
   https://www.workaway.info/en/host/931112637149

4. **Evolving the community project and learning about self sufficiency in Calabria, Italy**  
   Land: Italy | Character: spirituell | Activities: Sprach-/Kulturaustausch, Öko-Projekt  
   https://www.workaway.info/en/host/586964654784

5. **Learn new skills and reconnect with nature in Friedland, Lower Saxony, Germany**  
   Land: Germany | Character: spirituell | Activities: Sprach-/Kulturaustausch  
   https://www.workaway.info/en/host/758754681886

6. **House / pet sitting (Portugal)**  
   Land: Portugal | Activities: Sprach-/Kulturaustausch  
   https://www.workaway.info/en/host/615968867176

7. **Language exchange, nature & farming in the Cantabrian Mountain, Spain**  
   Land: Spain | Activities: Sprach-/Kulturaustausch, Öko-Projekt  
   https://www.workaway.info/en/host/613216326211

### Bekannte Bugs / Limitierungen
- **Stadt-Extraktion ist unzuverlässig:** Der Parser versucht, Städte aus dem Titel zu extrahieren (Regex `in [City], [Country]`), aber viele Titel haben keine explizite Stadtangabe → `city` ist oft `null`.
- **Beschreibung wird auf 800 Zeichen gekürzt:** Die Listenansicht zeigt sowieso nur einen Auszug, daher keine vollständige Beschreibung.
- **Keine Email/Phone:** Die Listenansicht enthält keine Kontaktdaten; dafür müsste man in jeden Host-Link gehen (kostet Zeit und Requests).
- **Keine Verifizierung:** Es gibt keine Garantie, dass alle Einträge noch aktiv sind (Workaway zeigt "Updated" / "Last minute" Badges, die aber nicht geparst werden).
- **Rating-Parsing:** `(88)`-Bewertungen werden manchmal als Textzeile erkannt, manchmal nicht — je nach HTML-Struktur.

---

## 2. wwoof.net / wwoof.de — BLOCKIERT ❌

**Status:** Technisch nicht scrapbar mit schneller Pipeline  
**Einträge:** 0

### Warum blockiert
- **Ember.js Single-Page-Application:** Alle WWOOF-Seiten (wwoof.de, wwoof.net, wwoof.nl, wwoofindependents.org) verwenden die gleiche Ember-App.
- **Cloudflare Turnstile:** `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js">` — CAPTCHA/Challenge.
- **Server-Side-HTML ist leer:** Der `<body>` enthält nur die Ember-Root-Container, keinen Content. Alles wird via JS und API-Calls (`https://api.wwoof.net/api/...`) gerendert.
- **API braucht Auth-Token:** Die API-Endpoints (`api.wwoof.net/api/tokens`) erfordern Login/Registrierung.

### Versuchte Workarounds
- Direkte `curl` auf `wwoof.de/de/host/12855` → leerer Body
- `wwoof.net` → gleiche Ember-App
- `wwoofindependents.org` → gleiche Ember-App
- `wwoof.nl` → gleiche Ember-App

### Empfohlene nächste Schritte (nicht in dieser Iteration)
- Browser-Automation mit Playwright/Selenium (kostet viel Zeit, Ressourcen)
- Prüfen, ob es eine öffentliche API-Dokumentation gibt (nicht ersichtlich)
- WWOOF-Host-Listen von nationalen Organisationen anfragen (nicht automatisierbar)

---

## 3. gen-europe.org — TEILWEISE FUNKTIONIERT ⚠️

**Status:** Einzel-Ökodörfer nicht scrapbar, aber nationale Netzwerke funktionieren  
**Einträge:** 13 (Netzwerke)  
**Output:** `datenbank/initiative-archiv/gen-europe-networks/gen_europe_networks.jsonl`  
**Crawler:** `crawler/gen_europe_networks_crawl.py`

### Was funktioniert
- WordPress REST API (`wp-json/wp/v2/geneunetworks`) liefert 13 nationale GEN-Netzwerke
- Jeder Eintrag hat: Name, Beschreibung, Link, teilweise Email/Website im Content
- Crawler: `requests` + `BeautifulSoup` für Content-Parsing

### Warum die Einzel-Ökodörfer nicht funktionieren
- **Ecovillage Directory & Map:** Beide Seiten laden ihre Daten via JavaScript (Map-Plugin, vermutlich "OneTap" oder ähnliches). Das 557KB-Script-Tag enthält Konfiguration, aber keine statischen Marker-Daten.
- **Keine WP REST-Route für Einzel-Ökodörfer:** Es gibt keinen Custom Post Type für Einzel-Ökodörfer in der API (nur `geneunetworks`, `pages`, `posts`).
- **Kein iframe/embed mit externer Datenquelle:** Die Map ist ein reines JS-Widget.

### Top-Beispiele (5 Netzwerke)

1. **GEN Ukraine** — Land: UA | 60+ Ökodörfer in der Ukraine  
   https://gen-europe.org/geneunetworks/gen-ukraine/

2. **ERO – Ekobyarnas Riksorganisation** (Schweden)  
   https://gen-europe.org/geneunetworks/ero-ekobyarnas-riksorganisation/

3. **GEN-Russia**  
   https://gen-europe.org/geneunetworks/gen-russia/

4. **SKEY / GEN-Finland**  
   https://gen-europe.org/geneunetworks/skey-suomen-kestavan-elamantavan-yhteisot-or-gen-finland/

5. **GEN-Suisse** — Land: CH | Selbstidentifiziert als „community of communities"  
   https://gen-europe.org/geneunetworks/gen-suisse/

### Bekannte Bugs / Limitierungen
- **Nur 13 Einträge:** Nationale Netzwerke, keine Einzel-Ökodörfer.
- **Country-Parsing aus Titel:** Manchmal falsch (z.B. „GEN-Suisse" wird nicht als CH erkannt, weil das Mapping nicht vollständig ist).
- **Beschreibung ist oft langer Vision-Text:** Nicht immer praktisch für die Suche nach „Bleib gegen Arbeit".

---

## Zusammenfassung

| Quelle | Status | Einträge | DACH-Anteil | Bemerkung |
|--------|--------|----------|-------------|-----------|
| workaway.info | ✅ Fertig | 200 | 14,5% | Roh-Pipeline stabil, 10 Seiten gecrawlt |
| wwoof.de/net | ❌ Blockiert | 0 | — | Ember SPA + Cloudflare Turnstile |
| gen-europe.org | ⚠️ Teils | 13 | ~15% | Nur Netzwerke via WP-API; Einzel-Ökodörfer JS-Map |

### Neue Dateien
- `crawler/workaway_crawl.py`
- `crawler/gen_europe_networks_crawl.py`
- `datenbank/initiative-archiv/workaway/workaway_initiativen.jsonl`
- `datenbank/initiative-archiv/gen-europe-networks/gen_europe_networks.jsonl`

### Gesamt-Stand
- **Vorher:** 946 Einträge (contraste 21, kontrapolis 45, netzwerk-oekodorf 25, wohnprojekte-portal 771, squat-net 84)
- **Neu:** +213 Einträge
- **Nachher:** 1159 Einträge

### Empfohlene nächste Schritte
1. **WWOOF:** Wenn unbedingt benötigt, Browser-Automation (Playwright) mit Login — aber das ist ein eigener Task.
2. **GEN-Europe Einzel-Ökodörfer:** Prüfen, ob die Map-Daten über eine andere URL (z.B. `maps.hitchwiki.org`-ähnlich) oder eine JSON-Datei erreichbar sind. Eventuell die Map-Seite mit einem Headless-Browser laden und die Netzwerk-Requests abfangen.
3. **Workaway DACH-Filter:** Statt `europe` zu crawlen, könnte man die Hostliste nach Germany/Austria/Switzerland filtern, um mehr DACH-Einträge zu bekommen.
