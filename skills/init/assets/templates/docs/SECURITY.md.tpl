# Security

## Principles

- Treat all external input as untrusted until proven safe.
- Centralize secret handling in environment variables; never commit secrets.
- Defense in depth: validation at the edge, authorization at the service, RLS at the data layer.

## Review Checklist (snapshot)

- [ ] Input validation on every entry point
- [ ] AuthN + AuthZ on every protected route
- [ ] No secrets in logs, errors, or client bundles
- [ ] Rate limiting on public endpoints
- [ ] Dependency audit clean (`bun audit` or equivalent)

## Threat Model (placeholder)

Document the top 3 threats that matter for this project: data exfiltration, account takeover, supply-chain.

---

Replace this scaffold with project-specific content.
