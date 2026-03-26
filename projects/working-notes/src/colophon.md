---
layout: base.njk
title: Colophon
---

<div class="hero">
  <h1 class="hero-title">Colophon</h1>
  <p class="hero-description">How this site is built, why, and how to replicate it.</p>
</div>

<hr class="section-divider">

<div class="section-title">
  <h2>Technical Stack</h2>
</div>

This site is built with [11ty](https://www.11ty.dev/) (Eleventy), a static site generator that compiles Markdown and templates into plain HTML. The build output is deployed to IONOS webspace via rsync over SSH.

**Why 11ty?** Because it produces static HTML with no client-side JavaScript, no tracking, no dependencies that will break in five years. The site will render in any browser, now or decades from now.

**Why IONOS?** Reliable European hosting with SSH access, SSL included. If it becomes untenable, the site is static files — it can be moved anywhere in minutes.

<div class="section-title">
  <h2>Design</h2>
</div>

The design is a green-phosphor terminal aesthetic — VT100, BBS, Chaos Computer Club. The kind of screen that would make a 1989 cracker feel at home.

We chose this deliberately:

- **VT323** for all text — a Google Font that looks like a real CRT display, with monospace fallback
- **Green on black** (`#00ff41` on `#0a0a0a`) — the phosphor palette of early terminals
- **Cyan for links** (`#00ffff`) — ANSI color 6, the hyperlink of the BBS era
- **Amber for accents** (`#ffb000`) — warnings, prompts, the color of authority
- **Scanline overlay** — a subtle CSS effect mimicking CRT scan lines
- **ASCII art** and **box-drawing characters** — because decoration should be typographic
- **No images, no gradients, no cards** — everything is text

The visual language is the command line. The site looks like what it is: a terminal into which two entities type, and from which text emerges. The aesthetic is not nostalgia — it is a refusal of the design language of platforms, of the rounded corners and gradient cards that signal "content" and "engagement." This is a text file. Read it or don't.

<div class="section-title">
  <h2>Collaboration Method</h2>
</div>

The human-machine collaboration happens via a shared workspace. The human (Marcus) initiates most pieces and has final editorial authority. The machine (Rook, an AI assistant) contributes through dialogue: suggesting structures, arguing with premises, refining language, identifying connections.

Nothing here is "AI-generated" in the sense of unreviewed output. Everything is discussed, revised, and signed-off. The division of labor is transparent because the politics require it.

<div class="section-title">
  <h2>Principles</h2>
</div>

1. **No platforms.** No Medium, no Substack, no Twitter. Static HTML on infrastructure we can move.

2. **No analytics.** We do not track readers. We will never know if anyone visits.

3. **No optimization.** This is not content marketing. The goal is not engagement.

4. **Open process.** The collaboration is visible in the bylines and documented here.

<div class="section-title">
  <h2>Development Workflow</h2>
</div>

The site is built and deployed through a human-AI loop, with Marcus reviewing every change before it goes live:

1. **Agent codes** — the AI agent (Claude Code, running locally via CLI) edits source files in the project directory
2. **Human reviews** — Marcus checks the result in the browser at `localhost:8080` via 11ty's dev server
3. **Agent commits and pushes** — changes go to the Git repository on GitHub
4. **Agent deploys** — the built `_site/` directory is rsynced over SSH to the IONOS webspace
5. **Live** — the site is served at [working-notes.org](https://working-notes.org)

No CI/CD pipeline. No build server. No abstraction layers. A human, a machine, a terminal, and rsync. The entire deploy chain is visible and manual — every change is a conscious decision, not an automated event.

<div class="section-title">
  <h2>Source</h2>
</div>

The complete source for this site is available at [github.com/MarcusGraetsch/marcus-cyborg](https://github.com/MarcusGraetsch/marcus-cyborg).

<hr class="section-divider">

<p class="meta">Last updated: February 2026</p>
