#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 2:
        print(
            "Usage: inspect-rook-hermes-bridge-archive-manifest.py <archive-manifest.jsonl>",
            file=sys.stderr,
        )
        raise SystemExit(2)

    manifest_path = Path(sys.argv[1])
    if not manifest_path.is_file():
        print(f"Manifest file not found: {manifest_path}", file=sys.stderr)
        raise SystemExit(1)

    entries = []
    for line_number, raw_line in enumerate(manifest_path.read_text().splitlines(), start=1):
      if not raw_line.strip():
        continue
      try:
        entries.append(json.loads(raw_line))
      except json.JSONDecodeError as exc:
        print(f"Invalid JSON on line {line_number}: {exc}", file=sys.stderr)
        raise SystemExit(1)

    unique_message_ids = {
        entry.get("message_id")
        for entry in entries
        if isinstance(entry.get("message_id"), str) and entry.get("message_id")
    }
    reviewed_by = sorted(
        {
            entry.get("reviewed_by")
            for entry in entries
            if isinstance(entry.get("reviewed_by"), str) and entry.get("reviewed_by")
        }
    )

    summary = {
        "manifest_path": str(manifest_path),
        "entry_count": len(entries),
        "unique_message_id_count": len(unique_message_ids),
        "reviewed_by": reviewed_by,
        "latest_archived_at": entries[-1].get("archived_at") if entries else None,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
