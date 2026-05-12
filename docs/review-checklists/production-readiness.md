# Production Readiness Checklist

Verify before any release or merge to main.

## Tests and Quality
- [ ] `bun run test` passes (all tests green)
- [ ] `bun run typecheck` passes (zero type errors)
- [ ] `bun run harness:validate` exits 0
- [ ] `bun run compound:check` exits 0 (if compound notes touched)
- [ ] No lint errors (`bun run lint`)

## Documentation
- [ ] CHANGELOG.md updated with user-facing changes
- [ ] Version bumped in `package.json` and `plugin-manifest.json`
- [ ] New features documented in relevant `docs/` file

## Security
- [ ] Security checklist reviewed (see `review-checklists/security.md`)
- [ ] No hardcoded secrets in new code
- [ ] `.env.example` updated if new env vars added

## Release
- [ ] Git tag matches version in `package.json`
- [ ] Commit message follows conventional commits
- [ ] PR/MR reviewed by at least one human
