# Populate: docs/SECURITY.md

**Guidance file:** `skills/init/assets/populate-guidance/docs-security-md.md`
**Validation command:** `bun run harness:validate`
**Depends on:** — (independent)

**Detection signals (grep before writing):**
- `process.env\.`
- `JWT_SECRET`
- `cors\(`
- `helmet\(`

## Goal

Document the security posture: auth, secrets handling, data classification.

## Scope

**In:**
- Auth model
- Secrets handling

**Out:**
- Pentest reports (lives elsewhere)

## Assumptions

- Project has auth in scope

## Risks

| Risco | Mitigacao |
|-------|-----------|
| Secrets leaked to logs | Use redactor in logger |

## Execution Steps

### Wave 1 — Discovery

- grep `process.env`
- list auth middlewares

### Wave 2 — Write sections

- Write H2: Auth Flow
- Write H2: Secrets

**Must cover (per H2 in target doc):**

- **Auth Flow**
  - provider
  - session lifecycle
  - refresh strategy
- **Secrets**
  - where stored
  - rotation policy
  - access audit

**Required outbound links:**

- docs/ARCHITECTURE.md#components
- docs/MERGE_GATES.md

**Stack variants:**

- `rails`: See devise + rails-secrets conventions
- `nextjs`: See next-auth + env.local conventions
- `node-ts`: See dotenv-safe + custom JWT conventions

## Review Checklist

- [ ] No real secrets in examples
- [ ] Auth flow links to source

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

## Compound Opportunity

Auth misconfigurations belong in docs/compound/ as a gotcha note.

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

## Exit Criteria

- [ ] harness:validate passes for docs/SECURITY.md
- [ ] Zero placeholders

---

## Final Report Contract

Quando esta fase for executada, o relatorio final DEVE listar:
- **Files added** — paths criados nesta fase
- **Files customized** — paths existentes que foram editados
- **Files unchanged** — paths inspecionados mas nao modificados (com razao)
- **Unresolved TODOs** — qualquer `TODO(<owner/context needed>): ...` deixado no doc
- **Validation result** — output de `bun run harness:validate`
- **First plan path** — proxima fase a executar (de `dependsOn` inverso)
