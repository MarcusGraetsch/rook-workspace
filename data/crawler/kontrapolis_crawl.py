#!/usr/bin/env python3
"""
kontrapolis.info Crawler — Erste Nicht-RSS-Quelle für unseren Research-Workflow.

kontrapolis.info = linke Berliner Online-Zeitung (Hoppenhaus).
Hat keinen RSS-Feed. WordPress. SSL verify=False umgeht das Zertifikatsproblem.

Output: JSONL (eine Zeile pro Artikel, append-fähig, einfach zu verarbeiten)
        + Summary als JSON pro Lauf
"""

import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from crawlee.crawlers import BeautifulSoupCrawler, BeautifulSoupCrawlingContext
from crawlee.http_clients import HttpxHttpClient
from crawlee import __version__ as crawlee_version

DATA_DIR = Path(__file__).parent / "output"
DATA_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = DATA_DIR / "kontrapolis_articles.jsonl"
SUMMARY_FILE = DATA_DIR / "kontrapolis_last_run.json"

START_URL = "https://kontrapolis.info/"
MAX_REQUESTS = 60  # 50 Article + 10 Listing Pages

# SSL-Fix: kontrapolis.info Zertifikatsproblem umgehen
http_client = HttpxHttpClient(verify=False)


def is_article_url(url: str) -> bool:
    """kontrapolis.info: Artikel-URLs = /NNNN/ (numerische IDs)."""
    parsed = urlparse(url)
    return bool(re.search(r"/\d{4,}/?$", parsed.path))


async def main() -> None:
    print(f"🔍 kontrapolis-Crawl (Crawlee {crawlee_version})")
    print(f"   Start: {START_URL}")
    print(f"   Limit: {MAX_REQUESTS} Requests")
    print(f"   Output: {OUTPUT_FILE}")
    print()

    crawler = BeautifulSoupCrawler(
        http_client=http_client,
        max_requests_per_crawl=MAX_REQUESTS,
    )

    article_count = 0
    seen_ids: set[str] = set()
    run_started = datetime.now(timezone.utc).isoformat()

    @crawler.router.default_handler
    async def request_handler(ctx: BeautifulSoupCrawlingContext) -> None:
        nonlocal article_count
        url = ctx.request.url
        parsed = urlparse(url)
        path = parsed.path

        # Artikel-Seite
        if is_article_url(url):
            article_id = re.search(r"/(\d+)/?$", path)
            if article_id:
                aid = article_id.group(1)
                if aid in seen_ids:
                    return
                seen_ids.add(aid)

            soup = ctx.soup

            # Content: Finde <div> mit den meisten <p> Tags (heuristisch)
            best_div, best_count = None, 0
            for div in soup.find_all("div"):
                good_ps = [p for p in div.find_all("p", recursive=True)
                           if len(p.get_text(strip=True)) > 30]
                if len(good_ps) > best_count:
                    best_count = len(good_ps)
                    best_div = div

            text_parts = []
            if best_div:
                for p in best_div.find_all("p", recursive=True):
                    txt = p.get_text(strip=True)
                    if txt and len(txt) > 30:
                        text_parts.append(txt)

            full_text = "\n\n".join(text_parts)

            # Meta
            author = None
            for meta_name in ["author", "DC.creator"]:
                m = soup.find("meta", attrs={"name": meta_name})
                if m and m.get("content"):
                    author = m["content"]
                    break

            published = None
            for prop in ["article:published_time", "datePublished", "DC.date.issued"]:
                m = (soup.find("meta", attrs={"property": prop}) or
                     soup.find("meta", attrs={"name": prop}))
                if m and m.get("content"):
                    published = m["content"]
                    break

            # Kategorien / Tags
            categories = [
                c.get_text(strip=True)
                for c in soup.select(".cat-links a, .post-categories a, [rel='tag']")
                if c.get_text(strip=True)
            ]

            data = {
                "id": aid if article_id else None,
                "url": url,
                "title": soup.title.string.strip() if soup.title else None,
                "author": author,
                "published": published,
                "categories": categories,
                "full_text_length": len(full_text),
                "full_text": full_text,
                "crawled_at": datetime.now(timezone.utc).isoformat(),
            }

            # Direkt in JSONL schreiben (kein Crawlee-Dataset nötig)
            with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(data, ensure_ascii=False) + "\n")

            article_count += 1
            chars = len(full_text)
            ctx.log.info(f"📰 #{article_count}: {data['title'][:55] if data['title'] else '?'} ({chars} chars)")

        else:
            # Listing-Seite → Artikel-Links finden und enqueuen
            await ctx.enqueue_links(strategy="same-domain")

    await crawler.run([START_URL])

    run_finished = datetime.now(timezone.utc).isoformat()

    # Summary
    summary = {
        "crawled_at": run_started,
        "finished_at": run_finished,
        "articles_crawled": article_count,
        "requests_made": MAX_REQUESTS,
        "output_file": str(OUTPUT_FILE),
    }
    with open(SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 50)
    print(f"✅ Fertig. {article_count} Artikel → {OUTPUT_FILE}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
