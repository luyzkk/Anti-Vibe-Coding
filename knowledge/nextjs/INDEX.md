<!-- 2026-05-24 (Luiz/dev): INDEX skeleton Plano01 fase-01. INDEX final consolidado em Plano03 fase-06 (layout completo: ## By Cross-Stack Skill + ## By Tier + ## By keyword com mappings das 4 skills). Alinhado com RF-01 + D15 + D16 do PRD. -->

# Next.js + React Knowledge — Index

Senior knowledge for Next.js (App Router 13+/14/15) and React conceptual patterns (hooks, Suspense, Server Components). 15 atoms covering app router, RSC, server actions, middleware, data fetching, rendering strategies, security, performance, testing, UI/styling, error handling, React hooks/state, Suspense, Supabase integration, and Pages Router migration. Cross-stack skills consume this INDEX via `getStackKnowledgePreface()` before the generic body.

> **Language note (D15 of PRD):** atoms in this matrix folder are written in **English**, aligned with official Next.js/React docs and the global ecosystem vocabulary (server components, suspense boundary, server actions). Other matrix folders — `knowledge/rails/` and `knowledge/nodejs-typescript/` — remain in PT-BR. Heterogeneity is a conscious trade-off; cross-stack skill prefaces emitted to a Next.js project will mix PT-BR (skill wrapper text) with EN (atom citations).
>
> **Shared matrix (D6 of PRD):** this folder serves both Next.js projects and pure React (Vite) projects. The detector maps StackId `'react'` to this same matrix via `STACK_ID_TO_MATRIX_FOLDER['react'] = 'nextjs'`. React-conceptual atoms (hooks, Suspense, RSC) are leveraged in both contexts; Next-specific atoms (app router, middleware, server actions) are also present but filtered by consultation, not download.

---

## By Cross-Stack Skill

<!-- Populated in Plano 03 fase-06 with mappings to /security, /react-patterns, /api-design, /system-design.
     Each subsection (### For /<skill>) lists atoms (≥2 per skill per CA-09). -->

### For /security

_To be populated after Plano 03 fase-01 (security-stack-specific atom)._

### For /react-patterns

_To be populated after Plano 02 fase-01 (react-server-components) + Plano 03 fase-01 (react-hooks-and-state) + fase-04 (react-suspense-patterns)._

### For /api-design

_To be populated after Plano 02 fases 01-04 (server-actions, app-router, data-fetching)._

### For /system-design

_To be populated after Plano 02 fase-04 (data-fetching), fase-05 (rendering-strategies with PPR), and Plano 03 fase-02 (performance-and-turbopack)._

---

## By Tier

<!-- Atoms listed as planned in PRD Section "Lista canônica de atoms (15)".
     Status column reflects which plan delivers each atom. -->

### Tier 1 — Every Next.js / senior React dev needs (7 atoms)

- `app-router-and-layouts` — App Router fundamentals, route handlers, layouts, dynamic/parallel/intercepting routes _(Plano 01 fase-03 — pilot)_
- `react-server-components` — server vs client boundaries, props serialization, useState/useEffect proibidos em RSC _(Plano 02 fase-01)_
- `server-actions-and-mutations` — `'use server'`, Zod validation, revalidatePath/Tag, progressive enhancement _(Plano 02 fase-02)_
- `middleware-and-edge` — runtime constraints, cookie handling, NextAuth/Clerk/Supabase auth _(Plano 02 fase-03)_
- `data-fetching-and-cache` — `fetch()` cache options, Next cache layers, revalidate, tags _(Plano 02 fase-04)_
- `security-stack-specific` — middleware auth, CSRF, RSC leaks, secret handling _(Plano 03 fase-01)_
- `react-hooks-and-state` — useState/useReducer/useFormState/useOptimistic _(Plano 03 fase-01)_

### Tier 2 — Common in mid-to-large apps (6 atoms)

- `rendering-strategies` — SSG/SSR/ISR + PPR (Next 15+ via `next_versions: ['>=15']` per D13) _(Plano 02 fase-05)_
- `performance-and-turbopack` — bundle, RSC payload, edge cold start _(Plano 03 fase-02)_
- `testing-strategy` — Playwright, RTL, RSC tests _(Plano 03 fase-02)_
- `ui-and-styling` — Tailwind, fonts, images, shadcn _(Plano 03 fase-03)_
- `error-handling-observability` — error.tsx boundaries, OTel integration _(Plano 03 fase-03)_
- `react-suspense-patterns` — Suspense boundaries, streaming, loading.tsx _(Plano 03 fase-04)_

### Tier 3 — Deep-dive / legacy (2 atoms)

- `supabase-integration` — RLS via SSR, server vs client clients, signed URLs _(Plano 03 fase-05)_
- `pages-router-migration-tips` — Pages → App Router migration _(Plano 02 fase-06)_

---

## By keyword

<!-- Populated in Plano 03 fase-06. Top-N keywords extracted from all atom triggers,
     consumed by formatKnowledgePreview() parser per RF-11. -->

_To be populated after all 15 atoms exist._

---

## Status

- Pilot atom: pending (Plano 01 fase-03)
- Detector adjustment: pending (Plano 01 fase-04)
- Tracer bullet E2E: pending (Plano 01 fase-05)
- Feature-driven atoms (6): pending (Plano 02)
- Cross-cutting + React + Integrations + INDEX final: pending (Plano 03)
