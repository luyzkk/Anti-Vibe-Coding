---
topic: react-server-components
stack: nextjs
layer: both
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-679242e8 (Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md)
  - research: wf-720a98fd (Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md)
tier: 1
triggers: [server components, client components, use client, RSC, props serialization, async components, streaming, boundaries]
cross_stack_skills: [/react-patterns]
updated: 2026-05-25
---

# React Server Components

## When to consult

- When deciding whether a component should be a Server Component or Client Component
- When a `layout.tsx` or `page.tsx` is marked `'use client'` and you suspect it should not be
- When passing data across the server/client boundary (props serialization)
- When adding streaming with `<Suspense>` or co-locating a Data Access Layer (DAL)
- When using `server-only` to guard against accidental client imports

## Senior patterns

### Pattern: Server-first by default; `'use client'` only at leaves

**Problem:** Marking layouts, pages, or container components `'use client'` pulls the entire subtree into the client bundle, destroying RSC benefits: bundle size grows, FCP worsens, and data fetching adds client waterfalls.

**Pattern:** Keep layouts and pages as Server Components (the default in App Router). Move `'use client'` to the specific leaf components that need `useState`, event handlers, `useEffect`, or browser APIs.

```tsx
// app/post/[id]/page.tsx — Server Component (default)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id) // DAL call, runs server-side
  return <article><h1>{post.title}</h1><LikeButton postId={post.id} /></article>
}

// app/ui/like-button.tsx
'use client'
export function LikeButton({ postId }: { postId: string }) { /* useState here */ }
```

**When to use:** Always in App Router. `'use client'` belongs at interactive leaves.

**When NOT to use:** Do not mark the entire page client just because one leaf needs state. Wrap only that leaf.

---

### Pattern: `server-only` as boundary guardian

**Problem:** Env vars without `NEXT_PUBLIC_` are silently replaced by an empty string in the client bundle — the module may still partially leak. A Client Component that imports a DAL file bypasses this protection.

**Pattern:** Add `import 'server-only'` as the first line of every module that contains secrets, DB clients, or SDK private keys. The bundler will throw a build error if a Client Component attempts to import it.

```ts
// server/dal/users.ts
import 'server-only'
import { db } from '@/server/db'

export async function getUserById(id: string) {
  return db.user.findUnique({ where: { id } })
}
```

**When to use:** Every file in `server/`, `server/dal/`, `lib/auth/`, and any wrapper around a private SDK.

**When NOT to use:** Utility functions that are genuinely isomorphic (pure formatters, validators with no secrets) — those belong in `lib/`, not behind `server-only`.

---

### Pattern: Composition — Server Component as `children` of a Client Component

**Problem:** A Client Component (e.g., a context provider or modal shell) needs to wrap server-rendered content. Importing a Server Component directly inside a `'use client'` file turns it into a Client Component.

**Pattern:** Pass the Server Component as `children` (or any prop) from a Server Component parent. The server tree is preserved; the Client Component receives the already-rendered RSC payload.

```tsx
// app/layout.tsx — Server Component
import { ThemeProvider } from '@/components/theme-provider' // 'use client'
import { UserNav } from '@/components/user-nav'             // Server Component

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <UserNav />   {/* server tree preserved — passed as children prop */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**When to use:** Any time a Client Component shell (provider, drawer, modal) needs to wrap server-rendered content.

**When NOT to use:** Do not import a Server Component file directly inside a `'use client'` file — that converts it to a Client Component.

---

### Pattern: Async Server Components + Suspense streaming

**Problem:** Blocking the entire page render on a slow data source delays FCP for all users.

**Pattern:** Server Components can be `async function`. Wrap slow async components in `<Suspense>` with a fallback. Each `<Suspense>` boundary is an independent streaming point — finer boundaries improve perceived TTFB.

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { RecentOrders } from './_components/recent-orders' // async Server Component
import { OrdersSkeleton } from './_components/orders-skeleton'

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<OrdersSkeleton />}>
        <RecentOrders />
      </Suspense>
    </main>
  )
}
```

