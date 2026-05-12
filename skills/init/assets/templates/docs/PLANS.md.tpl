# Execution Plans

## When to open a plan

Open an execution plan when the work requires 3+ ordered steps or touches more than one architectural boundary. For micro-debt and quick follow-ups, use `TODO.md` instead.

## Lifecycle

1. Draft: create file in `docs/exec-plans/active/` with title slug.
2. Active: work through steps; check off Exit Criteria as you go.
3. Done: all Exit Criteria checked + Validation Log passed — move to `docs/exec-plans/completed/`.

## Template

Use `bun run new-plan "<title>"` to scaffold a new plan from the standard template.

## Review cadence

Review open plans at the start of each work session. Archive stale plans (no progress in 14+ days) with a note explaining why they stalled.

---

## Validators

This project ships with two validation scripts wired to CI:

- `bun run harness:validate` — checks structural requirements: 25 required files, AGENTS.md must stay at 40 lines or fewer, AGENTS.md must link to ARCHITECTURE.md / docs/QUALITY_SCORE.md / docs/PRODUCT_SENSE.md, all markdown links must resolve, no orphaned plans in `docs/exec-plans/active/`.
- `bun run compound:check` — checks each note in `docs/compound/` has YAML frontmatter (`title`, `category`, `tags`, `created`) plus the three required H2 sections (`## Problem`, `## Solution`, `## Prevention`).

Exit codes:

- `0` — all checks passed; stdout reports counts.
- `1` — at least one rule failed; stderr lists each failure with rule name + file + message.
- `2` — script usage error (invalid argv).

Combined run: `bun run harness:all`. Run before committing.
