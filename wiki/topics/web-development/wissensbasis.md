# Web Development — Praxiswissen

## Überblick

NGINX, Web Scraping, HTML/Markdown, Apache Superset, DNS.

## NGINX Ingress

### Häufige Fehler

| Fehler | Lösung |
|--------|--------|
| 404 Not Found | Path / Ingress Config prüfen |
| Connection Refused | Service Name / Port prüfen |
| SSL Handshake Failed | TLS Zertifikat prüfen |
| upstream timed out | Timeout erhöhen |

```bash
# NGINX Ingress Logs
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller
kubectl describe ingress <name> -n <namespace>
```

## Web Scraping

```python
import requests
from bs4 import BeautifulSoup

url = "https://example.com"
response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
soup = BeautifulSoup(response.text, 'html.parser')

title = soup.find('title').text
links = [a['href'] for a in soup.find_all('a', href=True)]
```

## Markdown zu HTML

```python
import markdown
md_text = "# Überschrift\n**fett** und *kursiv*."
html = markdown.markdown(md_text, extensions=['tables', 'fenced_code'])
```

## DNS

| Anbieter | Kosten |
|---------|--------|
| Freenom | Kostenlos (.tk) — nicht mehr verfügbar |
| EU.org | Kostenlos |
| GitHub Pages | Kostenlos |

## Apache Superset

```sql
-- Beispiel: Verkäufe nach Monat
SELECT DATE_TRUNC('month', order_date) as month, SUM(amount) as total_sales
FROM orders GROUP BY DATE_TRUNC('month', order_date) ORDER BY month
```

## Relevant Conversations

- `NGINX Ingress Validation Fix..md`
- `Web Scraper.md`
- `Markdown HTML conversion.md`

## Working-Notes.org Deployment Pipeline

*Stand 2026-07-26 — Marcus' statische Blog-/Projekt-Site*

### Stack

- **Static Site Generator:** Eleventy (11ty) v3.x via `npx @11ty/eleventy`
- **Frontend-Karten:** Leaflet (OpenStreetMap-Tiles)
- **Hosting:** IONOS Webspace (`access-5019640593.webspace-host.com`)
- **DNS + CDN:** Cloudflare (Proxy davor)
- **Live-URL:** https://working-notes.org/
- **Repo:** `github.com/MarcusGraetsch/working-notes` (Branch: `master`, **Codex-managed** — Rook fasst es nicht an)
- **Vergangenheit:** vormals `marcus-cyborg`, nach 2026-03-26 umbenannt

### Build & Deploy

```bash
# Lokal bauen
cd /root/repos/working-notes
npx @11ty/eleventy --serve           # Dev-Server mit Watch

# Production-Build
npx @11ty/eleventy                   # Generiert _site/

# Deploy via rsync
rsync -avz --delete _site/ \
  user@access-5019640593.webspace-host.com:/path/to/webroot/
```

### Pipeline-Lessons (gesammelt)

- **Cache-Buster Convention:** Bei Updates hartnäckiger Browser-Caches eine `?v=YYYY-MM-DD`-Query anhängen, z.B. `data.js?v=2026-07-25`. Erst nach Strg+Shift+R testen, ob der Browser wirklich neu lädt.
- **Leaflet-Routen-Linie** ist **die** Stolperfalle: ohne korrekte `[lat, lon]`-Paar-Reihenfolge in der Route-Property wird die Linie unsichtbar gezeichnet. Daten-Source immer zuerst `console.log()` der Route-Property.
- **Cloudflare → IONOS:** CF ist nur Proxy. Origin ist IONOS-Webspace, daher kein Edge-Caching der HTML-Seiten, sondern rsync-Deploy + Browser-Cache. Cache-Buster ist daher PFLICHT.
- **Große data.js (>20 KB)** kann build-time slow werden. Wenn >50 KB, dann splitten in `data-region-1.js` etc.

### Aktive Projekte auf working-notes.org

- **FLYERALARM-Showcase** (letzter Post 2026-07-01) — Print-Pipeline-Doku
- **Ostsee-Tour 2026-Karte** (`/ostsee-tour/` → `/ostsee-tour-embed/`) — Leaflet-Karte mit 41 Routenpunkten, 27 Campingplätzen, 8 Stellplätzen, 5 Bade-Stops, 13 Sehenswürdigkeiten, 3 Festivals. Quelle: `data.js` (24649 bytes). Cache-Buster `?v=2026-07-25`.

### Repo-Boundary (wichtig)

- **Rook fasst `working-notes/` NICHT an** — Marcus' Codex-Workspace (2026-07-19 explizit). Bei Bedarf: nur im Wiki dokumentieren, nicht committen.
- **Rook darf** working-notes-URLs im Wiki/Wissen referenzieren, deployen jedoch nur Codex.

## Cross-References

- → [[networking]] — HTTP, DNS, Cloudflare-Proxy
- → [[cloud-kubernetes]] — Web-Apps auf K8s (für Vergleich mit static-site)
- → [[personal-travel]] — Ostsee-Tour-Karte (Use-Case-Beispiel)

