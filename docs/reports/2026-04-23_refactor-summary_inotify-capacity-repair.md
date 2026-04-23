# Inotify Capacity Repair

Date: 2026-04-23

## Scope

Diagnosis and repair of the OpenClaw gateway startup warning:

`EMFILE: too many open files, watch '/root/.openclaw/openclaw.json'`

## Findings

- The OpenClaw gateway process itself was not leaking file descriptors:
  - process open-file limit: 1048576
  - active file descriptors: low double digits
  - gateway inotify file descriptors: 1
- The root user had exhausted the host-wide per-user inotify instance limit:
  - `fs.inotify.max_user_instances = 128`
  - measured root inotify instances: 128
- The VPS workload includes OpenClaw, dashboard/runtime sidecars, Docker/containerd, and Kubernetes components. The distro default of 128 inotify instances is too low for this combined workload.

## Actions Taken

- Added persistent sysctl policy:
  - `operations/sysctl/99-openclaw-inotify.conf`
  - live installed to `/etc/sysctl.d/99-openclaw-inotify.conf`
- Loaded the sysctl policy with:
  - `sysctl -p /etc/sysctl.d/99-openclaw-inotify.conf`
- Added diagnostic script:
  - `operations/bin/check-inotify-capacity.mjs`
- Integrated the diagnostic into:
  - `operations/bin/check-runtime-control-plane.mjs`
- Updated:
  - `operations/README.md`

## Validation

- Live sysctl values after repair:
  - `fs.inotify.max_user_instances = 512`
  - `fs.inotify.max_user_watches = 524288`
  - `fs.inotify.max_queued_events = 32768`
- `node operations/bin/check-inotify-capacity.mjs` passes.
- `node operations/bin/check-runtime-control-plane.mjs` passes with no inotify errors.
- `openclaw-gateway.service` was restarted after the sysctl change.
- In the post-restart window since `2026-04-23T12:55:05+02:00`:
  - gateway reached ready state
  - Telegram provider started
  - Discord provider started
  - no `EMFILE`
  - no config watcher error
  - no `Unknown model: kimi/moonshot-k2-6`
  - no Kimi warmup failure

## Open Risks

- The current systemd gateway unit stores secrets directly as `Environment=` entries. This was not changed in this repair, but should be cleaned up in a separate, focused credentials-handling task.
- Bonjour/mDNS advertiser warnings still appear during startup. They are separate from the inotify issue and did not block gateway readiness.

## Next Steps

- Move gateway secrets out of the committed systemd unit and into an `EnvironmentFile` or OpenClaw-supported secret store.
- Add a small install/sync helper for operations sysctl policies if more host-level runtime policies are introduced.
