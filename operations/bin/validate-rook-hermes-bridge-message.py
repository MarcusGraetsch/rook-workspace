#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


ALLOWED_SYSTEMS = {"rook", "hermes"}
ALLOWED_CLASSIFICATIONS = {"bridge-safe"}
ALLOWED_PURPOSES = {"question", "summary", "request", "handoff"}
ISO_8601_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def fail(message: str) -> None:
    print(f"INVALID: {message}", file=sys.stderr)
    raise SystemExit(1)


def validate(payload: dict) -> None:
    required = [
        "message_id",
        "source_system",
        "target_system",
        "created_at",
        "classification",
        "topic",
        "purpose",
        "allowed_consumers",
        "ttl_hours",
        "body",
    ]
    for key in required:
        if key not in payload:
            fail(f"missing required field `{key}`")

    if not isinstance(payload["message_id"], str) or len(payload["message_id"]) < 8:
        fail("`message_id` must be a string with length >= 8")
    if payload["source_system"] not in ALLOWED_SYSTEMS:
        fail("`source_system` must be `rook` or `hermes`")
    if payload["target_system"] not in ALLOWED_SYSTEMS:
        fail("`target_system` must be `rook` or `hermes`")
    if payload["source_system"] == payload["target_system"]:
        fail("`source_system` and `target_system` must differ")
    if payload["classification"] not in ALLOWED_CLASSIFICATIONS:
        fail("`classification` must be `bridge-safe`")
    if not isinstance(payload["topic"], str) or not payload["topic"].strip():
        fail("`topic` must be a non-empty string")
    if payload["purpose"] not in ALLOWED_PURPOSES:
        fail("`purpose` has an unsupported value")
    if not isinstance(payload["allowed_consumers"], list) or not payload["allowed_consumers"]:
        fail("`allowed_consumers` must be a non-empty array")
    if not all(isinstance(v, str) and v in ALLOWED_SYSTEMS for v in payload["allowed_consumers"]):
        fail("`allowed_consumers` may only contain `rook` or `hermes`")
    if payload["target_system"] not in payload["allowed_consumers"]:
        fail("`allowed_consumers` must include the target system")
    if not isinstance(payload["ttl_hours"], int) or not (1 <= payload["ttl_hours"] <= 720):
        fail("`ttl_hours` must be an integer between 1 and 720")
    if not isinstance(payload["body"], str) or not payload["body"].strip():
        fail("`body` must be a non-empty string")
    if not isinstance(payload["created_at"], str) or not ISO_8601_UTC.match(payload["created_at"]):
        fail("`created_at` must match YYYY-MM-DDTHH:MM:SSZ")

    references = payload.get("references", [])
    if not isinstance(references, list) or not all(isinstance(v, str) for v in references):
        fail("`references` must be an array of strings when present")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: validate-rook-hermes-bridge-message.py <json-file>", file=sys.stderr)
        raise SystemExit(2)

    path = Path(sys.argv[1])
    if not path.is_file():
        fail(f"file not found: {path}")

    try:
        payload = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        fail(f"invalid json: {exc}")

    if not isinstance(payload, dict):
        fail("top-level JSON must be an object")

    validate(payload)
    print(f"VALID: {path}")


if __name__ == "__main__":
    main()
