# working-notes-deploy

Manage and deploy the working-notes.org static website (Eleventy v2, IONOS hosting) via Telegram.

## Overview

This skill provides commands to:
- Create and edit blog posts
- Build and deploy the site
- Make code changes (features, fixes, styling)
- Check bot/service status and logs

## Prerequisites

- Site lives at `/root/marcus-cyborg`
- Credentials in `/root/marcus-cyborg/.env` (gitignored)
- Node.js + npm installed
- IONOS credentials for rsync deploy
- Telegram photo bot runs as `telegram-photo.service`

## Commands

### Write a Blog Post

Create a new Markdown file in `src/writing/`:

```yaml
---
layout: post.njk
title: "Your Title"
date: 2026-05-06
author: "Marcus + Rook"
tags:
  - post
  - YOUR-TAG
excerpt: "Short summary for feed."
---

Content here.
```

Rules:
- Filename: lowercase-with-dashes.md (no spaces, no umlauts)
- `date` must match file creation date ideally
- `tags` must include `post`
- `tags` use UPPERCASE, hyphens for multi-word (no spaces, no underscores)
- After writing: build + deploy

### Build Site

```bash
cd /root/marcus-cyborg
source .env
npx @11ty/eleventy
```

Output goes to `_site/`. Never edit `_site/` directly.

### Deploy to IONOS

```bash
cd /root/marcus-cyborg
source .env
sshpass -p "$IONOS_PASSWORD" rsync -avz --delete \
  -e 'ssh -o StrictHostKeyChecking=accept-new' \
  _site/ $IONOS_USER@$IONOS_HOST:~/public/
```

### Full Publish Pipeline

One-shot: write → build → commit → push → deploy

```bash
cd /root/marcus-cyborg
git add -A
git commit -m "Add: <title>" --author="Rook <rook@working-notes.org>"
git push origin main
source .env && npx @11ty/eleventy
sshpass -p "$IONOS_PASSWORD" rsync -avz --delete \
  -e 'ssh -o StrictHostKeyChecking=accept-new' \
  _site/ $IONOS_USER@$IONOS_HOST:~/public/
```

### Quick Deploy (when only code changed)

```bash
cd /root/marcus-cyborg
source .env && npx @11ty/eleventy
sshpass -p "$IONOS_PASSWORD" rsync -avz --delete \
  -e 'ssh -o StrictHostKeyChecking=accept-new' \
  _site/ $IONOS_USER@$IONOS_HOST:~/public/
```

### Check Bot Status

```bash
systemctl status telegram-photo
journalctl -u telegram-photo -n 50
```

### Restart Bot

```bash
systemctl restart telegram-photo
```

## Code Changes

### CSS
- File: `src/css/main.css` (single file, keep it that way)
- Edit, then build + deploy

### Templates
- `src/_layouts/` — page layouts (base.njk, post.njk)
- `src/_includes/` — partials
- `src/_data/*.json` — data files (photos.json, epigraphs.json, etc.)

### Adding a New Page
1. Create `.njk` or `.md` in `src/`
2. Set frontmatter with `layout: base.njk` (or appropriate)
3. Add to navigation if needed (edit template)
4. Build + deploy

## Gallery Photos

Photos go in `src/img/photos/`. Metadata in `src/_data/photos.json`:

```json
{
  "id": "004",
  "title": "Photo Title",
  "date": "2026-05-06 15:30",
  "src": "/img/photos/20260506-153000.jpg",
  "external": false,
  "alt": "Alt text",
  "tags": ["TAG1", "TAG2"],
  "description": "Optional description"
}
```

- `id`: 3 digits, zero-padded, unique, never reuse
- After editing: build + deploy

## Process Logs (optional)

Document how an article was created:
- File: `src/writing/<slug>.process.md`
- Add to post frontmatter:
  ```yaml
  process:
    model: "Kimi K2.5 (via Rook)"
    method: "Multi-turn conversation"
    summary: "3 revision rounds"
  ```

Format:
```markdown
## Initial Prompt

<div class="human">

Marcus: Write about...

</div>

## First Draft

<div class="ai">

Rook: Here's the draft...

</div>
```

(Blank line after opening `<div>` and before closing `</div>` required.)

## Tag Conventions

- Always UPPERCASE
- Hyphens for multi-word (no spaces, no underscores)
- Existing: AI, TECH, LABOR, CRITICAL-THEORY, COLLECTIVE-COGNITION, BERLIN, URBAN, LIFE, TEST

## Commit Conventions

- Imperative mood: "Add feature", not "Added feature"
- First line under 72 chars
- For AI authorship: `Co-Authored-By: Rook <rook@working-notes.org>`

## Safety Rules

- NEVER commit `.env`
- NEVER edit `_site/` directly
- NEVER install npm packages without explicit approval from Marcus
- ALWAYS build after changes before deploying
- ALWAYS source `.env` before deploy commands

## Environment File

```bash
cat /root/marcus-cyborg/.env
```

Contains:
- `TELEGRAM_BOT_TOKEN`
- `IONOS_PASSWORD`
- `IONOS_USER`
- `IONOS_HOST`

## Common Tasks

### Fix a typo in a post
1. Edit `src/writing/<file>.md`
2. Build + deploy

### Update photo metadata
1. Edit `src/_data/photos.json`
2. Build + deploy

### Add a new static page
1. Create `src/page-name.njk` (or `.md`)
2. Build + deploy

### Check last deploy
```bash
ls -la /root/marcus-cyborg/_site/
git log --oneline -5
```

### Full reset (if build is broken)
```bash
cd /root/marcus-cyborg
rm -rf _site/
npm run build  # or: source .env && npx @11ty/eleventy
# then deploy
```
