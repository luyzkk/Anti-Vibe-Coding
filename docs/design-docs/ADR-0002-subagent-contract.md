---
adr-id: 0002
title: "Contrato de Subagentes v1: JSON canonico + lifecycle + reasoning"
date: 2026-05-14
status: active
tags: [subagents, contract, json, lifecycle, reasoning, migration]
---

# ADR-0002: Contrato de Subagentes v1

## Context

11 of the 13 subagents today return markdown with their own domain enum
(`SECURE/VULNERABILITIES_FOUND`, `OPTIMIZED/ISSUES_FOUND`, `COMPLIANT/NON-COMPLIANT`,
etc.). A generic orchestrator is impossible — each consumer skill needs its own
regex-plus-mapping layer. Domain decisions (absolute severity) are baked into the tool
output with no room for free-form `reasoning` and no explicit lifecycle signal.

Full inventory in `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/INVENTORY.md`
and PRD §Problem.

## Decision

Adopt a canonical v1 contract with a unified JSON shape, standardized lifecycle, and
mandatory `reasoning`. Migration is big-bang across 5 sequential waves inside an isolated
branch.

### Specific Decisions

| # | Decision | Choice | Rejected Alternative | Reason |
|---|----------|--------|----------------------|--------|
| 1 | Output format | Structured JSON + optional `human_readable` | Pure markdown | Markdown is not parseable without regex; optional field preserves presentation at zero cost |
| 2 | `status` granularity | Lifecycle axis (4 values) + separate `payload.domain_status` | Single domain axis | Single axis forces confusion between lifecycle and domain; separation enables generic handler while preserving expressiveness |
| 3 | `reasoning` field | Mandatory, non-empty, free-form prose | Optional or structured | Mandatory escape hatch lets agents signal findings outside the schema; optional = always empty in practice |
| 4 | `kind` enum | `audit \| mutation \| proposal \| verification` | No kind / per-agent kind | 4 values cover all 13 agents; extensible in v2 without breaking v1 handlers |
| 5 | `payload` shape per kind | oneOf schema in `agents/_contract/v1.schema.json` | Free payload / per-agent schema | oneOf enables generic handler without reintroducing N-way parsing |
| 6 | Migration strategy | Big-bang, 5 sequential waves, isolated branch until Wave 5 green | Incremental with backwards-compat | 13 agents is small enough; keeping the old parser is permanent debt |
| 7 | Versioning | `contract_version: "1.0"` literal fixed in v1 | No version / full semver | Declarative field lets v2 coexist when the time comes; zero cost today |
| 8 | Schema location | `agents/_contract/v1.schema.json` + canonical doc in `docs/design-docs/subagent-contract-v1.md` | Inline in AGENTS_LIST.md | Schema close to agents eases authoring; design-docs location is the canonical reference |
| 9 | Default retry policy | 1 retry on `needs_retry`, then escalate to `needs_human` | No retry / infinite retry | 1 retry covers transient failures; more creates loops |
| 10 | Short/empty reasoning gate | Reject `<20` chars (error `REASONING_TOO_SHORT`); warn `<50` chars (`REASONING_LIKELY_WEAK`) | Allow empty / warn-only | Two levels distinguish broken contract (hard reject) from weak usage (soft warn) |

## Alternatives Considered

1. **Keep markdown, standardize domain enum.** Rejected: still requires regex; does not
   address missing `reasoning`; cannot accommodate `kind: mutation`.
2. **Backwards-compat with old contract (dual-parser).** Rejected: 13 agents is too small
   to justify permanent debt; complicates every orchestrator going forward.
3. **Per-agent schema instead of oneOf per kind.** Rejected: reintroduces N-way parsing
   (N agents = N shapes); contradicts the goal of a generic handler.
4. **Optional `reasoning`.** Rejected: optional fields are always empty in practice; the
   escape hatch disappears.
5. **No `contract_version` field.** Rejected: costs nothing in v1 and unlocks v2 coexistence
   without a refactor; favorable trade-off.

## Consequences

Positive:
- Generic orchestrator now possible: `parseAndDispatch(output, kindHandlers)` replaces
  per-agent regex.
- Adding a new auditor requires zero changes to existing orchestrators (enters via `kind: audit`).
- Mandatory `reasoning` forces agents to surface findings that fall outside the schema.
- Lifecycle separated from domain eliminates the `needs_retry` vs `VULNERABILITIES_FOUND`
  ambiguity.

Negative:
- Big-bang migration requires a short dedicated window (estimated 2-3 days, isolated branch).
- LLMs do not always emit valid JSON; a tolerant parser plus mechanical retry mitigates this
  but adds complexity.
- Subagent authors must learn the lifecycle-vs-domain_status distinction; migration guide covers this.

Neutral:
- JSON payload size is comparable to markdown — no perceptible cost impact (PRD §Cost).
- `metadata.duration_ms` present in every output — telemetry lands in local logs, no dashboard.

## Reversibility

Partially reversible:
- The isolated branch can be abandoned before Wave 5 merge if the migration proves
  more costly than estimated.
- After merge, reverting requires re-introducing per-agent regex parsers in each consumer skill.
- Schema file is metadata-only — no production code impact outside agent prompt and orchestrator.

## References

- PRD: `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/PRD.md`
- Inventory: `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/INVENTORY.md`
- Canonical doc: `docs/design-docs/subagent-contract-v1.md` (created in phase-02)
- Schema: `agents/_contract/v1.schema.json` (created in phase-03)
- Every guide: "Agent-native Architectures" — Eixo 1 (completion signal, reasoning,
  parseable output, prompts as features, granularity)
