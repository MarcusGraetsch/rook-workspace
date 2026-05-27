# Psyche Core

Purpose: future private module for psychoanalytic reflection logs, music telemetry, creative writing queues, symbolic notes, and affective pattern tracking.

## Security Boundary

This directory is a scaffold only. Do not place real psyche, therapy, dream, journaling, or affective telemetry data here unless it is encrypted or stored in a private submodule that will never be exposed during an open-source publish push.

## Allowed Public Content

- abstract schemas
- synthetic examples
- redaction rules
- consent and access-control notes
- tooling that operates on encrypted/private stores

## Prohibited Public Content

- private journals
- therapy notes
- dreams
- raw mood logs
- personally identifying creative drafts
- music listening history tied to mental state

## Future Shape

```text
psyche-core/
├── README.md
├── schemas/
├── redaction/
└── private-data/   # encrypted or private submodule only
```
