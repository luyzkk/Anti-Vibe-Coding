---
topic: performance-and-turbopack
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-turbopack (Infos/knowledge/NextJS/nextjs-turbopack/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - research: wf-137d7e26 (Infos/knowledge/NextJS/compass_artifact_wf-137d7e26-bf2a-4125-9488-d18334997421_text_markdown.md)
tier: 2
triggers: [Turbopack, bundle size, RSC payload, edge cold start, code splitting, dynamic import, next/dynamic, profile build, build performance, webpack]
cross_stack_skills: [/system-design]
updated: 2026-05-25
---

# Performance and Turbopack

## When to consult

- When dev startup or HMR is slow in a Next.js 16+ project
- When First Load JS per route exceeds ~150KB gzipped
- When a route has TTFB > 1s and server-side causes need diagnosis
- When adding a heavy chart, map, or editor that should not ship in the initial bundle
- When a serverless function has a cold start above 1s

## Senior patterns

### Pattern: Turbopack for dev, bundle analyzer for production

Next.js 16+ uses Turbopack by default in `next dev`. It uses a file-system cache so restarts reuse prior work — the source cites 5–14x faster cold starts in large projects vs Webpack. For production bundle auditing, run `ANALYZE=true next build` to open `client.html`, `edge.html`, `nodejs.html` in `.next/analyze/`. In Next.js 16.1+ there is also a Turbopack-aware analyzer via `next build --turbo --analyze`.

```bash
next dev                  # Turbopack active by default
next dev --webpack        # fall back only when a webpack-only plugin is required
ANALYZE=true pnpm build   # production bundle audit
```

Run the bundle analyzer before every PR that adds a new dependency or creates a new page. Keep First Load JS per route at or below ~150KB gzipped.

### Pattern: `next/dynamic` for heavy non-critical components

Wrap heavy components (charts, editors, maps) in `next/dynamic` inside a `'use client'` file. In App Router, `ssr: false` is restricted to Client Components.

```tsx
'use client'
import dynamic from 'next/dynamic'
const Chart = dynamic(() => import('./chart'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
})
```

Do not use `dynamic(import('x'), { ssr: false })` inside a Server Component — it does not work in App Router. Do not wrap lightweight components; overhead exceeds gain.

### Pattern: Specific imports and `optimizePackageImports`

Tree-shaking does not reliably work with barrel exports, especially CommonJS. Use specific imports and configure `next.config.js`:

```js
experimental: { optimizePackageImports: ['lucide-react', 'date-fns'] }
```

Prefer `import debounce from 'lodash/debounce'` over `import _ from 'lodash'`. Replace `moment` with `date-fns` or `dayjs`.

### Pattern: Lazy SDK imports to reduce cold start

Load heavy SDKs (AWS SDK, OpenAI, Firebase Admin) on demand inside the handler body. Prefer AWS SDK v3 (modular) over v2. Guard `instrumentation.ts` by `NEXT_RUNTIME`:

```ts
export async function POST() {
  const { S3Client } = await import('@aws-sdk/client-s3')
}
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
}
```

### Pattern: Parallelize server fetches; stream slow sections

Sequential `await` on independent server fetches creates server-side waterfalls. Use `Promise.all`; wrap slow isolated sections in `<Suspense>`. Keep the LCP element outside any `<Suspense>` boundary.

```tsx
const [user, orders] = await Promise.all([getUser(), getOrders()])
return <>
  <Header user={user} />
  <Suspense fallback={<RecsSkeleton />}><SlowRecommendations /></Suspense>
</>
```

Use `Promise.allSettled` when partial failure should not block the whole page.

## Anti-patterns

**`'use client'` on layout or page root** — forces the entire subtree into the client bundle; RSC benefits are lost. Apply the leaf-component pattern. RSC pages well-structured can reach 50–80KB JS per route.

**`dynamic(..., { ssr: false })` inside a Server Component** — not supported in App Router. Move the dynamic import to a `'use client'` wrapper file.

**Barrel imports from large libraries** — `import _ from 'lodash'` or `import moment from 'moment'` ship the entire library due to tree-shaking failures. Use specific path imports or lighter alternatives.

**`<Suspense>` wrapping the LCP element** — delays the LCP element and raises LCP directly. Keep it in the streaming shell.

**Profiling in development mode** — `next dev` includes on-demand compilation overhead; React Strict Mode renders components twice. Always benchmark with `next build && next start`.

## Decision criteria

| If... | Then... |
|---|---|
| Dev startup or HMR is slow | Confirm Turbopack is active (Next.js 16+ default); do not clear cache unnecessarily |
| First Load JS > 150KB | Run `ANALYZE=true next build`; apply `next/dynamic` or specific imports |
| Component > ~30KB and not on the critical path | Wrap with `next/dynamic` + skeleton in a `'use client'` file |
| Cold start > 1s | Lazy-import SDKs; prefer AWS SDK v3; guard `instrumentation.ts` by `NEXT_RUNTIME` |
| Multiple independent server fetches | `Promise.all`; wrap slow isolated sections in `<Suspense>` |
| Route uses TCP DB driver or heavy native lib | `runtime = 'nodejs'`; do not force Edge |
| Route does auth check, geo lookup, header rewrite | Edge runtime (middleware or `export const runtime = 'edge'`) |
| `import _ from 'lodash'` or `import moment` found | Replace with specific path import or lighter library |
| Streaming suspected not working | `curl -N <url>` to confirm chunked transfer; verify CDN is not buffering |
