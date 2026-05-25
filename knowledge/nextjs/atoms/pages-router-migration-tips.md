---
topic: pages-router-migration-tips
stack: nextjs
layer: both
sources:
  - research: wf-191ad75d (Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md)
  - research: wf-720a98fd (Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md)
  - research: wf-ef986670 (Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md)
  - research: nextjs-smells (Infos/knowledge/NextJS/deep-research-report.md)
tier: 3
triggers: [pages router, app router, migration, getServerSideProps, getStaticProps, _app, _document, next/router, next/navigation, route handlers, coexistence]
cross_stack_skills: []
updated: 2026-05-25
---

# Pages Router Migration Tips

## When to consult

- Maintaining a Next.js 13+ project that still has routes under `pages/`
- Planning a gradual route-by-route migration from Pages Router to App Router
- Finding Pages Router patterns (`getServerSideProps`, `_app.tsx`, `next/router`) in greenfield code that should be App Router
- Deciding when to keep Pages Router routes and when to prioritize migration
- Dealing with a hybrid `app/` + `pages/` codebase and avoiding route duplication drift

## Senior patterns

### Pattern: Migration mapping — Pages API to App API

Consult the mapping table in **Decision criteria** below before any route migration. The mental model shift is: Pages Router is client-first with SSR opt-in via data APIs; App Router is server-first by default.

**Agent rule (wf-191ad75d, section 4):** In App Router, *never* introduce `getServerSideProps`/`getStaticProps`/`getStaticPaths`. In legacy Pages Router, *accept* but prefer incremental migration.

### Pattern: Gradual route-by-route migration (coexistence)

App Router and Pages Router can coexist in the same Next.js project. App Router has route precedence if there is a conflict. New routes go exclusively in `app/`; existing Pages routes are migrated one at a time.

```
src/
├── app/                 # New routes and migrated routes
│   └── dashboard/
│       └── page.tsx
└── pages/               # Legacy routes — keep until migrated
    └── reports/
        └── [id].tsx     # still uses getServerSideProps
```

**Strategy (wf-720a98fd, section 5 / R8):** Prioritize migrating routes that will gain the most from RSC, streaming, or Server Actions. Do not duplicate a route between `pages/` and `app/` — that creates two implementations with functional drift (smell NXR-MIG-018 in nextjs-smells).

**Strategy (wf-720a98fd, section 3.2):** In a hybrid project, Pages routes using `getServerSideProps` can be left in place while you extract their data logic into `server/dal/` first. This makes the eventual App Router migration cheaper: the route handler becomes thin, data logic is already in the DAL.

### Pattern: `getServerSideProps` → async Server Component

Dynamic data (unique per request) maps to an async Server Component with `fetch()` using `cache: 'no-store'`.

```tsx
// Before (Pages Router)
export async function getServerSideProps({ params }) {
  const post = await getPost(params.id)
  return { props: { post } }
}
export default function Page({ post }) { ... }

// After (App Router)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await fetch(`/api/posts/${id}`, { cache: 'no-store' }).then(r => r.json())
  return <article>...</article>
}
```

**Source (wf-191ad75d, section 4 table):** App Router data fetching uses `await` in Server Component with `fetch` and cache options; Pages Router uses `getServerSideProps`.

### Pattern: `getStaticProps` → async Server Component with cache

Static or periodically revalidated data maps to an async Server Component with `fetch()` using `cache: 'force-cache'` or ISR via `next: { revalidate: N }`.

```tsx
// Before (Pages Router)
export async function getStaticProps() {
  const posts = await getPosts()
  return { props: { posts }, revalidate: 60 }
}

// After (App Router)
export default async function Page() {
  const posts = await fetch('/api/posts', {
    next: { revalidate: 60 },
  }).then(r => r.json())
  return <PostList posts={posts} />
}
```

