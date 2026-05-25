---
topic: server-actions-and-mutations
stack: nextjs
layer: backend
sources:
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-dbd12769 (Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md)
  - research: wf-ef986670 (Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md)
tier: 1
triggers: [server actions, use server, mutations, revalidatePath, revalidateTag, useFormState, useFormStatus, progressive enhancement, Zod validation, CSRF]
cross_stack_skills: [/api-design]
updated: 2026-05-25
---

# Server Actions & Mutations

## When to consult

- When writing a form submission or any mutation called only from your own React UI
- When choosing between a Server Action and a Route Handler for a data-changing operation
- When implementing form feedback (validation errors, pending state) with `useActionState` / `useFormStatus`
- When deciding where to call `revalidatePath` or `revalidateTag` after a mutation
- When wiring Zod validation inside a Server Action

## Senior patterns

### Pattern: Server Action as the default for internal mutations

- **Problem:** Using a Route Handler (`app/api/.../route.ts`) for a form mutation that only your own React app calls adds an unnecessary HTTP boundary.
- **Pattern:** Mark the function `'use server'`, validate with Zod `safeParse`, mutate, then call `revalidatePath`/`revalidateTag` **before** `redirect`. `redirect` throws an exception — any code placed after it will not run.
  ```ts
  // app/posts/actions.ts
  'use server'
  import { z } from 'zod'
  import { revalidateTag } from 'next/cache'
  import { redirect } from 'next/navigation'

  const Schema = z.object({ title: z.string().min(3), body: z.string().min(1) })
  type State = { errors?: Record<string, string[]> }

  export async function createPost(_prev: State, formData: FormData): Promise<State> {
    const parsed = Schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }
    await db.post.create({ data: parsed.data })
    revalidateTag('posts')
    redirect('/posts')
  }
  ```
- **When to use:** Any mutation initiated by your own React form or event handler.
- **When NOT to use:** Webhooks, REST APIs consumed by mobile/3rd-party clients, or cron jobs — use Route Handler instead.

### Pattern: Zod validation at the server boundary

- **Problem:** Trusting client-side validation alone; the server accepts unvalidated input.
- **Pattern:** Call `Schema.safeParse(...)` at the top of every Server Action or Route Handler, before any DB write. Return `{ errors }` on failure. Even when RHF validates client-side, re-validate server-side with the same schema.
  ```ts
  const parsed = Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }
  // parsed.data is fully typed here
  ```
- **When to use:** Always — client validation is bypassable.

### Pattern: revalidatePath vs revalidateTag

- **Problem:** After a mutation, the UI still shows stale data because the Next.js Data Cache was not invalidated.
- **Pattern:** Use `revalidatePath('/route')` to invalidate a specific route. Use `revalidateTag('tag')` when the same data appears across multiple routes — all `fetch` calls tagged with that string are purged together.
  ```ts
  // single route
  revalidatePath('/invoices')

  // cross-route data (multiple pages show 'posts')
  await fetch(url, { next: { tags: ['posts'] } })
  revalidateTag('posts')
  ```
- **When to use:** After every successful Server Action mutation. Always call before `redirect`.

### Pattern: useActionState + useFormStatus for form feedback

- **Problem:** Users cannot tell when a form is submitting or see which fields have errors returned from the server.
- **Pattern:** Sign the Server Action as `(prevState, formData) => newState`. On the client, use `useActionState` to bind it and `useFormStatus` inside the submit button to read `pending`.
  ```tsx
  'use client'
  import { useActionState } from 'react'
  import { useFormStatus } from 'react-dom'
  import { createPost } from './actions'

  function Submit() {
    const { pending } = useFormStatus()
    return <button disabled={pending}>{pending ? '…' : 'Publish'}</button>
  }

  export function NewPostForm() {
    const [state, action] = useActionState(createPost, {})
    return (
      <form action={action}>
        <input name="title" />
        {state.errors?.title?.[0] && <p>{state.errors.title[0]}</p>}
        <textarea name="body" />
        <Submit />
      </form>
    )
  }
  ```
