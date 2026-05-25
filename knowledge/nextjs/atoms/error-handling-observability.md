---
topic: error-handling-observability
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - research: wf-e43ec982 (Infos/knowledge/NextJS/compass_artifact_wf-e43ec982-bbf2-400b-8685-9ad4b44c1618_text_markdown.md)
tier: 2
triggers: [error.tsx, global-error.tsx, not-found.tsx, ErrorBoundary, OpenTelemetry, OTel, Sentry, "@vercel/otel", logging, instrumentation.ts]
cross_stack_skills: [/system-design]
updated: 2026-05-25
---

# Error Handling and Observability

## When to consult

- When adding `error.tsx` or `global-error.tsx` to an App Router route segment
- When deciding between throwing vs returning a typed error in a Server Action or Route Handler
- When setting up `instrumentation.ts` for OpenTelemetry or Sentry
- When `notFound()` or `redirect()` is called inside a `try/catch` and silently fails
- When configuring Sentry for a Next.js 14+ project across Node, Edge, and Client runtimes

## Senior patterns

### Pattern: `error.tsx` per segment; `global-error.tsx` only at root

Place `error.tsx` alongside every `page.tsx` with meaningful failure risk. Reserve `app/global-error.tsx` for root layout failures — it replaces `<html>` and `<body>` entirely, so it must render them.

```tsx
// app/dashboard/invoices/error.tsx — must be 'use client'
"use client"
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert"><h2>Could not load invoices.</h2><button onClick={reset}>Retry</button></div>
}

// app/global-error.tsx — must include <html><body>
"use client"
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return <html><body><h2>Something went wrong.</h2><button onClick={reset}>Retry</button></body></html>
}
```

Source: `error.tsx` envolves `loading.tsx`, `not-found.tsx`, `page.tsx` and nested layouts in a React Error Boundary for that segment. It does not wrap the segment's own layout — `global-error.tsx` handles that case.

---

### Pattern: Expected errors as return values; unexpected as throws

Model domain errors (validation, not found, forbidden) as typed return values. Let infrastructure failures propagate as exceptions — the nearest `error.tsx` catches them.

```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; code: "VALIDATION" | "NOT_FOUND"; message: string }

export async function publishPost(input: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = PostSchema.safeParse(Object.fromEntries(input))
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: parsed.error.message }
  const post = await db.posts.create(parsed.data) // unexpected failure → throws → boundary
  return { ok: true, data: { id: post.id } }
}
```

The source states: *"For these errors, avoid using try/catch blocks and throw errors. Instead, model expected errors as return values."*

---

### Pattern: `notFound()` and `redirect()` outside `try/catch`

Next.js implements these helpers by throwing internal exceptions (`NEXT_REDIRECT`, `NEXT_NOT_FOUND`). A generic `catch` swallows them silently. Call them outside the `try` block. When inside a helper, use `unstable_rethrow(err)` at the top of `catch`.

```ts
"use server"
import { redirect } from "next/navigation"

export async function createInvoice(form: FormData) {
  let id: string
  try {
    id = (await db.invoices.create(InvoiceSchema.parse(Object.fromEntries(form)))).id
  } catch (err) {
    return { ok: false } as const
  }
  redirect(`/invoices/${id}`) // outside try
}
```

---

### Pattern: `instrumentation.ts` — Node/Edge split for OTel

Gate `@opentelemetry/sdk-node` behind `NEXT_RUNTIME === "nodejs"`. Use `@vercel/otel` for Edge. As of Next.js 15, `instrumentation.ts` is detected automatically without `experimental.instrumentationHook`.

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation.node")
  if (process.env.NEXT_RUNTIME === "edge") {
    const { registerOTel } = await import("@vercel/otel")
    registerOTel({ serviceName: "web-edge" })
  }
}
```

Source: *"Unlike @vercel/otel, NodeSDK is not compatible with edge runtime, so you need to make sure that you are importing them only when process.env.NEXT_RUNTIME === 'nodejs'."*

---

### Pattern: Sentry for Next.js — three init files + `withSentryConfig`

Use separate configs (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) to cover all runtimes. Keep `tracesSampleRate` low in production. Use `beforeSend` to strip PII before the event leaves the app.

```ts
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  sendDefaultPii: false,
  beforeSend(event, hint) {
    if ((hint.originalException as Error)?.name === "ZodError") return null
    if (event.user) delete event.user.email
    return event
  },
})
```

Source: `sendDefaultPii: true` activates sending of cookies and IP. The recommended approach is `beforeSend`/`beforeSendTransaction` to scrub sensitive data before it leaves the local environment.

---

## Anti-patterns

### Anti-pattern: `redirect()` or `notFound()` inside `try/catch`

- **Symptom:** Navigation helpers wrapped in a generic catch that logs but does not rethrow.
- **Why it's bad:** The framework's `NEXT_REDIRECT` / `NEXT_NOT_FOUND` exceptions are caught and swallowed — the redirect never fires, the 404 never renders.
- **Fix:** Move calls outside the `try` block; use `unstable_rethrow(err)` in helpers.

### Anti-pattern: `global-error.tsx` without `<html>` and `<body>`

- **Symptom:** Returns only a `<div>` — no document wrapper.
- **Why it's bad:** This file replaces the root layout; without `<html>/<body>` the browser receives an invalid document and shows a blank screen.

### Anti-pattern: `NodeSDK` without runtime guard in `instrumentation.ts`

- **Symptom:** `import { NodeSDK } from "@opentelemetry/sdk-node"` at top level.
- **Why it's bad:** `instrumentation.ts` loads in both runtimes — Edge build fails with "Module not found".
- **Fix:** `if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation.node")`.

### Anti-pattern: `tracesSampleRate: 1.0` in production

- **Symptom:** Flat `1.0` rate with no environment check in `sentry.server.config.ts`.
- **Why it's bad:** Cost scales with traffic; potential performance overhead.
- **Fix:** Use `0.05–0.2` in production; reserve `1.0` for development and for traces with errors.

---

## Decision criteria

| If...                                                        | Then...                                                                         |
|--------------------------------------------------------------|---------------------------------------------------------------------------------|
| A Server Component fetch fails at runtime                    | Let the error throw — `error.tsx` of the nearest segment handles it             |
| A Server Action receives invalid user input                  | Return a typed discriminated union; do not throw                                |
| A route segment can show a meaningful partial error          | Add `error.tsx` to that segment; keep it `"use client"`                         |
| Root layout itself crashes (e.g., auth provider fails)       | Handle in `global-error.tsx`; include `<html>` and `<body>`                     |
| Resource does not exist (domain 404)                         | Call `notFound()` outside any enclosing `try/catch`                             |
| Adding distributed tracing to App Router                     | Use `instrumentation.ts` with `register()`; split Node SDK and `@vercel/otel`  |
| Setting up error monitoring across all Next.js runtimes      | Use `@sentry/nextjs` with three init files + `withSentryConfig`                 |
| `sendDefaultPii` is `true` in Sentry config                  | Add `beforeSend` removing sensitive fields before event leaves the app          |
