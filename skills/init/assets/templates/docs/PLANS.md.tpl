# Plans

Open an execution plan when the work has any of these traits:

- more than one meaningful step
- non-trivial risk or migration work
- multiple files or moving parts
- a need to preserve rationale for future agents

## Pre-Mutation Gate

Before editing files, creating directories, installing dependencies, running code generators, or applying formatting rewrites, decide whether the task is substantial. If it is substantial, create or update an active plan first.

Required start checklist:

1. Read `AGENTS.md`.
2. Read this file.
3. Read `ARCHITECTURE.md`.
4. Read the relevant active plan, or create one with `bun run scripts/new-plan.ts "Title"`.
5. Verify the plan includes `Validation Log`, `Review Checklist`, `Compound Opportunity`, and `Lessons Captured`.

If implementation begins before a required plan exists, stop immediately, acknowledge the workflow miss, create or update the plan, and continue from the documented state.

## Workflow

1. Create a new plan with `bun run scripts/new-plan.ts "Title"`.
2. Track scope, assumptions, risks, review checklist, validation log, compound opportunity, lessons captured, and exit criteria.
3. Update the plan as decisions change.
4. Move completed plans from `docs/exec-plans/active/` to `docs/exec-plans/completed/`.

## Completion Gate

Planned work is not complete while its plan remains in `docs/exec-plans/active/`.

Before reporting completion:

1. Confirm the exit criteria are met.
2. Record validation commands and results in the plan.
3. Record the compound decision: link captured lessons or state why no new capture was needed.
4. Move the plan from `docs/exec-plans/active/` to `docs/exec-plans/completed/`.
5. Rerun `bun run harness:validate` after moving the plan.

If any follow-up work remains, keep the plan active and clearly mark the remaining or blocked items. Do not describe the work as complete.

## Final Report

When finishing planned work, report:

- plan path and whether it is active or completed;
- validations run and results;
- smoke evidence when relevant;
- compound capture created, or why no capture was needed.

---

## Template

Each plan follows the 10-section harmonized template: Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria. `bun run scripts/new-plan.ts` scaffolds it.

## Validators

This project ships with two validation scripts:

- `bun run harness:validate` — structural requirements: required files, AGENTS.md max 40 lines, AGENTS.md must link to ARCHITECTURE.md / docs/QUALITY_SCORE.md / docs/PRODUCT_SENSE.md, all internal markdown links must resolve, no orphan plans in `docs/exec-plans/active/`.
- `bun run compound:check` — each note in `docs/compound/` must have YAML frontmatter (`title`, `category`, `tags`, `created`) plus required H2 sections (`## Problem`, `## Solution`, `## Prevention`).

Exit codes:

- `0` — all checks passed.
- `1` — at least one rule failed; stderr lists each failure with rule name + file + message.
- `2` — script usage error.

Run both before opening a PR.
