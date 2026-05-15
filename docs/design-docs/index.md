# Design Decisions Index

## ADRs (Architecture Decision Records)

- [ADR-0001: Sistema de Versionamento — Manifest com Checksums SHA-256](./ADR-0001-manifest-checksums.md) — 2026-03-23, active
- [ADR-0002: Contrato de Subagentes v1](./ADR-0002-subagent-contract.md) — 2026-05-14, active
- [ADR-0020: Adaptive Coaching Framework (v6.3.0)](./ADR-0020-adaptive-coaching.md) — 2026-05-15, active

## Canonical Docs

Reference documents that capture the contract or usage pattern for a subsystem. These are
stable, linked from ADRs, and intended as the single source of truth for their topic.

- [adaptive-coaching-framework.md](./adaptive-coaching-framework.md) — Migration guide for skill authors adopting the Adaptive Coaching Framework (v6.3.0). Covers PrefaceContext shape, readPrefaceContext usage, schema field reference, and 4-step migration checklist.
- [subagent-contract-v1.md](./subagent-contract-v1.md) — Canonical reference for the v1 JSON contract used by all subagent auditors. Covers lifecycle, domain_status, reasoning, and migration from legacy markdown format.

## Core Beliefs

- [core-beliefs.md](./core-beliefs.md) — Senior engineering principles, always-on

## ADR Format

Each ADR follows the format:
```
---
adr-id: NNNN
title: "..."
date: YYYY-MM-DD
status: active | superseded | deprecated
tags: [...]
---

## Context
## Decision
## Alternatives Considered
## Consequences
## Reversibility
## References
```

New ADRs: `ADR-NNNN-kebab-slug.md` where NNNN increments from the last used value.
