#!/usr/bin/env python3
"""Schreibt Batch-Dateien für Sub-Agent Recherche."""
import json
import re
from pathlib import Path

OUTDIR = Path("/root/.openclaw/workspace/projects/caravan-sommer-2026/datenbank/initiative-archiv/dedup")

email_blacklist = {'gmail.com','web.de','posteo.de','t-online.de','yahoo.de','yahoo.com',
                   'gmx.de','hotmail.de','hotmail.com','outlook.de','outlook.com',
                   'mailbox.org','googlemail.com','riseup.net','systemli.org'}

def get_email_domains(entry):
    desc = entry.get('description', '') or ''
    domains = []
    for m in re.findall(r'[\w\.\-+]+@(?:[\w\.\-+]+\.[a-z]{2,})', desc):
        dom = m.split('@')[1].lower()
        if dom not in email_blacklist:
            domains.append(dom)
    return domains

# Load both buckets
all_entries = {}
for fname in ['bucket_b_ohne_mit_url.jsonl', 'bucket_c_ohne_ohne_url.jsonl']:
    fpath = OUTDIR / fname
    if not fpath.exists():
        continue
    with fpath.open() as f:
        for line in f:
            if not line.strip():
                continue
            e = json.loads(line)
            key = e.get('name', '') + '|' + e.get('_source_file', '')
            if key not in all_entries:
                all_entries[key] = e

print(f"Total unique entries: {len(all_entries)}")

# Batch 1: netzwerk-oekodorf
batch1 = [e for e in all_entries.values() if e.get('_source_file') == 'netzwerk-oekodorf']
print(f"Batch 1 (netzwerk-oekodorf): {len(batch1)}")

# Batch 2: wohnprojekte-portal mit contact_url (aus bucket_b)
batch2_keys = set()
batch2 = [e for e in all_entries.values()
           if e.get('_source_file') == 'wohnprojekte-portal'
           and e.get('contact_url')
           and 'workaway.info' not in (e.get('contact_url') or '')]
print(f"Batch 2 (wohnprojekte-portal mit URL): {len(batch2)}")

# Batch 3: workaway
batch3 = [e for e in all_entries.values() if e.get('_source_file') == 'workaway']
print(f"Batch 3 (workaway): {len(batch3)}")

# Batch 4: restliche mit Email-Domain (bucket_b)
batch4 = [e for e in all_entries.values()
          if e.get('_source_file') in ('gen-europe',)
          or (e.get('_source_file') == 'wohnprojekte-portal'
              and not e.get('contact_url')
              and get_email_domains(e))]
print(f"Batch 4 (gen-europe + wohnprojekte ohne URL mit email): {len(batch4)}")

# Batch 5: contraste ohne URL
batch5 = [e for e in all_entries.values()
           if e.get('_source_file') in ('contraste',)
           and not e.get('contact_url')]
print(f"Batch 5 (contraste): {len(batch5)}")

# Write batches
batches = {
    'batch_netzwerk_oekodorf.jsonl': batch1,
    'batch_wohnprojekte_mit_url.jsonl': batch2,
    'batch_workaway.jsonl': batch3,
    'batch_gen_europe.jsonl': [e for e in batch4 if e.get('_source_file') == 'gen-europe'],
    'batch_wohnprojekte_email.jsonl': [e for e in batch4 if e.get('_source_file') == 'wohnprojekte-portal'],
    'batch_contraste.jsonl': batch5,
}

for fname, entries in batches.items():
    fpath = OUTDIR / fname
    with fpath.open('w') as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + '\n')
    print(f"  Written: {fname} ({len(entries)} entries)")

# Summary
total = sum(len(v) for v in batches.values())
print(f"\nTotal in batches: {total}")
print("Remaining (not in any batch):", len(all_entries) - total)
