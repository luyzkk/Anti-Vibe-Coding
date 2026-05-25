---
topic: middleware-and-edge
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-supabase-auth (Infos/knowledge/NextJS/nextjs-supabase-auth/SKILL.md)
  - research: wf-c70ec330 (Infos/knowledge/NextJS/compass_artifact_wf-c70ec330-b004-4ac6-9ac3-68bd69bd9d99_text_markdown.md)
  - research: nextjs-security (Infos/knowledge/NextJS/deep-research-report.md)
tier: 1
triggers: [middleware, edge runtime, proxy, NextAuth, Clerk, Supabase auth, matcher, redirect, rewrite, cookies, runtime constraints]
cross_stack_skills: [/security]
updated: 2026-05-25
---

# Middleware & Edge Runtime

## When to consult

- When adding or modifying `middleware.ts` (Next ≤15) or `proxy.ts` (Next 16+) for auth, redirects, or rewrites
- When choosing `export const runtime = 'edge'` for a route and unsure whether it will work in production
- When integrating Supabase, NextAuth, or Clerk session refresh inside middleware
- When a route importing Prisma, `fs`, native `crypto`, or `bcrypt` is also marked as Edge
- When cookie reads or writes appear in a React Server Component (RSC) and you suspect it is wrong

## Senior patterns

### Pattern: Matcher config — run middleware only where needed

- **Problem:** Without `config.matcher`, middleware runs on every request including `_next/static`, `_next/image`, and `favicon.ico`, adding latency with zero benefit.
- **Pattern:** Export a `config` object that restricts matching to routes that actually need session work.
  ```ts
  // middleware.ts
  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  }
  ```
- **When to use:** Always. The matcher shown above is the canonical pattern from the Supabase auth skill and excludes static asset paths from middleware execution.
- **When NOT to use:** If a specific route truly needs header manipulation on every static asset request (rare; document the reason).

### Pattern: Edge runtime selection — middleware is always Edge, routes are not

- **Problem:** Declaring `export const runtime = 'edge'` on a route that imports Prisma, `fs`, native `crypto`, or `bcrypt` builds locally but breaks in production — Edge is a V8 isolate, not a faster Node.
- **Pattern:** Leave routes on Node runtime (the default). Use Edge only for middleware/proxy and for routes that exclusively use `fetch` + Web APIs (e.g., `crypto.subtle` via Web Crypto or `jose` for JWT).
  ```ts
  // route that needs Prisma — do NOT add runtime = 'edge'
  export async function GET() { /* uses PrismaClient */ }

  // route that is safe for Edge — only fetch + Web Crypto
  export const runtime = 'edge'
  export async function GET() { /* jose JWT verify */ }
  ```
- **When to use:** Middleware is always Edge (no declaration needed). For data routes: default Node unless the route is provably free of native modules and ISR is not needed.
- **When NOT to use:** Never combine `runtime = 'edge'` with `export const revalidate` — Edge does not support ISR per Next.js docs.

### Pattern: Session refresh in middleware + re-check in route

- **Problem:** Relying solely on middleware for auth leaves a single chokepoint. Documented bypass advisories show that middleware-only auth can be circumvented, making per-resource checks at the route/server-action level essential.
- **Pattern:** Middleware performs session refresh and an early redirect for clearly unauthenticated requests. The route (Server Component or Route Handler) independently verifies the user before touching data.
  ```ts
  // middleware.ts — refresh + early redirect only
  export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options))
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }
  ```
  ```ts
  // app/dashboard/page.tsx — independent re-check in the route
  export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    return <div>Welcome, {user.email}</div>
  }
  ```
- **When to use:** Any auth-protected route. The two-layer approach is the pattern shown in the Supabase auth skill.
- **When NOT to use:** The middleware-only check is intentionally an early redirect, not the authoritative gate. Never remove the route-level check.

### Pattern: `redirect()` vs `rewrite()` vs `NextResponse.next()`

- **Problem:** Choosing the wrong response primitive causes visible URL changes when rewrites were needed, or invisible routing when redirects were needed.
- **Pattern:**
  - `NextResponse.redirect(url)` — sends a 3xx to the client; URL in browser changes. Use for login redirects and canonical URL enforcement.
  - `NextResponse.rewrite(url)` — proxies to a different route transparently; URL stays the same. Use for A/B variants, locale routing, or feature-flag rewrites.
  - `NextResponse.next()` — passes the request through, optionally with modified headers/cookies. Use when middleware only needs to refresh a session or set a header.
- **When to use:** Redirect for auth gates. Rewrite for transparent routing (flags, locales). `next()` for pass-through with session cookie refresh.

### Pattern: Cookie handling — Server Actions and Route Handlers, not RSC

