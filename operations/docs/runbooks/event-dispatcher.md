# Event Dispatcher Runbook

## Scope

The event dispatcher drains `operations/events/outbox/` through the JSON event ledger lifecycle:

1. Validate each event against `operations/schemas/rook-hermes-event.schema.json`.
2. Move valid events to `operations/events/archive/YYYY/MM/`.
3. Move invalid or duplicate events to `operations/events/dead-letter/YYYY/MM/`.
4. Write immutable `delivered` receipts to `operations/events/receipts/YYYY/MM/`.

The dispatcher does not call Hermes, OpenClaw, n8n, GitLab, or arbitrary shell hooks. It only records the ledger-level delivery boundary.

## Manual Checks

Preview without mutation:

```bash
node operations/bin/dispatch-events.mjs --queue outbox --dry-run
```

Run one controlled batch:

```bash
node operations/bin/dispatch-events.mjs --queue outbox --limit 10
```

Inspect queue and receipt state:

```bash
node operations/bin/summarize-events.mjs
```

Run regression checks:

```bash
node operations/bin/check-event-ledger.mjs
```

## User systemd Units

Unit templates live in `operations/systemd/`:

- `rook-event-dispatcher.service`
- `rook-event-dispatcher.timer`

Install or refresh the user units:

```bash
mkdir -p /root/.config/systemd/user
cp operations/systemd/rook-event-dispatcher.service /root/.config/systemd/user/
cp operations/systemd/rook-event-dispatcher.timer /root/.config/systemd/user/
systemctl --user daemon-reload
```

Manual service smoke test:

```bash
systemctl --user start rook-event-dispatcher.service
systemctl --user status rook-event-dispatcher.service
```

Enable the timer only after a clean manual smoke test:

```bash
systemctl --user enable --now rook-event-dispatcher.timer
systemctl --user list-timers rook-event-dispatcher.timer
```

## Recovery

- If a bad event appears, inspect `operations/events/dead-letter/` and fix the producing system before replaying.
- Do not edit archived event files in place.
- If delivery needs to be acknowledged manually, use `operations/bin/ack-event.mjs` to write a separate receipt.
