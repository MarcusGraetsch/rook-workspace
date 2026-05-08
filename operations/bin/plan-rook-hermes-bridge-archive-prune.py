#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


def parse_args() -> tuple[int, str | None, str | None, Path]:
    args = sys.argv[1:]
    retain_days = 30
    reviewed_by = None
    message_id = None

    while args and args[0].startswith("--"):
        flag = args.pop(0)
        if flag == "--retain-days":
            if not args:
                raise SystemExit("Missing value for --retain-days")
            try:
                retain_days = int(args.pop(0))
            except ValueError as exc:
                raise SystemExit("retain-days must be an integer") from exc
            if retain_days < 1:
                raise SystemExit("retain-days must be >= 1")
        elif flag == "--reviewed-by":
            if not args:
                raise SystemExit("Missing value for --reviewed-by")
            reviewed_by = args.pop(0)
        elif flag == "--message-id":
            if not args:
                raise SystemExit("Missing value for --message-id")
            message_id = args.pop(0)
        else:
            raise SystemExit(
                "Usage: plan-rook-hermes-bridge-archive-prune.py "
                "[--retain-days <days>] [--reviewed-by <name>] [--message-id <id>] "
                "<reviewed-archive-dir>"
            )

    if len(args) != 1:
        raise SystemExit(
            "Usage: plan-rook-hermes-bridge-archive-prune.py "
            "[--retain-days <days>] [--reviewed-by <name>] [--message-id <id>] "
            "<reviewed-archive-dir>"
        )

    return retain_days, reviewed_by, message_id, Path(args[0])


def parse_manifest_line(raw_line: str, line_number: int) -> dict:
    try:
        return json.loads(raw_line)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in manifest on line {line_number}: {exc}") from exc


def parse_archived_at(value: str) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H-%M-%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None


def main() -> None:
    try:
        retain_days, filter_reviewed_by, filter_message_id, archive_dir = parse_args()
    except SystemExit as exc:
        if isinstance(exc.code, str):
            print(exc.code, file=sys.stderr)
            raise SystemExit(2)
        raise

    if not archive_dir.is_dir():
        print(f"Archive directory not found: {archive_dir}", file=sys.stderr)
        raise SystemExit(1)

    manifest_path = archive_dir / "archive-manifest.jsonl"
    if not manifest_path.is_file():
        print(f"Manifest file not found: {manifest_path}", file=sys.stderr)
        raise SystemExit(1)

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=retain_days)

    candidates = []
    total_entries = 0
    for line_number, raw_line in enumerate(manifest_path.read_text().splitlines(), start=1):
        if not raw_line.strip():
            continue
        total_entries += 1
        entry = parse_manifest_line(raw_line, line_number)
        if filter_reviewed_by and entry.get("reviewed_by") != filter_reviewed_by:
            continue
        if filter_message_id and entry.get("message_id") != filter_message_id:
            continue
        archived_at = parse_archived_at(entry.get("archived_at"))
        archived_file = entry.get("archived_file")
        if archived_at is None or not isinstance(archived_file, str):
            continue
        if archived_at >= cutoff:
            continue
        archived_path = Path(archived_file)
        candidates.append(
            {
                "archived_at": archived_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "age_days": int((now - archived_at).total_seconds() // 86400),
                "message_id": entry.get("message_id"),
                "reviewed_by": entry.get("reviewed_by"),
                "archived_file": str(archived_path),
                "file_exists": archived_path.exists(),
            }
        )

    report = {
        "archive_dir": str(archive_dir),
        "manifest_path": str(manifest_path),
        "retain_days": retain_days,
        "cutoff_utc": cutoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_manifest_entries": total_entries,
        "filters": {
            "reviewed_by": filter_reviewed_by,
            "message_id": filter_message_id,
        },
        "prune_candidate_count": len(candidates),
        "prune_candidates": candidates,
        "note": "Plan only. No files were deleted or modified.",
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
