# Anti-Vibe Coding Plugin — Agent Index

This plugin enforces XP discipline for AI-assisted development. Human navigates, agent pilots.

## Core Beliefs

Plan before code. Test before implement. Capture lessons after merge. Discipline beats speed.

## When to Read What

| Situation | Read |
|---|---|
| Understanding the plugin pipeline (grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate) | `docs/PIPELINE.md` |
| Configuring model profiles per agent (quality/balanced/budget) | `docs/MODEL_PROFILES.md` |
| Listing available subagent auditors | `docs/AGENTS_LIST.md` |
| Versioning, manifest checksums, update strategies | `docs/UPGRADE.md` |
| Senior principles (security, quality, architecture defaults) | `docs/design-docs/core-beliefs.md` |
| Past architectural decisions with rationale | `docs/design-docs/ADR-*.md` |
| Lessons captured from real bugs | `docs/compound/*.md` |
| Active execution plans | `docs/exec-plans/active/` |
| Completed plans (historical reference) | `docs/exec-plans/completed/` |
| Plugin architecture (skills/hooks/scripts/lib layout) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Quality score rubric (review checklist scoring) | [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) |
| Product sense (when to push back on requirements) | [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) |

## Compound Decision Gate

Before reporting completion: did this work teach the repo something durable?
If yes, ask the human to run `/anti-vibe-coding:lessons-learned` so the lesson gets captured in `docs/compound/`.
If no, log why no capture was needed in the plan's Lessons Captured section.

## Validation

Run `bun run harness:validate` before any commit that touches `docs/` structure.
Run `bun run compound:check` after adding/editing compound notes.
