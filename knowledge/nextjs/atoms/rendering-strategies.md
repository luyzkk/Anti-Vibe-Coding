---
topic: rendering-strategies
stack: nextjs
layer: both
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-137d7e26 (Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md)
  - research: wf-679242e8 (Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md)
  - research: wf-c70ec330 (Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md)
tier: 2
next_versions: ['>=15']
triggers: [SSG, SSR, ISR, PPR, Partial Pre-Rendering, Suspense, streaming, experimental.ppr, rendering, force-static, force-dynamic]
cross_stack_skills: [/react-patterns, /system-design]
updated: 2026-05-25
---

# Rendering Strategies

## When to consult

- When choosing between SSG, SSR, or ISR for a new route
- When a page has both static and dynamic sections and you are deciding on Suspense boundaries
- When configuring `revalidate` or `revalidateTag`/`revalidatePath` on-demand invalidation
- When evaluating whether to enable `experimental.ppr` for a hybrid page
- When a route is declared with `runtime = 'edge'` and also uses `revalidate`

## Senior patterns

### Pattern: SSG default with opt-in dynamic

- **Problem:** Marking every route as dynamic prevents CDN caching and increases TTFB.
- **Pattern:** App Router renders routes as static by default. A route becomes dynamic only when it reads request-time APIs (`cookies()`, `headers()`, `searchParams`). Avoid opting out without a reason.
  ```tsx
  // app/blog/[slug]/page.tsx — static by default (SSG at build)
  export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const post = await getPost(slug)
    return <article>{post.content}</article>
  }

  // opt into dynamic only when truly needed
  export const dynamic = 'force-dynamic' // reads cookies/session
  ```
- **When to use:** Content pages, marketing, docs — anything that does not vary per-user per-request.
- **When NOT to use:** Pages that read cookies, session, or per-user state — those should be dynamic.

### Pattern: ISR with `revalidate` and on-demand invalidation

- **Problem:** Fully static pages go stale; fully dynamic pages skip the CDN.
- **Pattern:** Export `revalidate` at the segment level for time-based ISR. Use `revalidateTag` / `revalidatePath` from a webhook or Server Action for on-demand invalidation.
  ```tsx
  // app/products/page.tsx
  export const revalidate = 3600 // rebuild at most every 1h

  // app/api/webhook/route.ts
  import { revalidateTag } from 'next/cache'
  export async function POST() {
    revalidateTag('products')
    return Response.json({ ok: true })
  }
  ```
- **When to use:** Public content that changes occasionally (blog, catalog, docs).
- **When NOT to use:** Edge runtime routes — Edge does not support ISR. Per wf-c70ec330: `export const runtime = 'edge'; export const revalidate = 60` is an incompatible combination; ISR requires durable cache storage that Edge does not provide.

### Pattern: Streaming with Suspense

- **Problem:** Without streaming, the server waits for all data before sending any HTML, so TTFB equals the slowest query.
- **Pattern:** Wrap slow data-fetching components in `<Suspense>` with a skeleton fallback. The route-level `loading.tsx` is an automatic Suspense boundary for the entire segment. Use explicit `<Suspense>` for finer control. Keep the LCP element outside any Suspense boundary.
  ```tsx
  // app/dashboard/loading.tsx — route-level Suspense (automatic)
  export default function Loading() {
    return <DashboardSkeleton />
  }

  // app/dashboard/page.tsx — explicit boundary for one slow section
  import { Suspense } from 'react'

  export default function Page() {
    return (
      <>
        <Hero />  {/* LCP element — outside Suspense */}
        <Suspense fallback={<RecsSkeleton />}>
          <SlowRecommendations />
        </Suspense>
      </>
    )
  }
  ```
- **When to use:** Any page where one section fetches from a slow upstream while the rest is fast.
- **When NOT to use:** Skip `loading.tsx` for fully static pages with no data dependencies — avoids unnecessary skeleton flash.

<!-- next_versions: >=15 -->
### Pattern: Partial Pre-Rendering (PPR) for hybrid pages

