---
name: auto-save-research
description: "Auto-commit and push research files to git after creation or modification."
user-invocable: false
---

# Auto-Save Research

Automatically commits research files to git after creation/modification.

## Trigger
- After any `write` tool call that creates/modifies files in:
  - `research/`
  - `projects/digital-research/`
  - `wiki/`
  - `memory/`
  - Any `.md` file in workspace

## Behavior
1. Check if file is in a git repository
2. `git add <file>`
3. `git commit -m "auto: <filename> $(date -Iseconds)"`
4. `git push` (if remote configured)

## Safety
- Only commits if there are actual changes
- Uses `--quiet` to avoid noise
- Never overwrites manual commits
- Respects `.gitignore`

## Manual Use
```bash
# Check status
node ~/.openclaw/workspace/.agents/skills/auto-save-research/scripts/check-and-save.js

# Force save all
node ~/.openclaw/workspace/.agents/skills/auto-save-research/scripts/check-and-save.js --force
```

## Cron Setup
```bash
# Every 30 minutes
*/30 * * * * cd /root/.openclaw/workspace && node .agents/skills/auto-save-research/scripts/check-and-save.js
```
