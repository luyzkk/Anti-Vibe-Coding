---
topic: react-suspense-patterns
stack: nextjs
layer: frontend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - research: wf-679242e8 (Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md)
tier: 2
triggers: [Suspense, suspense boundary, loading.tsx, streaming SSR, use() hook, React.lazy, parallel fetch, waterfall]
cross_stack_skills: [/react-patterns]
updated: 2026-05-25
---

# React Suspense Patterns

## When to consult

- When adding `loading.tsx` or `<Suspense>` to a route that fetches data
- When slow async Server Components block the entire page render
- When independent page sections should stream in separately
- When `error.tsx` and Suspense boundaries need to coexist on the same route
- For RSC + Suspense composition, also see `./react-server-components.md`

## Senior patterns

### Pattern: `loading.tsx` as automatic Suspense fallback per route

**Problem:** Missing `loading.tsx` leaves users with a blank screen during slow data fetches.

**Pattern:** Place `loading.tsx` alongside `page.tsx` in every route segment that makes async calls. Next.js wraps the page in a `<Suspense>` boundary automatically, using the export from `loading.tsx` as the fallback.

```
app/dashboard/
├── page.tsx
├── loading.tsx     # automatic Suspense fallback
├── error.tsx       # error boundary ('use client' required)
└── not-found.tsx   # notFound() call target
```

**When to use:** Any route that makes async calls or can encounter missing resources.

**When NOT to use:** Static pages with no data dependencies — skip `loading.tsx` to avoid a flash of skeleton.

---

### Pattern: Granular `<Suspense>` boundaries for independent streaming

**Problem:** Blocking the entire page on a slow data source delays First Contentful Paint for all users.

**Pattern:** Wrap slow async Server Components in individual `<Suspense>` boundaries with skeleton fallbacks. Each boundary is an independent streaming point — finer boundaries improve perceived TTFB. Fetch inside the async component, not in module scope.

```tsx
// app/product/[id]/page.tsx
import { Suspense } from 'react'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id) // blocks only the shell

  return (
    <div>
      <ProductHeader product={product} />

      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={id} />       {/* streams independently */}
      </Suspense>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={id} /> {/* streams independently */}
      </Suspense>
    </div>
  )
}

// Each component fetches its own data — no waterfall
async function Reviews({ productId }: { productId: string }) {
  const reviews = await getReviews(productId)
  return <ReviewList reviews={reviews} />
}
```

**When to use:** Any Server Component that fetches from a slow source. Group related items under one boundary to avoid aggressive "popping" (items appearing in random order). <!-- next_versions: >=13 -->

**When NOT to use:** Do not fetch in module scope (`const data = await fetch(...)` at the top of `page.tsx`) — this blocks the streaming shell entirely.

---

### Pattern: `error.tsx` as the error boundary around Suspense

**Problem:** Promises rejected inside async Server Components crash the subtree without user feedback.

**Pattern:** Provide `error.tsx` alongside `loading.tsx` at each route segment. In App Router, `error.tsx` acts as an error boundary for the segment and its `<Suspense>` boundaries. `error.tsx` must be a Client Component (`'use client'`).

```
app/dashboard/
├── page.tsx
├── loading.tsx    # Suspense fallback
└── error.tsx      # error boundary — 'use client' required
```

**When to use:** Any route that fetches data and can encounter runtime or network errors.

---

### Pattern: Parallel data fetching to avoid waterfalls

**Problem:** Awaiting multiple independent fetches sequentially multiplies latency — each fetch waits for the previous one to resolve.

**Pattern:** Initiate independent fetches in parallel using `Promise.all` (or by placing each fetch inside its own `<Suspense>`-wrapped async component). Colocating fetch inside the component that renders the data is the idiomatic App Router approach.

```tsx
// components/products/ProductList.tsx — Server Component
export async function ProductList({ category, sort, page }: ProductFilters) {
  // fetch runs in parallel with other <Suspense>-wrapped siblings
  const { products, totalPages } = await getProducts({ category, sort, page })
  return (
    <div>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}
```

**When to use:** Anytime two or more sibling components fetch independent data — wrap each in its own `<Suspense>` so they stream concurrently.

**When NOT to use:** When one fetch depends on the result of another — sequential `await` is required in that case; do not force parallel execution for dependent calls.

---

## Anti-patterns

### Anti-pattern: Fetching in module scope blocks streaming

**Symptom:** `const data = await fetch(...)` at the top of `page.tsx`, outside the component body.

**Why it's bad:** Fetch outside components runs in the shell — it blocks the streaming shell entirely. Streaming SSR requires the fetch to be inside an async component wrapped in `<Suspense>`.

**Fix:** Move fetch inside the async Server Component that renders the data. Wrap that component in `<Suspense>` with a skeleton fallback.

---

### Anti-pattern: Skipping `loading.tsx` or `error.tsx`

**Symptom:** Route has async data fetching but no `loading.tsx` or `error.tsx` sibling files.

**Why it's bad:** Without `loading.tsx`, users see a blank screen during fetch. Without `error.tsx`, errors produce an unhandled exception that may crash the entire page tree. Best practices require: "Don't ignore loading states — Always provide loading.tsx or Suspense."

**Fix:** Add both files alongside every `page.tsx` that performs async calls.

---

### Anti-pattern: Placing `notFound()` or `redirect()` after a suspending `await`

**Symptom:** `notFound()` is called after an `await` that suspends inside a streaming response.

**Why it's bad:** Status code must be set before the first chunk is sent. Per source: "Place notFound() before those boundaries and before any await that may suspend. To start streaming, the response headers must be set. This is why it is not possible to change the status code after streaming started."

**Fix:** Call `notFound()` or `redirect()` before any `await` that suspends.

---

## Decision criteria

| If...                                                              | Then...                                                                   |
|--------------------------------------------------------------------|---------------------------------------------------------------------------|
| Route makes async calls                                            | Add `loading.tsx` and `error.tsx` alongside `page.tsx`                    |
| Multiple independent slow data sources on same page               | Wrap each async component in its own `<Suspense>` boundary                |
| One slow section should not block the rest of the page            | Move fetch inside an async child component under `<Suspense>`             |
| Two async components fetch data that depends on each other        | Await sequentially inside one component — do not force parallel           |
| Fetch exists in module scope (`const data = await fetch(...)`)    | Move it inside the async component body                                   |
| `notFound()` or `redirect()` needed in a streaming route          | Call before any `await` that suspends                                     |
| Error during fetch should show user-friendly fallback             | Provide `error.tsx` (must be `'use client'`) alongside the route segment  |