- **When to use:** Any server-driven form that needs validation feedback and a disabled submit button during flight.
- **When NOT to use:** Complex client forms with rich validation UX — use React Hook Form + Zod resolver instead, then call the Server Action via `handleSubmit`.

### Pattern: Route Handler for external callers

- **Problem:** Server Actions are React primitives (POST-only, tied to React rendering) — not suitable for webhooks, mobile clients, or third-party integrations.
- **Pattern:** Export named HTTP verb functions from `app/api/.../route.ts`. Use Zod to validate the body. Return `Response.json(...)`.
  ```ts
  // app/api/orders/[id]/cancel/route.ts
  export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params
    const Body = z.object({ reason: z.string() })
    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 })
    await orders.cancel(id, parsed.data)
    return new Response(null, { status: 204 })
  }
  ```
- **When to use:** Webhooks, public REST APIs, SSE/streams, cron jobs, or any caller that is not your own React app.

## Anti-patterns

### Anti-pattern: Calling revalidatePath/revalidateTag inside a render

- **Symptom:** `revalidatePath` or `revalidateTag` called inside a Server Component's render function (not inside a mutation action).
- **Why it's bad:** Cache invalidation belongs to the mutation phase, not the render phase. Calling it during render creates unpredictable cache behavior.
- **Fix:** Call these functions only inside Server Actions or Route Handlers, after the mutation has completed and before any `redirect`.

### Anti-pattern: Skipping server-side Zod validation

- **Symptom:** Server Action reads `formData` values and passes them directly to a DB call, relying on client-side validation only.
- **Why it's bad:** Client validation is bypassable — a raw POST to the action URL bypasses any browser-side schema entirely.
- **Fix:** `Schema.safeParse(...)` is the first statement in every Server Action, before any DB write. Return `{ errors }` to the client on failure.

### Anti-pattern: Server Action without auth re-check

- **Symptom:** Server Action mutates data using an ID from `formData` without verifying that the current session owns that resource.
- **Why it's bad:** Any authenticated user can forge a request with a different ID and mutate another user's data (IDOR). The client's authorization UI check is not enforced on the server.
- **Fix:** Resolve the session inside the Server Action and verify ownership against the DB before writing. Never trust IDs that arrive from form inputs without a server-side ownership check.

### Anti-pattern: Mixing data fetch and mutation in the same Server Action

- **Symptom:** A single `'use server'` function fetches data to display **and** writes to the DB in the same call.
- **Why it's bad:** Fetches belong to Server Components (render phase); mutations belong to Server Actions (action phase). Mixing the two makes caching and error recovery unpredictable and violates the separation of concerns that App Router is built on.
- **Fix:** Keep Server Actions focused on a single mutation. Fetch display data in Server Components via `await fetch(...)` or ORM calls.

## Decision criteria

| If...                                                         | Then...                                                             |
|---------------------------------------------------------------|---------------------------------------------------------------------|
| Mutation called from your own React form or event handler     | Server Action (`'use server'`)                                      |
| Caller is a webhook, mobile app, or 3rd-party service         | Route Handler (`app/api/.../route.ts`)                              |
| Form needs validation feedback + pending button state         | `useActionState` + `useFormStatus` wired to a Server Action         |
| Form has complex client-side validation UX (multi-step, rich) | React Hook Form + Zod resolver; call Server Action in `handleSubmit`|
| Same mutated data appears on multiple routes                  | `revalidateTag('tag')` instead of `revalidatePath`                  |
| Mutation redirects after success                              | Call `revalidatePath`/`revalidateTag` **before** `redirect`         |
| Server Action mutates a resource by ID from form input        | Re-check session ownership server-side before writing               |
| You have 3+ Server Actions sharing validation/auth logic      | Consider `next-safe-action` to centralize the wrapper               |

## External references

- Cross-stack: `/api-design` — Route Handler design, Zod at boundaries, REST semantics for external callers
- Source wf-ef986670 §13 — Server Actions, API routes and mutations (canonical rules)
- Source wf-ef986670 §21.3 — Full Server Action + Zod + `useActionState` playbook
- Source wf-dbd12769 §B2 — BFF playbook: prefer Server Actions for internal mutations
