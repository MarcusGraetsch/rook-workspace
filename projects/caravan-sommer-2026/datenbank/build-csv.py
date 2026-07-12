#!/usr/bin/env python3
"""Build CSV mirror from orte.jsonl per schema spec.

Spaltenreihenfolge (from schema.md):
id,name,types,country,region,city,address,lat,lon,description,tags,contact.url,contact.email,source,verified,added,last_checked

- Lists (types, tags) joined with '|'
- contact.* flattened to contact.url, contact.email
- Empty cells for null values
- UTF-8 with BOM for Excel compatibility
"""
import csv
import json
from pathlib import Path

ROOT = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank")
INPUT = ROOT / "orte.jsonl"
OUTPUT = ROOT / "orte.csv"

COLUMNS = [
    "id", "name", "types", "country", "region", "city", "address",
    "lat", "lon", "description", "tags", "contact.url", "contact.email",
    "source", "verified", "added", "last_checked",
]

LIST_SEP = "|"


def fmt(v):
    """Format a value for CSV. None → empty string."""
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, list):
        return LIST_SEP.join(str(x) for x in v)
    if isinstance(v, float):
        return f"{v:.6f}"
    return str(v)


def main():
    print(f"📂 Load: {INPUT}")
    with open(INPUT) as f:
        entries = [json.loads(line) for line in f if line.strip()]
    print(f"   Total: {len(entries)}")

    # Sort: country first (alphabetical), then city, then name
    entries.sort(key=lambda e: (
        e.get("country") or "ZZ",
        e.get("region") or "",
        e.get("city") or "",
        e.get("name") or "",
    ))

    print(f"💾 Write: {OUTPUT}")
    with open(OUTPUT, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(COLUMNS)
        for e in entries:
            contact = e.get("contact") or {}
            row = [
                fmt(e.get("id")),
                fmt(e.get("name")),
                fmt(e.get("types")),
                fmt(e.get("country")),
                fmt(e.get("region")),
                fmt(e.get("city")),
                fmt(e.get("address")),
                fmt(e.get("lat")),
                fmt(e.get("lon")),
                fmt(e.get("description")),
                fmt(e.get("tags")),
                fmt(contact.get("url")),
                fmt(contact.get("email")),
                fmt(e.get("source")),
                fmt(e.get("verified")),
                fmt(e.get("added")),
                fmt(e.get("last_checked")),
            ]
            writer.writerow(row)

    # Quick stats
    import os
    size_kb = os.path.getsize(OUTPUT) / 1024
    print(f"   Size: {size_kb:.0f} KB")
    print(f"   Columns: {len(COLUMNS)}")
    print(f"\n✓ CSV ready for spreadsheet import (Excel, LibreOffice, Numbers)")


if __name__ == "__main__":
    main()
