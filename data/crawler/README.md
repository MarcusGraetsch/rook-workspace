# data/crawler/

Research-Crawler für Quellen ohne RSS. Ergänzt (nicht ersetzt) den blogwatcher-RSS-Workflow.

## Wann benutzen

RSS-Workflow (`blogwatcher`) → Daily-Monitoring, Übersicht, Scannen.
Crawler → Tiefenrecherche, Volltext, Quellen ohne RSS, archivieren.

## Standorte

- `kontrapolis_crawl.py` — Erste Nicht-RSS-Quelle (linke Berlin-Zeitung Hoppenhaus)
- `crawlee_venv/` — Python venv mit `crawlee[beautifulsoup,sql_sqlite]` (lokal)
- `output/` — Crawlee-Output (SQLite, Datasets)

## Setup (lokal)

```bash
cd /root/.openclaw/workspace/data/crawler
python3 -m venv crawlee_venv
source crawlee_venv/bin/activate
pip install 'crawlee[beautifulsoup,sql_sqlite]'
```

## Konventionen

- **Nicht im Cron** — Crawler ist Recherche-Tool, nicht Daily-Monitor
- **SSL verify=False** ist OK für lokale Recherche (nicht für Produktion)
- **Output-Format:** SQLite (lokal, persistent, querybar)
- **Code-Stil:** Python 3.10+, type-hints, async/await

## Quellen

| Quelle | Status | RSS-Alternative | Crawlee-Script |
|--------|--------|----------------|----------------|
| kontrapolis.info | ✅ aktiv | keine | `kontrapolis_crawl.py` |
| netzpolitik (Tiefenrecherche) | geplant | ja (blogwatcher) | tbd |

## Wartung

- Bei SSL-Fehlern: `http_client.client_kwargs['verify'] = False` (siehe kontrapolis_crawl.py)
- Bei JS-heavy Sites: `PlaywrightCrawler` statt `BeautifulSoupCrawler` nötig
- Bei Paywall: gar nicht — RSS oder Spezial-Services
