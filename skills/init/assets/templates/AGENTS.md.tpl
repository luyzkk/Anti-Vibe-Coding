# AGENTS.md

## Read Before Major Changes

- [ARCHITECTURE.md](./ARCHITECTURE.md): system boundaries, layering, and ownership.
- [docs/PLANS.md](./docs/PLANS.md): when to open an execution plan and how to keep it current.
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md): users, outcomes, product tradeoffs, and non-goals.
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md): current quality bar and the biggest gaps.
- [docs/SECURITY.md](./docs/SECURITY.md): security constraints and review checklist.

## Required Working Rules

1. Keep durable context in the repo, not only in chat history.
2. Update architecture or docs when code changes invalidate them.
3. Use an execution plan for substantial or multi-step work.
4. Prefer small diffs that preserve architectural boundaries.
5. Do not report completion while an active plan is still in `docs/exec-plans/active/`.
6. Run `bun run harness:validate` before opening a PR.

<!-- INIT:DELIVERY_LOOP_SLOT -->

## Pre-Mutation Gate

Before any edit, dependency install, codegen, or formatting rewrite, decide whether the task is substantial. If it is, read `AGENTS.md`, `ARCHITECTURE.md`, and the relevant active plan before editing.

If substantial work has no active plan, create one before mutation. If editing already started, stop, create or update the plan, record current state, then continue.

## Project context

- Name: {{PROJECT_NAME}}
- Stack: {{STACK}}
