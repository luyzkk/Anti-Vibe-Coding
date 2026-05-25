---
topic: supabase-integration
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-supabase-auth (Infos/knowledge/NextJS/nextjs-supabase-auth/SKILL.md)
tier: 3
triggers: [supabase, RLS, auth.js, SSR, "@supabase/ssr", createServerClient, createBrowserClient, signed URL, edge function]
cross_stack_skills: [/security]
updated: 2026-05-25
flagged_for_human_audit: true
---

# Supabase Integration

## When to consult

- When setting up Supabase Auth in a Next.js App Router project
- When choosing between `createBrowserClient` and `createServerClient` from `@supabase/ssr`
- When implementing middleware to protect routes and refresh sessions
- When handling OAuth callbacks (`exchangeCodeForSession`)
- When performing auth mutations (sign-in, sign-out) from Server Actions
- When reading the authenticated user in a Server Component
- RLS, signed URLs, edge functions: delegate to `supabase-backend` skill

## Senior patterns

### Pattern: Two clients — browser vs server

**Problem:** Using the browser Supabase client in server context bypasses cookie-based session management.

**Pattern:** Create two separate factories from `@supabase/ssr`. Browser client is a thin wrapper; server client reads and writes cookies via `next/headers`.

```ts
// lib/supabase/client.ts — for 'use client' files only
'use client'
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts — Server Components, Server Actions, middleware
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
}
```

**When NOT to use:** Never import `lib/supabase/server.ts` from a `'use client'` file.

---

### Pattern: Middleware for session refresh and route protection

**Problem:** Supabase sessions expire. Without middleware, stale cookies are silently treated as unauthenticated.

**Pattern:** In `middleware.ts`, call `supabase.auth.getUser()` to refresh the session on every request. Redirect unauthenticated users before the route handler runs.

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

---

### Pattern: OAuth callback route

**Problem:** OAuth redirects include a one-time `code` that must be exchanged for a session server-side.

**Pattern:** `app/auth/callback/route.ts` calls `exchangeCodeForSession(code)` and redirects to the intended destination.

```ts
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/auth/error`)
}
```

---

### Pattern: Server Actions for auth mutations

**Problem:** Client-side auth mutations don't invalidate the server-rendered layout cache, causing stale auth state.

**Pattern:** Sign-in and sign-out in `'use server'` files; call `revalidatePath('/', 'layout')` before redirecting.

```ts
// app/actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
```

---

## Anti-patterns

### `getSession()` for auth checks
`getSession()` does not verify the JWT. Use `getUser()` for any security-critical auth check.

### Browser client in server context
`createBrowserClient` in Server Components, Actions, or middleware cannot access `cookies()` from `next/headers`. Use `createServerClient`.

### Auth action without `revalidatePath`
Omitting `revalidatePath('/', 'layout')` after sign-in/sign-out leaves the layout cache stale, showing outdated auth state.

### Client-side route protection
`useEffect`-based redirects flash protected content before the redirect fires. Use middleware instead.

---

## Decision criteria

| If...                                             | Then...                                                             |
|---------------------------------------------------|---------------------------------------------------------------------|
| Supabase call in a `'use client'` component       | `createBrowserClient` from `@supabase/ssr`                          |
| Supabase call in Server Component, Action, middleware | `createServerClient` with `cookies()` handlers                  |
| Checking if user is authenticated                 | `getUser()` — never `getSession()` for security checks              |
| Using OAuth (Google, GitHub, etc.)                | Create `app/auth/callback/route.ts` with `exchangeCodeForSession`   |
| Sign-in or sign-out action                        | `revalidatePath('/', 'layout')` before redirect                     |
| Protected routes                                  | Middleware redirect — not client-side guards                        |
| RLS, signed URLs, edge functions                  | Delegate to `supabase-backend` skill                                |
