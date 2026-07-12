#!/usr/bin/env python3
"""Merge all 5 enriched output files + dedup → master_initiativen.jsonl"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

DEDUP_DIR = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup")

def discover_inputs():
    """Auto-discover all output_*.jsonl files in DEDUP_DIR, sorted."""
    files = sorted(DEDUP_DIR.glob("output_*.jsonl"))
    return [(f.name, f.stem.replace("output_", "").replace("_", "/")) for f in files]


INPUT_FILES = discover_inputs()

OUTPUT_MASTER = DEDUP_DIR / "master_initiativen.jsonl"
OUTPUT_REPORT = DEDUP_DIR.parent / "MERGE_REPORT.md"


def norm_url(u):
    if not u:
        return None
    u = u.strip().lower()
    u = re.sub(r"^https?://", "", u)
    u = u.rstrip("/")
    return u or None


def norm_email(e):
    if not e:
        return None
    return e.strip().lower() or None


def norm_addr(a):
    if not a:
        return ""
    a = a.lower().strip()
    a = re.sub(r"[\s,]+", " ", a)
    return a


def norm_name(n):
    if not n:
        return ""
    n = n.lower().strip()
    n = re.sub(r"[^a-z0-9äöüß ]+", "", n)
    n = re.sub(r"\s+", " ", n)
    return n[:30].strip()  # first 30 chars for fuzzy


def norm_city(c):
    if not c:
        return ""
    return c.lower().strip()


def load_all():
    entries = []
    src_counter = Counter()
    for fn, src_label in INPUT_FILES:
        path = DEDUP_DIR / fn
        if not path.exists():
            print(f"⚠️  Missing: {fn}")
            continue
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                except json.JSONDecodeError as ex:
                    print(f"⚠️  Bad JSON in {fn}: {ex}")
                    continue
                e["_orig_file"] = fn
                e["_orig_source_label"] = src_label
                entries.append(e)
                src_counter[src_label] += 1
    return entries, src_counter


def dedup(entries):
    """Dedup by: contact_url, contact_email, name+city, address (in priority order).
    First occurrence wins; later duplicates are merged (add to sources list)."""
    canonical = {}  # key -> entry
    duplicates = []  # list of (canonical_key, dup_entry, reason)
    by_key_count = Counter()

    def key_url(e):
        return ("url", norm_url(e.get("contact_url")))

    def key_email(e):
        return ("email", norm_email(e.get("contact_email")))

    def key_name_city(e):
        loc = e.get("location") or {}
        return ("name_city", norm_name(e.get("name")), norm_city(loc.get("city")))

    def key_addr(e):
        loc = e.get("location") or {}
        return ("addr", norm_addr(loc.get("address")))

    for e in entries:
        placed = False
        # Try each key in priority order
        for key_fn in [key_url, key_email, key_name_city, key_addr]:
            k = key_fn(e)
            if k[0] == "email" and not k[1]:
                continue
            if k[0] == "url" and not k[1]:
                continue
            if k[0] == "addr" and not k[1]:
                continue
            if k[0] == "name_city" and (not k[1] or not k[2]):
                continue
            if k in canonical:
                # Merge into canonical
                can = canonical[k]
                # Add source
                src = e.get("_orig_source_label")
                if src not in [s.get("file") for s in can.get("sources", [])]:
                    can.setdefault("sources", []).append({
                        "file": e["_orig_file"],
                        "url": e.get("source_url") or e.get("contact_url"),
                        "scraped_at": e.get("scraped_at"),
                    })
                # Prefer non-null fields from either
                if not can.get("contact_email") and e.get("contact_email"):
                    can["contact_email"] = e["contact_email"]
                if not can.get("contact_phone") and e.get("contact_phone"):
                    can["contact_phone"] = e["contact_phone"]
                if not can.get("description") and e.get("description"):
                    can["description"] = e["description"]
                # Add orig_file
                can.setdefault("_orig_files", []).append(e["_orig_file"])
                by_key_count[k[0]] += 1
                duplicates.append((k, e, k[0]))
                placed = True
                break
        if not placed:
            # New canonical entry
            k = ("fallback", e.get("name", ""), len(canonical))
            canonical[k] = e
            e.setdefault("_orig_files", [e["_orig_file"]])
            # Ensure sources has at least the origin
            if not e.get("sources"):
                e["sources"] = [{
                    "file": e["_orig_file"],
                    "url": e.get("source_url") or e.get("contact_url"),
                    "scraped_at": e.get("scraped_at"),
                }]

    return list(canonical.values()), duplicates, by_key_count


def write_master(entries):
    OUTPUT_MASTER.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_MASTER, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")


def write_report(total_in, total_out, duplicates, by_key_count, src_counter, by_country, by_character):
    lines = [
        "# Merge Report — Caravan-Sommer-2026",
        "",
        f"**Generated:** 2026-07-07",
        "",
        "## Counts",
        "",
        f"- Total entries (input): **{total_in}**",
        f"- Unique entries (output): **{total_out}**",
        f"- Duplicates merged: **{len(duplicates)}** ({100 * len(duplicates) / max(total_in, 1):.1f}%)",
        "",
        "## Dedup match reasons",
        "",
    ]
    for k, n in by_key_count.most_common():
        lines.append(f"- {k}: {n}")
    lines += [
        "",
        "## Source distribution (input)",
        "",
    ]
    for s, n in src_counter.most_common():
        lines.append(f"- {s}: {n}")
    lines += [
        "",
        "## Country distribution (unique output)",
        "",
    ]
    for c, n in by_country.most_common(25):
        lines.append(f"- {c}: {n}")
    lines += [
        "",
        "## Character distribution (unique output)",
        "",
    ]
    for c, n in by_character.most_common():
        lines.append(f"- {c}: {n}")
    lines += [
        "",
        f"## Output file",
        "",
        f"`{OUTPUT_MASTER.relative_to(DEDUP_DIR.parent)}`",
        "",
    ]
    OUTPUT_REPORT.write_text("\n".join(lines), encoding="utf-8")


def main():
    entries, src_counter = load_all()
    total_in = len(entries)
    print(f"Loaded {total_in} entries from {len(INPUT_FILES)} files")

    unique, duplicates, by_key_count = dedup(entries)
    total_out = len(unique)
    print(f"After dedup: {total_out} unique entries ({len(duplicates)} duplicates merged)")

    # Stats for report
    by_country = Counter()
    by_character = Counter()
    with_addr = 0
    with_email = 0
    for e in unique:
        c = (e.get("location") or {}).get("country") or "unknown"
        by_country[c] += 1
        char = e.get("character") or "unknown"
        by_character[char] += 1
        if (e.get("location") or {}).get("address"):
            with_addr += 1
        if e.get("contact_email"):
            with_email += 1

    write_master(unique)
    write_report(total_in, total_out, duplicates, by_key_count, src_counter, by_country, by_character)
    print(f"Master written: {OUTPUT_MASTER}")
    print(f"Report: {OUTPUT_REPORT}")
    print(f"With address: {with_addr}, with email: {with_email}")


if __name__ == "__main__":
    main()
