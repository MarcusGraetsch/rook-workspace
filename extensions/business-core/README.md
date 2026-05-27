# Business Core

Purpose: future private module for travel manifests, CRM pipelines, compliance framework mapping, client-context routing, and professional operating memory.

## Security Boundary

This directory is a scaffold only. Do not place real client, travel, CRM, contract, credential, or compliance evidence data here unless it is encrypted or stored in a private submodule that will never be exposed during an open-source publish push.

## Allowed Public Content

- generic workflow schemas
- synthetic CRM examples
- compliance taxonomy mappings
- adapter interfaces
- redaction and export policies

## Prohibited Public Content

- client names or contacts
- travel documents
- contracts or invoices
- credentials
- proprietary compliance evidence
- non-public business correspondence

## Future Shape

```text
business-core/
├── README.md
├── schemas/
├── adapters/
└── private-data/   # encrypted or private submodule only
```