- **Problem:** A page has a large static shell (nav, product info) and a small dynamic section (user cart, personalization). Marking the entire route dynamic wastes CDN capacity; keeping it fully static excludes per-user content.
- **Pattern:** Enable `experimental.ppr` in `next.config.js`. The static shell is rendered at build time and served from CDN; dynamic slots are streamed at request time via Suspense boundaries.
  ```js
  // next.config.js
  module.exports = {
    experimental: { ppr: true },
  }
  ```
  ```tsx
  // app/product/[id]/page.tsx
  import { Suspense } from 'react'
  export const experimental_ppr = true

  export default function Product({ params }) {
    return (
      <>
        <ProductInfo id={params.id} />  {/* static shell */}
        <Suspense fallback={<CartSkeleton />}>
          <UserCart />  {/* dynamic, per-user */}
        </Suspense>
      </>
    )
  }
  ```
- **When to use:** Pages where the majority of content is static but a bounded section requires per-request data.
- **When NOT to use:** Fully dynamic pages (user dashboards where everything is personalized). Requires Next.js >=15 — do not enable on older versions.

## Anti-patterns

### Anti-pattern: Using PPR with Next.js <15

- **Symptom:** `experimental.ppr = true` in a project running Next 14 or earlier.
- **Why it's bad:** PPR is experimental and only stable in Next.js >=15; enabling it on earlier versions produces undefined behavior.
- **Fix:** Upgrade to Next.js >=15 before enabling `experimental.ppr`.

### Anti-pattern: SSR when SSG is sufficient

- **Symptom:** A public content page (blog post, marketing page) uses `force-dynamic` or reads `cookies()`/`headers()` unnecessarily.
- **Why it's bad:** Forces execution per request, prevents CDN caching, and increases TTFB. Per wf-137d7e26: the default App Router behavior is static — opting out without cause wastes CDN capacity.
- **Fix:** Remove `force-dynamic` and request-time API reads. Use `revalidate` for time-based freshness or `revalidateTag` for event-driven updates.

### Anti-pattern: Edge runtime + ISR

- **Symptom:** A route file declares both `export const runtime = 'edge'` and `export const revalidate = N`.
- **Why it's bad:** Per wf-c70ec330 (RULE-EXEC-003): "The Edge Runtime does not support Incremental Static Regeneration (ISR)." ISR requires durable cache storage that Edge does not provide. The combination silently fails or is rejected at deploy.
- **Fix:** Move the route to Node runtime, or replace ISR with `Cache-Control: s-maxage=..., stale-while-revalidate=...` headers managed manually.

### Anti-pattern: `force-dynamic` on a page that is 90%+ static

- **Symptom:** A page with a large static shell and one dynamic widget is marked `force-dynamic` or has a `cookies()` call at the page level instead of inside the dynamic component.
- **Why it's bad:** Per wf-137d7e26: "Forçar tudo dinâmico com `force-dynamic` quando 90% é estático" is an explicit anti-pattern. The entire page is excluded from CDN caching.
- **Fix:** Move the dynamic call into its own Server Component wrapped in `<Suspense>`. Keep the page shell static. Evaluate PPR (Next >=15) for maximum efficiency.

## Decision criteria

| If...                                                         | Then...                                                                 |
|---------------------------------------------------------------|-------------------------------------------------------------------------|
| Route has no per-user, per-request data                       | SSG (default) — no extra config needed                                  |
| Content changes on a schedule (not per user)                  | ISR: `export const revalidate = N`                                      |
| Content is invalidated by an event (CMS publish, webhook)     | ISR with `revalidateTag` / `revalidatePath` on-demand                   |
| Route reads `cookies()`, `headers()`, or `searchParams`       | Dynamic SSR — route opts out of static automatically                    |
| One section is slow; rest of page is fast                     | Streaming: wrap slow component in `<Suspense fallback={...}>`           |
| Route has `loading.tsx` but only one section is slow          | Replace route-level `loading.tsx` with explicit `<Suspense>` boundary   |
| Page is mostly static with a small dynamic slot (Next >=15)   | PPR: `experimental.ppr = true` + Suspense around dynamic slot           |
| Route declares `runtime = 'edge'` and needs caching           | Use `Cache-Control: s-maxage` headers — Edge does not support ISR       |
| LCP element is inside a Suspense boundary                     | Move LCP element outside Suspense to avoid TTFB delay on critical path  |

## External references

- `/react-patterns` — Suspense boundaries, error boundaries, concurrent rendering (useTransition, useDeferredValue)
- `/system-design` — caching layers, CDN strategy, stale-while-revalidate patterns
