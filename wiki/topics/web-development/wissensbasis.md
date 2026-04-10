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
