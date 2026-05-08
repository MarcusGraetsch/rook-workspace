#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def parse_args() -> tuple[Path, str | None, str | None]:
    args = sys.argv[1:]
    message_id = None
    reviewed_by = None

    while args and args[0].startswith("--"):
        flag = args.pop(0)
        if flag == "--message-id":
            if not args:
                raise SystemExit("Missing value for --message-id")
            message_id = args.pop(0)
        elif flag == "--reviewed-by":
            if not args:
                raise SystemExit("Missing value for --reviewed-by")
            reviewed_by = args.pop(0)
        else:
            raise SystemExit(
                "Usage: inspect-rook-hermes-bridge-archive-manifest.py "
                "[--message-id <id>] [--reviewed-by <name>] <archive-manifest.jsonl>"
            )

    if len(args) != 1:
        raise SystemExit(
            "Usage: inspect-rook-hermes-bridge-archive-manifest.py "
            "[--message-id <id>] [--reviewed-by <name>] <archive-manifest.jsonl>"
        )

    return Path(args[0]), message_id, reviewed_by


def main() -> None:
    try:
        manifest_path, filter_message_id, filter_reviewed_by = parse_args()
    except SystemExit as exc:
        if isinstance(exc.code, str):
            print(exc.code, file=sys.stderr)
            raise SystemExit(2)
        raise

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

    filtered_entries = []
    for entry in entries:
        if filter_message_id and entry.get("message_id") != filter_message_id:
            continue
        if filter_reviewed_by and entry.get("reviewed_by") != filter_reviewed_by:
            continue
        filtered_entries.append(entry)

    unique_message_ids = {
        entry.get("message_id")
        for entry in filtered_entries
        if isinstance(entry.get("message_id"), str) and entry.get("message_id")
    }
    reviewed_by = sorted(
        {
            entry.get("reviewed_by")
            for entry in filtered_entries
            if isinstance(entry.get("reviewed_by"), str) and entry.get("reviewed_by")
        }
    )

    summary = {
        "manifest_path": str(manifest_path),
        "entry_count": len(filtered_entries),
        "unique_message_id_count": len(unique_message_ids),
        "reviewed_by": reviewed_by,
        "latest_archived_at": filtered_entries[-1].get("archived_at") if filtered_entries else None,
        "filters": {
            "message_id": filter_message_id,
            "reviewed_by": filter_reviewed_by,
        },
    }
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
