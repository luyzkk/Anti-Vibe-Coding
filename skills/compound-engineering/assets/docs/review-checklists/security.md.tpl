# Security Review Checklist

Use for any change touching auth, input handling, secrets, or dependencies.

- [ ] All external inputs validated and sanitized
- [ ] AuthN and AuthZ applied on every protected route
- [ ] No secrets committed to version control
- [ ] No secrets exposed in logs, error messages, or client bundles
- [ ] Rate limiting in place on public endpoints
- [ ] Dependency audit run and clean (`bun audit` or equivalent)
- [ ] SQL / NoSQL queries use parameterized inputs; no string interpolation
- [ ] File uploads validated for type and size; stored outside web root

---

Replace this scaffold with project-specific content.
