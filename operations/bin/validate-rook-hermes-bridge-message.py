#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


ALLOWED_SYSTEMS = {"rook", "hermes"}
ALLOWED_CLASSIFICATIONS = {"bridge-safe"}
ALLOWED_PURPOSES = {"question", "summary", "request", "handoff"}
ALLOWED_REVIEW_STATUSES = {"unreviewed", "approved", "rejected"}
ISO_8601_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def fail(message: str) -> None:
    print(f"INVALID: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_allowed_reviewers(path: Path) -> set[str]:
    try:
        config = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        fail(f"invalid reviewer allowlist json: {exc}")
    if not isinstance(config, dict):
        fail("reviewer allowlist must be a JSON object")
    reviewers = config.get("allowed_reviewers")
    if not isinstance(reviewers, list) or not all(isinstance(v, str) and v.strip() for v in reviewers):
        fail("reviewer allowlist must contain `allowed_reviewers` as a non-empty string array")
    return {value.strip() for value in reviewers}


def validate(
    payload: dict,
    require_review_approved: bool = False,
    allowed_reviewers: set[str] | None = None,
) -> None:
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

    review_status = payload.get("review_status", "unreviewed")
    if review_status not in ALLOWED_REVIEW_STATUSES:
        fail("`review_status` must be `unreviewed`, `approved`, or `rejected`")

    reviewed_by = payload.get("reviewed_by")
    reviewed_at = payload.get("reviewed_at")
    review_notes = payload.get("review_notes")

    if review_status == "unreviewed":
        if reviewed_by is not None or reviewed_at is not None:
            fail("`reviewed_by` and `reviewed_at` are only valid after review")
    else:
        if not isinstance(reviewed_by, str) or not reviewed_by.strip():
            fail("reviewed payloads must include non-empty `reviewed_by`")
        if not isinstance(reviewed_at, str) or not ISO_8601_UTC.match(reviewed_at):
            fail("reviewed payloads must include `reviewed_at` as YYYY-MM-DDTHH:MM:SSZ")
        if allowed_reviewers is not None and reviewed_by.strip() not in allowed_reviewers:
            fail("`reviewed_by` is not present in the configured reviewer allowlist")

    if review_notes is not None and not isinstance(review_notes, str):
        fail("`review_notes` must be a string when present")

    if require_review_approved and review_status != "approved":
        fail("payload must have `review_status=approved` for archival gate")


def main() -> None:
    args = sys.argv[1:]
    require_review_approved = False
    reviewer_allowlist_path = None

    if "--require-review-approved" in args:
        require_review_approved = True
        args.remove("--require-review-approved")

    if "--reviewer-allowlist" in args:
        index = args.index("--reviewer-allowlist")
        try:
            reviewer_allowlist_path = Path(args[index + 1])
        except IndexError:
            print(
                "Usage: validate-rook-hermes-bridge-message.py "
                "[--require-review-approved] [--reviewer-allowlist <json-file>] <json-file>",
                file=sys.stderr,
            )
            raise SystemExit(2)
        del args[index:index + 2]

    if len(args) != 1:
        print(
            "Usage: validate-rook-hermes-bridge-message.py "
            "[--require-review-approved] [--reviewer-allowlist <json-file>] <json-file>",
            file=sys.stderr,
        )
        raise SystemExit(2)

    path = Path(args[0])
    if not path.is_file():
        fail(f"file not found: {path}")

    try:
        payload = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        fail(f"invalid json: {exc}")

    if not isinstance(payload, dict):
        fail("top-level JSON must be an object")

    allowed_reviewers = None
    if reviewer_allowlist_path is not None:
        if not reviewer_allowlist_path.is_file():
            fail(f"reviewer allowlist file not found: {reviewer_allowlist_path}")
        allowed_reviewers = load_allowed_reviewers(reviewer_allowlist_path)

    validate(
        payload,
        require_review_approved=require_review_approved,
        allowed_reviewers=allowed_reviewers,
    )
    print(f"VALID: {path}")


if __name__ == "__main__":
    main()
