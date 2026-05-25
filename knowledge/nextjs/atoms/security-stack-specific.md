---
topic: security-stack-specific
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-supabase-auth (Infos/knowledge/NextJS/nextjs-supabase-auth/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - research: wf-191ad75d (Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md)
tier: 1
triggers: [middleware auth, CSRF, RSC secret leak, secure cookies, server-only, authorization, authentication, XSS, dangerouslySetInnerHTML]
cross_stack_skills: [/security]
updated: 2026-05-25
---

# Next.js Security — Stack-Specific Patterns

## When to consult

- When protecting routes with `middleware.ts` or refreshing sessions
- When deciding between `getSession()` vs `getUser()` for auth checks
- When guarding server-only modules against accidental client import
- When validating Server Action inputs or setting cookies from a Server Action
- When adding a DAL (`lib/dal/`) to centralize DB access with auth checks

## Senior patterns

### Pattern: Middleware auth guard (Supabase SSR)

**Problem:** Client-side route protection shows a flash of protected content before the redirect.

**Pattern:** Use `middleware.ts` with `createServerClient` from `@supabase/ssr`. Call `supabase.auth.getUser()` — not `getSession()` — to refresh the session and redirect unauthenticated users before the page renders. Keep two separate client factories: `createBrowserClient` for `'use client'` files, `createServerClient` (with `cookies()` from `next/headers`) for Server Components and Actions.

```ts
// middleware.ts
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(/* env vars */, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cs) => cs.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)),
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user)
    return NextResponse.redirect(new URL('/login', request.url))
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

**When NOT to use:** Heavy DB logic or Node-only libraries in middleware — move that to a Server Component or Route Handler.

---

### Pattern: `import 'server-only'` as boundary guardian

**Problem:** Env vars without `NEXT_PUBLIC_` are silently replaced by an empty string in the client bundle; a Client Component importing a DAL file bypasses this protection.

**Pattern:** Add `import 'server-only'` as the first line of every module containing secrets, DB clients, or SDK private keys. The bundler throws a build error if a Client Component attempts to import it.

```ts
// lib/dal/users.ts
import 'server-only'
import { db } from '@/server/db'
export async function getUserById(id: string) {
  return db.user.findUnique({ where: { id } })
}
```

**When to use:** Every file in `lib/dal/`, `lib/auth/`, and any wrapper around a private SDK or DB client.

**When NOT to use:** Isomorphic utility functions (pure formatters, validators with no secrets).

---

### Pattern: Server Action for auth mutations

**Problem:** Server Actions are public HTTP endpoints — invocable via direct POST even without a UI button. Client-side auth mutations also don't invalidate the server-rendered layout cache.

**Pattern:** Perform sign-in and sign-out in `'use server'` files. For arbitrary user input, validate with `Schema.safeParse` before any DB write. Call `revalidatePath('/', 'layout')` after auth operations, before `redirect`.

```ts
'use server'
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
```

**When NOT to use:** Do not trust raw `FormData` without schema validation.

---

## Anti-patterns

### Anti-pattern: `getSession()` for security-critical checks

**Symptom:** `supabase.auth.getSession()` used in middleware or a Server Component to gate access.

**Why it's bad:** `getSession()` does not verify the JWT. Use `getUser()` for secure auth checks.

**Fix:** Replace every auth gate with `supabase.auth.getUser()`.

---

### Anti-pattern: Client-side-only route protection

**Symptom:** Auth check lives only in a Client Component — the page renders briefly before the redirect.

**Why it's bad:** Shows a flash of protected content; can be bypassed by disabling JavaScript.

**Fix:** Move protection to `middleware.ts`. Middleware runs before the page renders.

---

### Anti-pattern: `dangerouslySetInnerHTML` without sanitization

**Symptom:** `dangerouslySetInnerHTML={{ __html: userInput }}` with content from an external source.

**Why it's bad:** Enables XSS — arbitrary script injection.

**Fix:** Sanitize with DOMPurify; prefer normal React rendering wherever possible.

---

### Anti-pattern: Auth action without `revalidatePath`

**Symptom:** Sign-in or sign-out Server Action does not call `revalidatePath`.

**Why it's bad:** Cache shows stale auth state after login or logout.

**Fix:** Call `revalidatePath('/', 'layout')` after auth operations, before `redirect`.

---

## Decision criteria

| If...                                                      | Then...                                                             |
|------------------------------------------------------------|---------------------------------------------------------------------|
| Route must be protected before first render                | `middleware.ts` with `getUser()` + redirect                        |
| Checking auth inside a Server Component or Action          | `getUser()` — never `getSession()`                                 |
| Module contains DB client, SDK keys, or env secrets        | `import 'server-only'` as first line                               |
| Server Action receives FormData or external input          | `Schema.safeParse`; return errors as state                         |
| OAuth callback needed (Google, GitHub, etc.)               | `app/auth/callback/route.ts` to exchange code for session          |
| Rendering user-supplied HTML                               | Sanitize with DOMPurify; avoid `dangerouslySetInnerHTML`           |
| DB queries scattered across many Server Components         | Centralize in `lib/dal/` with `import 'server-only'` + auth checks |
