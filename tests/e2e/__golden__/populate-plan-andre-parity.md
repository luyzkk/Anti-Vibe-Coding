# Populate: docs/DESIGN.md

**Guidance file:** `skills/init/assets/populate-guidance/docs-design-md.md`
**Validation command:** `bun run harness:validate`
**Depends on:** ARCHITECTURE.md

**Detection signals (grep before writing):**
- `docs/design-docs/ADR-`
- `tailwind.config`
- `globals.css`
- `design-tokens`

## Goal

Document the visual and interaction design system: tokens, component guidelines, and design-to-code conventions.

## Scope

**In:**
- Design tokens (colors, spacing, typography)
- Component naming conventions
- Design-to-code handoff process
- Figma / design tool links if applicable

**Out:**
- Frontend implementation details (lives in docs/FRONTEND.md)
- Code style (lives in docs/CODE_STYLE.md)

## Assumptions

- Project has a UI layer
- Design tokens are defined somewhere (CSS vars, Tailwind config, or design file)

## Risks

| Risco | Mitigacao |
|-------|-----------|
| Design system described here drifts from implemented tokens | Link to actual token files (tailwind.config, CSS vars) rather than duplicating values |

## Execution Steps

### Wave 1 — Discovery

- Read `tailwind.config.ts`
- Read `src/app/globals.css`
- Read `src/components/ui/`

### Wave 2 — Write sections

- Write the H2 section: Design Tokens
- Write the H2 section: Component Guidelines
- Write the H2 section: Design-to-Code Conventions
- Write the H2 section: Design Tool Links

**Must cover (per H2 in target doc):**

- **Design Tokens**
  - links to actual token source files
  - color and spacing systems
- **Component Guidelines**
  - naming convention
  - atomic vs composed
- **Design-to-Code Conventions**
  - handoff process
  - who owns token definitions
- **Design Tool Links**
  - Figma URL or equivalent
  - access instructions

**Required outbound links:**

- ARCHITECTURE.md

## Review Checklist

- [ ] Token references link to actual source files
- [ ] No hardcoded values duplicated from source
- [ ] No placeholder text

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

## Compound Opportunity

Design patterns that prevent common UI bugs belong in docs/compound/ as reusable patterns.

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

## Exit Criteria

- [ ] harness:validate passes
- [ ] Token links resolve
- [ ] Zero placeholder lines

---

## Final Report Contract

Quando esta fase for executada, o relatorio final DEVE listar:
- **Files added** — paths criados nesta fase
- **Files customized** — paths existentes que foram editados
- **Files unchanged** — paths inspecionados mas nao modificados (com razao)
- **Unresolved TODOs** — qualquer `TODO(<owner/context needed>): ...` deixado no doc
- **Validation result** — output de `bun run harness:validate`
- **First plan path** — proxima fase a executar (de `dependsOn` inverso)
