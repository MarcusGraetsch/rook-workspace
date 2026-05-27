# Somatic Core

Purpose: future private module for physical health, sports logging, recovery notes, nutrition metrics, and body-related longitudinal signals.

## Security Boundary

This directory is a scaffold only. Do not place real health data here unless it is encrypted or stored in a private submodule that is explicitly excluded from any open-source publish path.

## Allowed Public Content

- data model sketches with synthetic examples
- redacted schema definitions
- import/export adapters without personal payloads
- threat models and privacy policy notes

## Prohibited Public Content

- raw health logs
- medication details
- nutrition journals
- biometric exports
- personally identifying medical notes

## Future Shape

```text
somatic-core/
├── README.md
├── schemas/
├── adapters/
└── private-data/   # encrypted or private submodule only
```
