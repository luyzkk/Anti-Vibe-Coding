# Production Readiness Checklist

Pre-release gate. All items must be checked before deploying to production.

## Code Quality
- [ ] All tests pass (`bun run test`)
- [ ] No lint errors (`bun run lint`)
- [ ] Typecheck clean (`bun run typecheck`)

## Security
- [ ] Security review checklist passed
- [ ] No secrets in codebase (`git log` scan + `bun audit`)

## Reliability
- [ ] Reliability review checklist passed
- [ ] Rollback plan documented

## Observability
- [ ] Error monitoring active and alert thresholds set
- [ ] Key flows covered by smoke tests

## Documentation
- [ ] AGENTS.md current
- [ ] ARCHITECTURE.md reflects current state
- [ ] CHANGELOG updated (if public-facing)

---

Replace this scaffold with project-specific content.
