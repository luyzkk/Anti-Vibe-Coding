<!-- 2026-05-25 (Luiz/dev): INDEX final consolidado Plano 03 fase-06. Layout D9 (by cross-stack skill + by tier + by keyword) em EN per D15. 15 atoms canonicos. -->

# Next.js + React Knowledge — Index

> Senior Next.js + React knowledge (Next 14+ App Router, React 18+). 15 atoms covering App Router, Server Components, Server Actions, middleware, data fetching, rendering strategies, security, performance, testing, UI/styling, error handling, React hooks, Suspense patterns, plus Supabase integration and Pages Router migration tips.
>
> **Heterogeneity note:** This matrix is written in **English** (aligned with Next.js/React official docs and global ecosystem vocabulary). Other matrix folders (`knowledge/rails/`, `knowledge/nodejs-typescript/`) remain in PT-BR. Cross-stack skill preface mixes PT-BR (skill wrapper text) with EN (atom citations) — accepted trade-off per D15.

---

## By Cross-Stack Skill

### For /security
- **middleware-and-edge** (T1) — middleware auth, runtime constraints, cookies handling, NextAuth/Clerk/Supabase auth patterns
- **security-stack-specific** (T1) — middleware auth, CSRF in Server Actions, RSC secret leaks (`server-only`), auth.js patterns

### For /react-patterns
- **react-server-components** (T1) — server vs client boundaries, props serialization, useState/useEffect forbidden in RSC
- **react-hooks-and-state** (T1) — useState/useReducer/useFormState/useOptimistic, interplay with Server Actions
- **react-suspense-patterns** (T2) — Suspense boundaries, loading.tsx, streaming SSR, use() hook (Next 15+)
- **rendering-strategies** (T2) — when to use static/dynamic/PPR (Next 15+)

### For /api-design
- **server-actions-and-mutations** (T1) — `'use server'`, when to use vs route handlers, validation with Zod, revalidatePath/Tag
- **data-fetching-and-cache** (T1) — `fetch()` with cache options, Next cache layers (data cache + full route cache), revalidate, tags
- **app-router-and-layouts** (T1) — route handlers, dynamic routes, parallel routes

### For /system-design
- **data-fetching-and-cache** (T1) — Next cache layers (data cache + full route cache), invalidation strategies
- **rendering-strategies** (T2) — SSG/SSR/ISR/PPR trade-offs
- **performance-and-turbopack** (T2) — bundle size, RSC payload, edge cold start, Turbopack vs Webpack
- **error-handling-observability** (T2) — error.tsx boundaries, OTel integration via instrumentation.ts

---

## By Tier

### Tier 1 — Every Next.js senior dev needs (7 atoms)
- `app-router-and-layouts` — App Router, nested layouts, parallel routes, route handlers
- `react-server-components` — server vs client boundaries, async components, RSC props serialization
- `server-actions-and-mutations` — `'use server'`, validation, revalidatePath, progressive enhancement
- `middleware-and-edge` — middleware.ts, edge runtime constraints, cookies, auth patterns
- `data-fetching-and-cache` — `fetch()` cache, Next cache layers, revalidate, tags
- `security-stack-specific` — middleware auth, CSRF, RSC secret leaks, auth.js patterns
- `react-hooks-and-state` — useState/useReducer/useFormState/useOptimistic patterns

### Tier 2 — Common in mid-size apps (6 atoms)
- `rendering-strategies` — SSG/SSR/ISR + PPR section (Next 15+)
- `performance-and-turbopack` — bundle, RSC payload, edge cold start
- `testing-strategy` — Playwright, RTL, async server component tests
- `ui-and-styling` — Tailwind, next/font, next/image, shadcn patterns
- `error-handling-observability` — error.tsx, global-error.tsx, OTel via instrumentation.ts
- `react-suspense-patterns` — Suspense boundaries, streaming, loading.tsx interplay with error.tsx

### Tier 3 — Niche / legacy (2 atoms)
- `supabase-integration` — `@supabase/ssr`, RLS via SSR, signed URLs, edge functions
- `pages-router-migration-tips` — Pages -> App Router migration for Next 13+ projects

---

## By keyword

| Keyword | Atoms |
|---|---|
| app router, layout, route handler, parallel route | [app-router-and-layouts](./atoms/app-router-and-layouts.md) |
| RSC, server component, "use client", props serialization | [react-server-components](./atoms/react-server-components.md) |
| server action, "use server", revalidatePath, mutation | [server-actions-and-mutations](./atoms/server-actions-and-mutations.md) |
| middleware, edge runtime, cookies, NextAuth, Clerk | [middleware-and-edge](./atoms/middleware-and-edge.md) |
| fetch, cache, revalidate, tags, data cache | [data-fetching-and-cache](./atoms/data-fetching-and-cache.md) |
| SSG, SSR, ISR, PPR, partial prerendering | [rendering-strategies](./atoms/rendering-strategies.md) |
| security, CSRF, RSC leak, auth.js, server-only | [security-stack-specific](./atoms/security-stack-specific.md) |
| Turbopack, bundle, RSC payload, edge cold start | [performance-and-turbopack](./atoms/performance-and-turbopack.md) |
| Playwright, RTL, Vitest, async server component test | [testing-strategy](./atoms/testing-strategy.md) |
| Tailwind, next/font, next/image, shadcn | [ui-and-styling](./atoms/ui-and-styling.md) |
| error.tsx, global-error, OTel, Sentry, instrumentation.ts | [error-handling-observability](./atoms/error-handling-observability.md) |
| useState, useReducer, useFormState, useOptimistic | [react-hooks-and-state](./atoms/react-hooks-and-state.md) |
| Suspense, loading.tsx, streaming, use() hook | [react-suspense-patterns](./atoms/react-suspense-patterns.md) |
| supabase, RLS, "@supabase/ssr", signed URL | [supabase-integration](./atoms/supabase-integration.md) |
| Pages Router, migration, getServerSideProps, getStaticProps | [pages-router-migration-tips](./atoms/pages-router-migration-tips.md) |

Coverage Next 14+ / React 18+. Next 15-only features (PPR, `use()` hook stable) marked with `next_versions: ['>=15']` in atom frontmatter (currently: `rendering-strategies`).
