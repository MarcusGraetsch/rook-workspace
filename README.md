# Rook Workspace

**My personal AI assistant's working environment — where Rook operates and collaborates.**

This repository contains the complete working environment for Rook (the AI assistant). It serves as the live workspace where Rook performs his various roles: coaching, engineering, daily assistance, and project work.

---

## What This Repository Contains

### Role-Based Directories

| Directory | Purpose |
|-----------|---------|
| **`coaching/`** | Therapeutic and coaching sessions, goals, reflections |
| **`assistant/`** | Daily assistance — inbox, active tasks, waiting items |
| **`engineering/`** | Development work — prototypes, tools, code snippets |
| **`projects/`** | Major projects (as Git submodules) |
| **`tasks/`** | Small projects and tasks (< 2 weeks) |
| **`archive/`** | Long-term storage for completed work |

### Project Submodules

The `projects/` directory contains Git submodules linking to separate repositories:

| Submodule | Repository | Description |
|-----------|------------|-------------|
| `book-project1/` | (local) | Book writing project |
| `critical-theory-digital/` | [critical-theory-digital](https://github.com/MarcusGraetsch/critical-theory-digital) | Book on critical theory |
| `digital-research/` | [digital-capitalism-research](https://github.com/MarcusGraetsch/digital-capitalism-research) | Digital capitalism research project |
| `working-notes/` | [working-notes](https://github.com/MarcusGraetsch/working-notes) | Personal website |
| `web-crew/` | [web-crew](https://github.com/MarcusGraetsch/web-crew) | Web crew project (nested in working-notes) |

---

## Repository Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                    Marcus Grätsch                           │
│                      (Human)                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────────┐       ┌───────────────────────┐
│   rook-agent      │       │    rook-workspace     │
│   (This repo)     │       │    (This repo)        │
│                   │       │                       │
│ • Core identity   │       │ • Working environment │
│ • Memory          │       │ • Role directories    │
│ • Configuration   │       │ • Project submodules  │
│ • Skills          │       │ • Daily operations    │
│ • Cron jobs       │       │                       │
└─────────┬─────────┘       └───────────┬───────────┘
          │                             │
          │  Daily sync (02:00 CET)     │
          │  via sync-from-workspace.sh │
          │                             │
          ▼                             ▼
   ┌─────────────────────────────────────────┐
   │           GitHub (Backup)               │
   └─────────────────────────────────────────┘
```

---

## Getting Started (After Clone)

```bash
# Clone with all submodules
git clone --recursive git@github.com:MarcusGraetsch/rook-workspace.git

# Or initialize submodules after clone
git submodule update --init --recursive
```

---

## Daily Workflow

1. **Rook works here** — All operations, conversations, and tasks happen in this workspace
2. **Daily sync** — At 02:00 CET, core files sync to `rook-agent` for backup
3. **Projects** — Major projects live in their own repos, linked as submodules
4. **Archive** — Completed tasks and old materials move to `archive/`

---

## Directory Structure

```
rook-workspace/
│
├── coaching/               # Therapeutic/coaching role
│   ├── sessions/
│   ├── goals/
│   ├── reflections/
│   ├── exercises/
│   └── insights/
│
├── assistant/              # Daily assistance (Inbox-Zero)
│   ├── inbox/
│   ├── active/
│   ├── waiting/
│   ├── done/
│   └── quick-capture/
│
├── engineering/            # Developer/Engineer role
│   ├── prototypes/
│   ├── tools/
│   ├── snippets/
│   └── docs/
│
├── projects/               # Major projects (submodules)
│   ├── book-project1/
│   ├── critical-theory-digital/  → Submodule
│   ├── digital-research/          → Submodule
│   ├── working-notes/             → Submodule
│   └── web-crew/                  → Submodule (in working-notes)
│
├── tasks/                  # Small projects (< 2 weeks)
│   ├── noctiluca-contact/
│   ├── template/
│   └── _archive/
│
├── archive/                # Long-term storage
│   ├── email-archive/
│   ├── news/
│   └── old-projects/
│
├── .gitmodules             # Submodule configuration
└── README.md               # This file
```

---

## Key Principles

1. **Separation of Concerns** — Workspace (operations) vs. Agent (identity)
2. **Submodule Strategy** — Large projects have their own repos, linked here
3. **No Duplication** — Content lives in one place only
4. **Daily Backup** — Automatic sync ensures nothing is lost

---

## Related Repositories

| Repository | Purpose | Link |
|------------|---------|------|
| `rook-agent` | Core system, identity, memory | [GitHub](https://github.com/MarcusGraetsch/rook-agent) |
| `rook-workspace` | **This repo** — Working environment | [GitHub](https://github.com/MarcusGraetsch/rook-workspace) |
| `digital-capitalism-research` | Research project | [GitHub](https://github.com/MarcusGraetsch/digital-capitalism-research) |
| `working-notes` | Personal website | [GitHub](https://github.com/MarcusGraetsch/working-notes) |
| `critical-theory-digital` | Book project | [GitHub](https://github.com/MarcusGraetsch/critical-theory-digital) |
| `web-crew` | Web development project | [GitHub](https://github.com/MarcusGraetsch/web-crew) |

---

## Automation

### Daily Sync to Rook-Agent
At 02:00 CET, the script `~/.openclaw/rook-agent/scripts/sync-from-workspace.sh` runs to:
- Copy core files (AGENTS.md, SOUL.md, USER.md, etc.) to rook-agent
- Commit and push to GitHub

### Cron Jobs
See `rook-agent/docs/CRON_JOBS.md` for all scheduled tasks.

---

## Disaster Recovery

If the VM needs to be rebuilt:

```bash
# 1. Clone rook-agent (contains identity and config)
git clone git@github.com:MarcusGraetsch/rook-agent.git ~/.openclaw/rook-agent

# 2. Clone workspace (this repo) with submodules
git clone --recursive git@github.com:MarcusGraetsch/rook-workspace.git ~/.openclaw/workspace

# 3. Set up cron jobs
cd ~/.openclaw/rook-agent
./scripts/setup-cron-jobs.sh

# 4. Configure Git
git config --global user.name "Marcus Grätsch"
git config --global user.email "marcusgraetsch@gmail.com"
```

---

## Notes

- This repo is **private** — contains personal context and work
- Submodules are **public** — the actual projects being worked on
- Podcast files and large binaries are **excluded** via .gitignore (stored locally only)

---

## Current Operating Model

The repository has evolved beyond the original role-directory layout above.

Current operational source of truth:

- Kanban in `rook-dashboard` is the main human task UI
- canonical task files live in `operations/tasks/`
- archived tasks live in `operations/archive/tasks/`
- agent health snapshots live in `operations/health/`

Reference docs:

- [docs/SYSTEM-MAP.md](/root/.openclaw/workspace/docs/SYSTEM-MAP.md)
- [docs/TARGET-ARCHITECTURE.md](/root/.openclaw/workspace/docs/TARGET-ARCHITECTURE.md)
- [docs/ROADMAP.md](/root/.openclaw/workspace/docs/ROADMAP.md)
- [docs/DISCORD-POLICY.md](/root/.openclaw/workspace/docs/DISCORD-POLICY.md)
- [docs/DISASTER-RECOVERY.md](/root/.openclaw/workspace/docs/DISASTER-RECOVERY.md)

---

## Last Updated

2026-03-26 — Complete reorganization with role-based structure and submodules.