- **Problem:** Attempting to write cookies inside a React Server Component throws at runtime because RSCs cannot set response headers after streaming starts.
- **Pattern:** Read cookies anywhere server-side via `await cookies()`. Write cookies only in Server Actions, Route Handlers, or middleware.
  ```ts
  // Server Action — writing cookies is allowed
  'use server'
  import { cookies } from 'next/headers'
  export async function signOut() {
    const cookieStore = await cookies()
    cookieStore.set('session', '', { maxAge: 0 })
  }
  ```
- **When to use:** Whenever auth tokens, preferences, or session data need to be persisted. Use `cookies()` from `next/headers` in server contexts; use `response.cookies.set` in middleware.

## Anti-patterns

### Anti-pattern: Auth enforced only in middleware

- **Symptom:** Protected routes have no `getUser()` / session check inside the route — they rely entirely on `middleware.ts` to block unauthorized access.
- **Why it's bad:** The research source documents that this architecture has a history of documented bypass advisories. Middleware operates at the network boundary and can be circumvented through direct invocation patterns or misconfigurations that do not trigger the matcher. The Supabase auth skill's validation checks flag "Protected Routes Without Middleware" as a warning — not as a replacement for route-level checks.
- **Fix:** Always re-verify the session inside the Route Handler, Server Component, or Server Action. Middleware provides an early redirect UX improvement; the route provides the authoritative security gate. Cross-reference `/security` skill for depth on defense-in-depth.

### Anti-pattern: Node APIs in Edge runtime

- **Symptom:** A route file has `export const runtime = 'edge'` and imports `PrismaClient`, `fs`, `bcrypt`, `crypto` (Node), or `@aws-sdk/*`.
- **Why it's bad:** Edge is a V8 isolate distinct from Node. The source states: "Edge é um runtime distinto (V8 isolate), não apenas 'Node mais rápido'. Quebra em deploy, não em dev local." The build passes locally but fails in production.
- **Fix:** Remove `runtime = 'edge'` from the route (revert to Node default). If Edge latency is required, replace Node-specific libraries with Web-compatible equivalents: `jose` instead of `jsonwebtoken`, `Web Crypto` (`crypto.subtle`) instead of Node `crypto`, `@neondatabase/serverless` or Drizzle HTTP instead of Prisma.

### Anti-pattern: Missing matcher — middleware runs on everything

- **Symptom:** `middleware.ts` exports no `config` object, or `config.matcher` is an empty array / overly broad pattern.
- **Why it's bad:** Middleware executes on every request including static assets, causing unnecessary latency and session-refresh calls on `_next/static` files that have no cookies.
- **Fix:** Add `config.matcher` excluding static/image paths. The canonical pattern (from the Supabase auth skill): `['/((?!_next/static|_next/image|favicon.ico).*)']`.

### Anti-pattern: Writing cookies from an RSC

- **Symptom:** A Server Component (no `'use client'`) calls `cookieStore.set(...)` or attempts to mutate response cookies directly.
- **Why it's bad:** RSCs render during streaming; setting response headers after streaming has started is not supported. The Next.js implementation-playbook source shows cookie writes happening in Server Actions (`'use server'`) and Route Handlers, never inside plain RSCs.
- **Fix:** Move cookie writes to a Server Action, Route Handler, or middleware. RSCs can read cookies (`await cookies()` returns the current request cookies) but not write them.

## Decision criteria

| If...                                                              | Then...                                                                                  |
|--------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Route imports Prisma, `fs`, `bcrypt`, or native crypto             | Keep default Node runtime; never add `runtime = 'edge'`                                 |
| Route uses `export const revalidate` and also needs Edge           | Not possible — Edge does not support ISR; use Node runtime                               |
| Need to redirect unauthenticated users at the network boundary     | Use `NextResponse.redirect()` in middleware + re-verify in the route                    |
| Need to route to different pages without changing the browser URL  | Use `NextResponse.rewrite()` in middleware                                               |
| Need to refresh a session token on every request                   | Use `NextResponse.next()` after calling `supabase.auth.getUser()` in middleware         |
| Need to set a cookie after login/logout                            | Use Server Action or Route Handler — not an RSC                                          |
| Protecting a route — relying only on middleware check              | Add independent `getUser()` call in the route; middleware is UX, not the security gate  |
| Middleware runs on static assets causing overhead                  | Add `config.matcher` to exclude `_next/static`, `_next/image`, `favicon.ico`           |
| Need JWT verification in Edge (no Node crypto)                     | Use `jose` library or `crypto.subtle` (Web Crypto API) — both are Edge-compatible       |

## External references

- Next.js Middleware docs — official matcher config and response primitives
- Next.js Edge Runtime docs — list of supported/unsupported APIs
- Supabase SSR auth guide — `@supabase/ssr` `createServerClient` pattern for middleware cookie handling
- `/security` skill — defense-in-depth auth, documented bypass advisories for middleware-only auth patterns, OWASP auth hardening
