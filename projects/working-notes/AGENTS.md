# Agent Guide for marcus-cyborg

Reference for AI agents (Rook, Claude, etc.) working on this site. Read this before making changes.

## Project Overview

Static site built with [Eleventy (11ty)](https://www.11ty.dev/) v2. Source in `src/`, output in `_site/`. Hosted on IONOS via rsync. A Telegram bot on a VPS handles photo uploads to the gallery.

## Directory Structure

```
marcus-cyborg/
├── .eleventy.js          # Eleventy config
├── .env                  # Secrets (NEVER commit)
├── .env.example          # Template for .env
├── package.json
├── bot/                  # Telegram photo bot
│   ├── telegram-photo.js
│   ├── telegram-photo.service
│   └── README.md
├── src/
│   ├── _layouts/         # Page layouts (base.njk, post.njk)
│   ├── _includes/        # Partial templates
│   ├── _data/            # JSON data files (photos, epigraphs, etc.)
│   ├── css/main.css      # All styles (single file)
│   ├── img/photos/       # Gallery photos (uploaded by bot)
│   ├── writing/          # Blog posts (markdown)
│   └── *.njk, *.md       # Top-level pages
└── _site/                # Generated output (DO NOT EDIT)
```

## Rules

1. **Never edit files in `_site/`.** It is generated output. It gets overwritten on every build.
2. **Never commit `.env`.** It contains secrets. It is gitignored.
3. **Always build after changes** to verify: `npx @11ty/eleventy`
4. **Keep `main.css` as a single file.** Do not split CSS into multiple files.
5. **Do not install npm packages** without explicit approval from Marcus. The project is deliberately minimal.

## Writing Blog Posts

Create a markdown file in `src/writing/`:

```markdown
---
layout: post.njk
title: "Your Post Title"
date: 2026-02-09
author: "Marcus + Rook"
tags:
  - post
  - TOPIC-TAG
  - ANOTHER-TAG
excerpt: "A one-line summary for the feed."
---

Your content here in markdown.
```

Required frontmatter:
- `layout: post.njk`
- `title` — the post title
- `date` — YYYY-MM-DD format
- `author` — who wrote it
- `tags` — must include `post` (this is how Eleventy collects it). Add topic tags in UPPERCASE.
- `excerpt` — short summary for RSS feed

The post will automatically appear on `/writing/` and in the RSS feed at `/feed.xml`.

## Using Gallery Images in Blog Posts

Photos uploaded via the Telegram bot are stored at `src/img/photos/` and catalogued in `src/_data/photos.json`.

To find an image, read `photos.json` and look up by title, tags, or ID:

```json
{
  "id": "002",
  "title": "Berlin rooftop",
  "date": "2026-02-09 15:30",
  "src": "/img/photos/20260209-153042.jpg",
  "external": false,
  "alt": "Berlin rooftop",
  "tags": ["BERLIN", "URBAN"],
  "description": "View from the office"
}
```

Use the `src` path in markdown:

```markdown
![Berlin rooftop](/img/photos/20260209-153042.jpg)
```

Or with a caption using HTML:

```html
<figure>
  <img src="/img/photos/20260209-153042.jpg" alt="Berlin rooftop">
  <figcaption>View from the office, Berlin 2026</figcaption>
</figure>
```

Both work in markdown files because the template engine is Nunjucks (`markdownTemplateEngine: "njk"` in `.eleventy.js`).

## Editing Photo Metadata

To update tags, descriptions, or titles on existing photos, edit `src/_data/photos.json` directly.

The format for each entry:

```json
{
  "id": "003",
  "title": "Photo title",
  "date": "2026-02-09 15:30",
  "src": "/img/photos/20260209-153042.jpg",
  "external": false,
  "alt": "Accessible description of the image",
  "tags": ["TAG1", "TAG2"],
  "description": "Optional caption text"
}
```

Fields:
- `id` — zero-padded 3-digit string ("001", "002", ...). Must be unique. Do not reuse deleted IDs.
- `title` — display title
- `date` — when the photo was added (YYYY-MM-DD HH:MM)
- `src` — path relative to site root. For local photos: `/img/photos/filename.jpg`
- `external` — `false` for local photos, `true` for externally hosted images
- `alt` — accessibility text for screen readers
- `tags` — array of uppercase strings
- `description` — optional. Omit the field entirely if empty (do not set to `""`)

After editing, commit, push, and rebuild/deploy.

## Data Files

All in `src/_data/`. Eleventy makes them available as template variables by filename.

| File | Variable | Used by |
|------|----------|---------|
| `photos.json` | `photos` | `gallery.njk` |
| `epigraphs.json` | `epigraphs` | `epigraphs.njk` |
| `directives.json` | `directives` | `directives.njk` |
| `manifestos.json` | `manifestos` | `manifestos.njk` |
| `motd.json` | `motd` | `index.md` |
| `asciiMovies.json` | `asciiMovies` | `ascii-art.njk` |

To add a new data file, create `src/_data/name.json` and reference it as `name` in any template.

## Build and Deploy

**Local build:**
```bash
npx @11ty/eleventy
```

**The Telegram bot** handles build + deploy automatically when photos are uploaded.

**Manual deploy from VPS:**
```bash
ssh root@178.18.254.21
cd /root/marcus-cyborg
npx @11ty/eleventy
# rsync uses credentials from .env — see bot/README.md
```

## Tag Conventions

Use UPPERCASE for all tags. Existing tags in use:

- Content: `AI`, `TECH`, `LABOR`, `CRITICAL-THEORY`, `COLLECTIVE-COGNITION`
- Photo location: `BERLIN`, `URBAN`
- Photo type: `LIFE`, `TEST`

Reuse existing tags when possible. Use hyphens for multi-word tags (not spaces, not underscores).

## Process Logs (Optional)

Process logs document how an article was made — the prompts, conversation turns, model used, and setup. They appear as a collapsible "PROCESS" section on the post page.

### Creating a Process Log

For a post at `src/writing/my-article.md`, create a companion file at `src/writing/my-article.process.md`. The naming convention is `article-slug.process.md` — same name as the post, with `.process.md` instead of `.md`.

Process logs are **optional**. Not every article needs one.

### Frontmatter

Add a `process` key to the post's frontmatter. All fields are optional:

```yaml
process:
  model: "Kimi K2.5 (via Rook)"
  method: "Multi-turn conversation"
  summary: "3 rounds of revision from an initial outline"
```

If no `process` key exists in frontmatter, no process section appears on the page.

### Process File Format

Use `<div class="human">` for human prompts and `<div class="ai">` for AI responses. Wrap each turn in a markdown heading:

```markdown
## Initial Prompt

<div class="human">

Marcus: Write about the thing.

</div>

## First Draft

<div class="ai">

Rook: Here is the draft content...

</div>

## Revision Notes

<div class="human">

Marcus: Make it more direct.

</div>

## Setup Notes

- **Model**: Kimi K2.5 via OpenClaw/Rook
- **Method**: Multi-turn conversation
- **No RAG used**
```

Important: leave a blank line after the opening `<div>` tag and before the closing `</div>` tag — markdown needs the blank lines to render correctly inside HTML blocks.

## Commit Messages

- Use imperative mood ("Add feature" not "Added feature")
- First line under 72 characters
- If an AI agent authored the change, add: `Co-Authored-By: Agent Name <email>`
