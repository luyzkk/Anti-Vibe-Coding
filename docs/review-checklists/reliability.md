# Reliability Review Checklist

Verify before merging changes to hooks, validators, migrations, or critical error paths.

## Error Handling
- [ ] All async paths have try/catch
- [ ] Errors surface meaningful messages (not generic "internal error")
- [ ] No silent swallowing of errors in critical paths

## Hooks
- [ ] Each hook has try/catch wrapping all logic
- [ ] Hook returns `{ skipped: true }` on error (never crashes session)
- [ ] Hook does not perform blocking I/O without timeout

## Validators
- [ ] `harness:validate` exits 1 on real errors, not warnings
- [ ] `compound:check` validates frontmatter correctly
- [ ] Validators complete in <2s on 100 documents

## Migrations (`/init`)
- [ ] Migration is idempotent (running twice is a no-op)
- [ ] `.planning.v5-backup/` created before any mutation
- [ ] `--dry-run` flag works correctly (no disk mutation)
- [ ] Rollback path documented and tested

## Fallbacks
- [ ] If `config/model-profiles.json` absent, falls back to agent frontmatter model
- [ ] If hook config missing, skill continues without hook

## Performance
- [ ] No unbounded loops over large file sets
- [ ] File I/O uses streaming where appropriate
