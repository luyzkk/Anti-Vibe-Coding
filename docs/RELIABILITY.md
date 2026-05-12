# Reliability — Failure Modes

## Hooks

Hooks must never crash the session. Pattern: try/catch around all logic, return `{ skipped: true }`
on error. Validator `harness:validate` skips broken hooks with warning, not error.

## Validators

`harness:validate` and `compound:check` exit 1 on real errors. Performance budget: <2s on 100 docs.
If exceeded, profile via `bun run state:regenerate --verbose`.

## Migration (`/init`)

Idempotent. Backup `.planning.v5-backup/` is mandatory before any mutation. `--dry-run` flag shows
diff without disk mutation. Rollback via `git revert {migration-commit}`.