**When to use:** Any Server Component that fetches data from a slow source. Provide `loading.tsx` alongside `page.tsx` for automatic Suspense at the route level.

**When NOT to use:** Do not fetch in module scope (`const data = await fetch(...)` at the top of `page.tsx`) — this blocks the streaming shell entirely.

---

## Anti-patterns

### Anti-pattern: `'use client'` on layout or page

**Symptom:** `app/layout.tsx` or `app/page.tsx` starts with `'use client'` to access a hook or context provider.

**Why it's bad:** `'use client'` is a module boundary. Everything imported below it enters the client bundle. Marking a container high in the tree forces all child components — even purely presentational ones — into the client bundle. In App Router, "layouts and pages are Server Components by default" — overriding this negates RSC benefits and introduces client-side data waterfalls.

**Fix:** Move `'use client'` to the specific leaf component (button, input, dropdown) that needs state or event handlers. Wrap only a third-party client-only library if that is the root cause, not the entire layout.

---

### Anti-pattern: Importing DAL or DB from a Client Component

**Symptom:** `import { db } from '@/server/db'` or `import { getUser } from '@/server/dal/users'` appears in a file that has `'use client'` (or is imported from one).

**Why it's bad:** Without `server-only`, the bundler silently includes the module in the client bundle, potentially leaking secrets and private SDK keys. With `server-only`, the build fails — but only if the guard is present.

**Fix:** Client Components never import DAL or DB directly. They receive data as serializable props passed from a Server Component parent, or they trigger mutations via Server Actions defined in a `'use server'` file.

---

### Anti-pattern: Using hooks that require state or DOM in a Server Component

**Symptom:** `useState`, `useEffect`, `useRef`, `useContext`, or any hook that depends on browser state appears in a file that is not marked `'use client'`.

**Why it's bad:** Server Components render on the server and do not hydrate. They have no component lifecycle and no access to browser APIs. React will throw an error at runtime.

**Fix:** If the component needs state, event handlers, or browser APIs, add `'use client'` to that file (or extract the interactive part into a new leaf file and add `'use client'` there). Server Components can be `async function` — use `await` for data fetching instead of `useEffect`.

---

### Anti-pattern: Passing non-serializable values across the boundary

**Symptom:** A Server Component passes a `Date`, `Map`, `Set`, class instance, or function as a prop to a Client Component.

**Why it's bad:** Props that cross the server/client boundary are serialized into the RSC payload. Only JSON-serializable types are supported. Non-serializable values cause a runtime serialization error.

**Fix:** Convert `Date` to ISO string (`date.toISOString()`) before passing as prop. Avoid passing functions as props from server to client (pass Server Actions via `'use server'` files instead). Pass plain objects and primitives.

---

## Decision criteria

| If...                                                          | Then...                                                                 |
|----------------------------------------------------------------|-------------------------------------------------------------------------|
| Component needs `useState`, event handlers, or browser APIs    | Add `'use client'`; keep it a leaf                                      |
| Component only fetches data and renders markup                 | Keep as Server Component (default); use `async function`                |
| Need to wrap server content in a client provider/shell         | Pass server tree as `children` prop — do not import server file inside client file |
| File contains secrets, DB client, or private SDK key          | Add `import 'server-only'` as first line                               |
| Slow data source is blocking the full page render              | Wrap the async component in `<Suspense>` with a fallback                |
| Passing a date or complex object across the boundary           | Serialize to primitive (ISO string, plain object) before passing as prop |
| Need to read DB data in multiple components on the same page   | Co-locate read in a DAL function wrapped with `React.cache()` — deduplicated per request |
| Client Component needs to trigger a server mutation            | Use a Server Action from a `'use server'` file — do not create a Route Handler just for internal UI |

## External references

- Cross-stack skills: `/react-patterns`
- Sources:
  - `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md`
  - `Infos/knowledge/NextJS/compass_artifact_wf-679242e8-4737-4aed-a21a-24366ed1a363_text_markdown.md` (rules 009–015, DD-5)
  - `Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md` (R1, R2, R3, AP1, AP8, AP11)
