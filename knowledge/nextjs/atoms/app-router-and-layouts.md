---
tier: 1
title: "App Router & Layouts"
cross_stack_skills: ["/api-design", "/react-patterns", "/system-design"]
triggers: ["app router", "layout", "route handler", "dynamic route", "parallel route", "intercepting route", "page.tsx", "layout.tsx"]
next_versions: ["13.x", "14.x", "15.x"]
sources:
  - "Infos/knowledge/NextJS/nextjs-app-router-patterns/SKILL.md"
  - "Infos/knowledge/NextJS/nextjs-app-router-patterns V2/resources/implementation-playbook.md"
  - "Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md"
  - "Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md"
  - "Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md"
last_reviewed: "2026-05-24"
---

# App Router & Layouts

## When to consult

- When creating new routes, layouts, or API endpoints in a Next.js 13+ project
- When deciding between `layout.tsx` vs `template.tsx`, or Server Action vs Route Handler
- When implementing parallel routes (`@slot`) or intercepting routes (`(.)photos/[id]`)
- When migrating from Pages Router (`pages/api/`, `getServerSideProps`) to App Router
- When a `page.tsx` or `layout.tsx` is marked `'use client'` and you suspect it should not be

## Senior patterns

### Pattern: Server-first pages and layouts

- **Problem:** Marking `page.tsx` or `layout.tsx` as `'use client'` pulls all child components into the client bundle, destroying RSC benefits.
- **Pattern:** Keep layouts and pages as Server Components. Isolate interactivity in small leaf components. Pass server-fetched data as props or `children`.
  ```tsx
  // app/post/[id]/page.tsx — Server Component (default)
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const post = await getPost(id)
    return <article><h1>{post.title}</h1><LikeButton postId={post.id} /></article>
  }
  // app/ui/like-button.tsx
  'use client'
  export function LikeButton({ postId }: { postId: string }) { /* useState here */ }
  ```
- **When to use:** Always in App Router. `'use client'` belongs at leaf components that need state, event handlers, or browser APIs.
- **When NOT to use:** When a third-party library requires client context at the root — wrap only that library in a client boundary, not the entire page.

### Pattern: File conventions for loading and error states

- **Problem:** Missing `loading.tsx` or `error.tsx` leaves users with blank screens during slow fetches or runtime errors.
- **Pattern:** Provide `loading.tsx` (automatic Suspense) and `error.tsx` (automatic Error Boundary) alongside every `page.tsx` that fetches data. Use `not-found.tsx` for 404 flows.
  ```
  app/dashboard/
  ├── page.tsx
  ├── loading.tsx     # Suspense fallback
  ├── error.tsx       # Error boundary ('use client' required)
  └── not-found.tsx   # notFound() call target
  ```
- **When to use:** Any route that makes async calls or can encounter missing resources.
- **When NOT to use:** Static pages with no data dependencies — skip `loading.tsx` to avoid flash of skeleton.

### Pattern: Parallel routes for independent loading states

- **Problem:** Dashboard sections block each other when one slow data source delays the entire layout.
- **Pattern:** Use `@slot` convention in the layout to render sections independently with their own `loading.tsx`.
  ```tsx
  // app/dashboard/layout.tsx
  export default function DashboardLayout({ children, analytics, team }: {
    children: React.ReactNode; analytics: React.ReactNode; team: React.ReactNode
  }) {
    return <div className="grid"><main>{children}</main><aside>{analytics}</aside><aside>{team}</aside></div>
  }
  // app/dashboard/@analytics/page.tsx — fetches independently
  ```
- **When to use:** Dashboard sections, sidebars, or tabs that load from different slow sources.
- **When NOT to use:** Simple pages where sections share one data fetch — add complexity only when independent loading is needed.

### Pattern: Intercepting routes for modal overlays

- **Problem:** Navigating to a detail page loses list context; rebuilding modal state with client-side state is fragile.
- **Pattern:** Use `(.)resource/[id]` convention for in-place modal; the full page exists at `resource/[id]/page.tsx` for direct navigation and refresh.
  ```
  app/
  ├── @modal/(.)photos/[id]/page.tsx   # intercepted: renders as modal
  ├── @modal/default.tsx               # renders null when not intercepted
  └── photos/[id]/page.tsx             # full page for direct URL access
  ```
