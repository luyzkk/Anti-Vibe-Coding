# Agent Instructions

This file is the single source of truth for working in this repository.
Read it fully before any non-trivial change.

## Working philosophy

- The human is the navigator. The agent is the pilot.
- Discipline beats speed. Tests come before production code.
- Never invent context. Read [ARCHITECTURE.md](./ARCHITECTURE.md) first.

## Required reading before changes

- [ARCHITECTURE.md](./ARCHITECTURE.md) — stack, folders, conventions
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) — current quality bar
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) — product north star

## Before reporting completion

Run the Compound Decision Gate: did this work teach the repo something
durable? If yes, capture in `docs/compound/`. If no, log why in the
exec-plan's "Lessons Captured" section.

## Standards

- Use `bun`, not `npm`.
- TypeScript strict. No `any`. Type guards over `as`.
- Tests first. `bun run test && bun run lint` before any commit.

## Project context

- Name: {{PROJECT_NAME}}
- Stack: {{STACK}}
