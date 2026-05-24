# Compound Engineering

Compound engineering means each meaningful unit of work should make the next unit easier. The repo should remember decisions, defects, review feedback, and production lessons in durable files that future humans and agents can find.

## Operating Loop

Use this loop for substantial work:

1. Plan: preserve scope, assumptions, risks, and validation expectations.
2. Work: implement the smallest safe slice.
3. Review: run automated checks and surface security, reliability, UI, and production risks.
4. Compound: capture reusable lessons in docs, scripts, specs, smoke recipes, or checklist updates.
5. Ship: report validation, smoke evidence when relevant, docs updates, rollout risks, and production prerequisites.

## Compound Decision Gate

Run this gate before finishing every bug fix or feature:

1. Ask whether a future human or agent could avoid a similar mistake, review comment, production issue, or implementation delay because of something learned in this work.
2. If yes, capture the lesson in the narrowest durable artifact:
   - `docs/compound/` for root causes, production bugs, non-obvious fixes, reusable implementation patterns, or operational lessons.
   - `docs/review-checklists/` for rules reviewers should apply again.
   - `docs/smoke-flows/` for manual browser recipes that should be repeated.
   - Specs or scripts for lessons that can be enforced mechanically.
   - Architecture, security, reliability, design, or quality docs when the system contract changed.
3. If no, record that no compound capture was needed in the final report or validation log, with a short reason.

Do not treat `compound-check` as the whole compound step. That command verifies hygiene; it does not decide whether the current work taught the repo something new.

## Production Readiness

Before saying the project is ready for production, summarize and provide step-by-step prerequisites for environment variables, credentials, database migrations, background workers, storage, email, provider webhooks, security settings, monitoring, logs, manual replay, and rollback paths.
