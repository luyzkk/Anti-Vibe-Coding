---
topic: data-fetching-and-cache
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - research: wf-3d54ffa8 (Infos/knowledge/NextJS/compass_artifact_wf-3d54ffa8-d4c1-46aa-9d04-d38f637773ce_text_markdown.md)
  - research: wf-137d7e26 (Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md)
  - research: wf-dbd12769 (Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md)
tier: 1
triggers: [fetch, cache, force-cache, no-store, revalidate, revalidateTag, revalidatePath, unstable_cache, Data Cache, Full Route Cache, Router Cache, Request Memoization, segment config, dynamic]
cross_stack_skills: [/api-design, /system-design]
updated: 2026-05-25
---

# Data Fetching & Cache

## When to consult

- When choosing between `fetch` cache options (`force-cache`, `no-store`, `next.revalidate`)
- When wrapping a database query (non-`fetch`) in a cache boundary
- When calling `revalidateTag` or `revalidatePath` after a mutation
- When configuring segment-level caching with `export const dynamic` or `export const revalidate`
- When debugging stale data using the `x-nextjs-cache` response header

## Senior patterns

### Pattern: 4-layer cache mental model

Next.js App Router has four distinct cache layers. Confusing them leads to either stale data bugs or
unnecessary DB hammering. (Source: wf-3d54ffa8 RULE-CACHE-001)

| Layer | Scope | Populated by | Invalidated by |
|---|---|---|---|
| **Request Memoization** | Intra-render (single request) | `fetch` (auto) or `React.cache()` for ORM calls | End of render |
| **Data Cache** | Cross-request, persistent | `fetch` with `next: { revalidate, tags }` or `unstable_cache` | `revalidateTag`, `revalidatePath`, TTL |
| **Full Route Cache** | Build / ISR | Static build or on-demand ISR | `revalidatePath`, redeploy |
| **Router Cache** | Client navigation (browser) | Prefetch + navigation | Hard reload, router invalidation |

### Pattern: `fetch()` with explicit cache options

Always declare caching intent explicitly on cross-boundary fetches. Default behaviour changed between
Next.js versions. (Source: wf-dbd12769; wf-best-practices §7)

```ts
// Time-based ISR — revalidate every 60 seconds
const res = await fetch('https://api.example.com/products', {
  next: { revalidate: 60, tags: ['products'] },
})

// Always dynamic — opt-out of Data Cache
const res = await fetch('https://api.example.com/user', {
  cache: 'no-store',
})

// Static at build — explicit force-cache
const res = await fetch('https://api.example.com/config', {
  cache: 'force-cache',
})
```