**Source (wf-191ad75d, section 4 table):** ISR in App Router uses `export const revalidate = N` or `fetch(url, { next: { revalidate: N } })`; in Pages Router it used `revalidate` inside `getStaticProps`.

## Anti-patterns

### Anti-pattern: Greenfield code in Pages Router

- **Symptom:** New route created as `pages/dashboard.tsx` in a project that has an `app/` directory.
- **Why it's bad:** Pages Router is kept in maintenance mode by the Next.js team. New routes should always go into `app/`. Per wf-720a98fd (section 2, matrix row 1): "App Router vs Pages Router (new project) — Use App Router. Pages Router only to preserve legacy."
- **Fix:** Create `app/dashboard/page.tsx`. Use `layout.tsx`, `loading.tsx`, `error.tsx` conventions instead of `_app.tsx` and manual loading state.

### Anti-pattern: Big-bang migration (migrate everything at once)

- **Symptom:** Attempting to move all `pages/` routes to `app/` in a single PR or sprint.
- **Why it's bad:** High risk of regression across SEO, caching, and authentication simultaneously. Per wf-720a98fd (R8): "Migrar por route group, começando pelas rotas que ganharão mais com RSC/streaming." The docs explicitly describe incremental migration.
- **Fix:** Migrate one route at a time. Use the hybrid coexistence model. Prioritize routes that benefit from RSC or Server Actions first.

### Anti-pattern: Keeping `next/router` in App Router routes

- **Symptom:** `import { useRouter } from 'next/router'` inside a file under `app/`.
- **Why it's bad:** `next/router` is Pages Router only. In App Router, use `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`). Per wf-191ad75d (section 4 table): metadata and navigation APIs differ between the two routers.
- **Fix:** Replace all `next/router` imports with equivalents from `next/navigation` in App Router files.

### Anti-pattern: Route duplication between `pages/` and `app/`

- **Symptom:** The same URL path exists both in `pages/reports.tsx` and `app/reports/page.tsx`.
- **Why it's bad:** Two implementations with functional drift (smell NXR-MIG-018 from nextjs-smells). App Router has route precedence, so the `pages/` version is silently dead — confusing and wasteful.
- **Fix:** Delete the Pages Router version once the App Router version is confirmed working. Never keep both.

## Decision criteria

| If (Pages API)... | Then (App equivalent)... |
|---|---|
| `pages/_app.tsx` | `app/layout.tsx` |
| `pages/_document.tsx` | `app/layout.tsx` (HTML structure, `<html>`, `<body>`) |
| `getServerSideProps` | async Server Component + `fetch()` with `cache: 'no-store'` |
| `getStaticProps` | async Server Component + `fetch()` with `cache: 'force-cache'` or `next: { revalidate }` |
| `getStaticPaths` | `generateStaticParams()` |
| `pages/api/*` | `app/api/*/route.ts` (Route Handlers with named exports: `GET`, `POST`, etc.) |
| `next/router` (`useRouter`, `usePathname`) | `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) |
| `pages/_error.tsx` | `app/error.tsx` (must be `'use client'`) |
| `pages/404.tsx` | `app/not-found.tsx` |
| Mutations via `pages/api/` + client `fetch` | Server Actions (`'use server'`) for internal mutations |
| `next/head` for metadata | `export const metadata` or `export async function generateMetadata()` |

**Source:** wf-191ad75d (section 4 comparison table), wf-720a98fd (sections 3.1–3.2, R8, R13), wf-ef986670 (section 2 table).

## External references

- Next.js Docs — App Router migration guide
- Next.js Docs — Pages Router (maintained for legacy)
- wf-720a98fd — R8: "Não use Pages Router para projetos novos; em legado, congele expansão e migre por rota"
- nextjs-smells — NXR-MIG-018: Strangler Route Migration (route duplicated between `pages/` and `app/`)
- nextjs-smells — NXR-RTE-019: Consolidate Backend Boundary (API Route and Route Handler for same domain)
