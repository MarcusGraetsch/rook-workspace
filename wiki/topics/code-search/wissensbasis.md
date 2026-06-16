# Code-Search Tools — Wissensbasis

## Überblick

Semantic code search für AI-Agent-Workflows. Lokal-first, token-effizient,
multi-language. Aktuell einziger Kandidat: **cocoindex-code**.

## cocoindex-code

**Was:** Embedded semantic code search CLI (AST-basiert), built on
[CocoIndex](https://github.com/cocoindex-io/cocoindex) (Rust incremental
data engine). Multi-language: Python, JS/TS, Rust, Go, Java, C/C++,
C#, SQL, Shell.

**Versprechen:** 70% Token-Saving bei Agent-Code-Suche.

**Integration:** MCP, Skill, Plugin Marketplace, CLI. Funktioniert mit
Claude Code, Codex, OpenCode.

**Embeddings:** Lokal (sentence-transformers + snowflake-arctic-embed-xs,
~1GB Torch-Deps) oder Cloud (LiteLLM).

**Repo:** https://github.com/cocoindex-io/cocoindex-code

## Bewertung 2026-06-16

**Lückenfüller:** Aktuell `git grep` + `grep -r` + Memory. Semantic wäre
"find code that orchestrates container workloads" statt String-Match.

**Local-First passt:** Snowflake-Embeddings lokal. Auf geplantem AI X1 Pro
(64GB) gut machbar.

**Privacy:** LiteLLM-Cloud-Default ist No-Go (CLOUD Act, FISA 702).
**Nur lokale Variante nutzen** (`cocoindex-code[full]`).

**Status:** Nicht aktiv. TODO: Pilot, sobald AI X1 Pro da.

## Pilot-Checkliste (TODO bei Hardware)

**Vorbedingungen:**
- [ ] AI X1 Pro (64GB) verfügbar
- [ ] `pipx install 'cocoindex-code[full]'`
- [ ] Lokales Embedding-Modell verifiziert: `ccc doctor`

**Pilot in 1 Repo:**
- [ ] Repo wählen: `rook-k8s-lab` (aktiv genutzt, multi-file,
      Python+YAML+Shell)
- [ ] `ccc init` + `ccc index`
- [ ] Test-Queries:
  - "wie konfiguriere ich Flux GitOps sync?"
  - "find handler for Kubernetes secrets"
  - "show patterns of ArgoCD Application"
- [ ] Vergleich: Ergebnis-Qualität vs. `git grep` + manuelles Lesen
- [ ] Token-Verbrauch messen (vorher/nachher, gleiche Query)

**Entscheidung danach:**
- Mehrwert > Aufwand → auf alle Repos ausrollen, ggf. in OpenClaw via
  MCP einbinden
- Mehrwert = Aufwand → beobachten, kein Rollout
- Mehrwert < Aufwand → löschen, zurück zu `git grep`

## Verwandt

- → [[cli-agent-architecture]] (CLI-Wrapper-Philosophie)
- → [[knowledge-management]] (semantic search als KM-Pattern)