- **When to use:** Photo galleries, item detail drawers, confirmation dialogs that preserve the background page.
- **When NOT to use:** Forms that mutate state — prefer Server Actions; modal complexity is high, add only when UX justifies it.

### Pattern: Route Handlers for external callers

- **Problem:** Using Server Actions for webhooks or mobile clients breaks because Server Actions are POST-only React primitives, not general HTTP endpoints.
- **Pattern:** Export named HTTP verb functions from `app/api/.../route.ts` using Web Fetch primitives.
  ```ts
  // app/api/products/[id]/route.ts
  export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return Response.json({ id })
  }
  ```
- **When to use:** Webhooks, public REST APIs, GET endpoints shared with mobile/3rd-party, or any caller that is not your own React app.
- **When NOT to use:** Mutations called only from your React UI — use Server Actions instead (`'use server'`).

## Anti-patterns

### Anti-pattern: `'use client'` on layout or page container

- **Symptom:** `layout.tsx` or `app/page.tsx` starts with `'use client'` to use a hook or context.
- **Why it's bad:** Forces the entire subtree into the client bundle. In App Router, "layouts and pages are Server Components" by default — overriding this negates RSC bundle benefits and introduces client-side data waterfalls.
- **Fix:** Move `'use client'` to the specific leaf component (button, input, dropdown) that needs state or event handlers. Pass data as props from the Server Component parent.

### Anti-pattern: `pages/api/` in an App Router project

- **Symptom:** New API endpoint added as `pages/api/users.ts` alongside `app/` routes.
- **Why it's bad:** Mixes routing systems. Next.js docs: "Route Handlers are the equivalent of API Routes inside the pages directory meaning you do not need to use API Routes and Route Handlers together."
- **Fix:** Use `app/api/users/route.ts` with named exports (`GET`, `POST`) using Web Fetch primitives instead of `NextApiResponse`.

### Anti-pattern: Over-nesting layouts

- **Symptom:** Each route segment has its own `layout.tsx` wrapping 1-2 child components with no shared UI.
- **Why it's bad:** Each layout adds to the component tree and increases hydration cost. The source advises "Don't over-nest layouts — Each layout adds to the component tree."
- **Fix:** Colocate layout only when there is actual shared UI (nav, sidebar, header) that persists across child routes. Use route groups `(groupName)` to organize without adding layout overhead.

## Decision criteria

| If...                                               | Then...                                                   |
|-----------------------------------------------------|-----------------------------------------------------------|
| Caller is your own React form or event handler      | Use Server Action (`'use server'`)                        |
| Caller is Stripe webhook, mobile app, or 3rd party  | Use Route Handler (`app/api/.../route.ts`)                |
| UI shared across sibling routes, persists on nav    | Use `layout.tsx`                                          |
| UI remounts on every navigation (e.g. animations)  | Use `template.tsx` instead of `layout.tsx`                |
| Route needs independent loading per section         | Use parallel routes (`@slot` + `loading.tsx` per slot)    |
| Detail view should overlay list without losing context | Use intercepting route `(.)resource/[id]`              |
| Page has dynamic data unique per request            | Dynamic Server Component — no `export const revalidate`   |
| Page is mostly static, updates periodically         | Add `export const revalidate = N` or `fetch` ISR options  |
| New project — App Router vs Pages Router            | Always App Router; Pages Router only for existing legacies |

## Edge cases

### Monorepo with Next.js root and Vite sub-package

When the repository root contains `package.json#dependencies.next` **and** a sub-package contains `vite.config.ts`, `detectStack` returns `primary: 'nextjs'` and `secondary: ['react']`. This is expected behavior — `probeNextjs` takes precedence over `probeReact` per the detection order (`probeNextjs → probeReact → probeNodeTs`). The `secondary: ['react']` entry indicates a co-located React context (e.g. a Storybook or Vite-based design system package). This is not a bug. If the signal is noisy, capture telemetry before coding a fix (CA-03 of the PRD covers this via assertion).