**Next.js version note:** In Next.js 14, `fetch` in Server Components defaulted to `force-cache`. In
Next.js 15, GET Route Handlers are **uncached by default** ("fetch requests, GET Route Handlers, and
client navigations are no longer cached by default" — Next.js 15 release notes, per wf-dbd12769).
Always declare `dynamic` or `revalidate` explicitly when upgrading.

### Pattern: `unstable_cache` for non-`fetch` data (ORM / db queries)

`fetch` deduplication and the Data Cache apply only to `fetch` calls. ORM/db calls require explicit
wrapping. (Source: wf-3d54ffa8 RULE-CACHE-002)

```ts
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'

export const getProducts = unstable_cache(
  async () => db.select().from(products),
  ['products-all'],          // key parts
  { tags: ['products'], revalidate: 3600 }
)
```

For intra-render deduplication of ORM calls across multiple components, wrap with `React.cache()`:

```ts
import { cache } from 'react'
export const getUser = cache(async (id: string) =>
  db.query.users.findFirst({ where: eq(users.id, id) })
)
```

### Pattern: `revalidateTag` / `revalidatePath` in mutations only

Call invalidation functions inside Server Actions or Route Handlers — **never** inside a render or
inside `unstable_cache`. (Source: wf-3d54ffa8 RULE-CACHE-003)

```ts
// app/actions/posts.ts
'use server'
import { revalidateTag } from 'next/cache'

export async function createPost(data: FormData) {
  await db.insert(posts).values({ /* ... */ })
  revalidateTag('posts')            // precise tag invalidation
  // revalidatePath('/blog')        // full path invalidation (coarser)
}
```

### Pattern: Segment config for per-route caching strategy

Use file-level exports to control caching at the route segment level without touching individual
`fetch` calls. (Source: wf-dbd12769; wf-best-practices §7)

```ts
// force this segment dynamic — disables Full Route Cache
export const dynamic = 'force-dynamic'

// or pin to a revalidation window (ISR)
export const revalidate = 3600   // seconds; 0 = dynamic

// or force fully static
export const dynamic = 'force-static'
```

`using headers()` or `cookies()` anywhere in a Server Component automatically opts the segment out
of the Full Route Cache, making `force-dynamic` redundant for those routes.

## Anti-patterns

### Anti-pattern: Calling `revalidateTag` / `revalidatePath` inside a render

- **Symptom:** Cache invalidation called at the top of a Server Component or inside `unstable_cache`.
- **Why it's bad:** Next.js throws an explicit error; invalidation in render creates a feedback loop
  and is architecturally wrong — mutations happen in actions, not reads.
- **Fix:** Move `revalidateTag` / `revalidatePath` to the Server Action or Route Handler that
  performs the mutation, after the write completes. (Source: wf-3d54ffa8 RULE-CACHE-003)

### Anti-pattern: Assuming Next.js 14 fetch defaults in a Next.js 15 project

- **Symptom:** GET Route Handlers that relied on implicit `force-cache` now return fresh data every
  request, causing unexpected DB load after upgrading to Next.js 15.
- **Why it's bad:** "fetch requests, GET Route Handlers, and client navigations are no longer cached
  by default" in Next.js 15 (per wf-dbd12769). Silent behaviour change, not a compile error.
- **Fix:** Add explicit `export const dynamic = 'force-static'` and/or `export const revalidate = N`
  to Route Handlers intended to be cached. (Source: wf-dbd12769)

### Anti-pattern: Confusing Data Cache with Router Cache

- **Symptom:** Developer calls `revalidateTag('posts')` on the server but the browser still shows
  stale data after navigation.
- **Why it's bad:** Router Cache lives in the browser and is populated during prefetch/navigation.
  Server-side invalidation clears the Data Cache and Full Route Cache, but the client Router Cache
  may serve a prefetched version until it expires or the user hard-reloads.
- **Fix:** Understand that Router Cache is client-side only. For immediate visibility, trigger a
  router refresh (`router.refresh()`) from the client after mutation. (Source: wf-3d54ffa8 RULE-CACHE-001)

### Anti-pattern: `fetch` without explicit cache option in a critical project

- **Symptom:** `fetch(url)` with no `cache` or `next.revalidate` option; behaviour depends on
  Next.js version and context (Server Component vs Route Handler).
- **Why it's bad:** Implicit defaults change between versions. An audit cannot tell at a glance
  whether the route is static, ISR, or dynamic.
- **Fix:** Always set `cache: 'no-store'`, `cache: 'force-cache'`, or `next: { revalidate: N }`.
  Treat an implicit fetch as a code smell in production code. (Source: wf-best-practices §7)

## Decision criteria

| If... | Then... |
|---|---|
| Data changes rarely and is the same for all users | `fetch` with `cache: 'force-cache'` or `export const revalidate = N` (ISR) |
| Data must be fresh on every request | `fetch` with `cache: 'no-store'` or `export const dynamic = 'force-dynamic'` |
| Data changes on events (CMS publish, order placed) | Tag with `next: { tags: ['x'] }` + `revalidateTag('x')` in mutation action |
| Using an ORM/db directly (no `fetch`) | Wrap with `unstable_cache(fn, keys, { tags, revalidate })` |
| Same ORM call needed in layout + page + child (intra-render) | Wrap with `React.cache()` for request memoization |
| Route is in Next.js 15 and was previously relying on implicit GET caching | Add explicit `export const dynamic`/`revalidate` or set `cache` option |
| Debugging whether a response is served from cache | Check `x-nextjs-cache` response header: `HIT`, `STALE`, `MISS`, or `REVALIDATED` |
| Data is per-user (session-specific) | Keep route dynamic; do not use `force-cache` — risk of cross-user cache leak |

## External references

- `/api-design` — Route Handler caching defaults, `dynamic`/`revalidate` config for public endpoints
- `/system-design` — Choosing between Data Cache, Redis, and CDN layers for scale
