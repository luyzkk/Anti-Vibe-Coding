---
topic: react-hooks-and-state
stack: nextjs
layer: frontend
sources:
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - skill: nextjs-app-router-patterns-v2 (Infos/knowledge/NextJS/nextjs-app-router-patterns V2/SKILL.md)
  - research: wf-ef986670 (Infos/knowledge/NextJS/compass_artifact_wf-ef986670-eae7-434e-8490-b0241ec71de8_text_markdown.md)
tier: 1
triggers: [useState, useReducer, useFormState, useOptimistic, useTransition, useEffect, client component, "use client", form state, optimistic update]
cross_stack_skills: [/react-patterns]
updated: 2026-05-25
---

# React Hooks and State in Next.js App Router

## When to consult

- When deciding whether to add `useState`/`useReducer` or move data to a Server Component
- When building forms with Server Actions — `useActionState`, `useFormStatus`
- When implementing optimistic UI with `useOptimistic`
- When a `useEffect` is used to derive state or fetch data in an App Router project
- When choosing between local state, URL state, or global state

## Senior patterns

### Pattern: Classify state before choosing a hook

**Problem:** All state ends up in the same tool regardless of type — server state in `useState`, filter state in Zustand — causing duplication and mismatches.

**Pattern:** Identify the class before writing code:

| Class | Canonical tool |
|---|---|
| Server state (initial render) | Server Component `async` + `await fetch`/ORM |
| Client UI state (toggle, focus) | `useState` / `useReducer` |
| Global client state (cart, drawer) | Zustand with Provider + `useRef` |
| Form state | `useActionState` + Zod (simple) or React Hook Form + Zod (complex) |
| URL state (filters, pagination) | `searchParams` / `useSearchParams` (+ `nuqs` for typing) |
| Persisted state | cookies `HttpOnly` for auth; `localStorage` for non-sensitive UI prefs |

Start with `useState` in the narrowest scope. Promote to global store only when ≥2 apply: multiple distant consumers, cross-route persistence, cross-tab sync, or writes from several places.

---

### Pattern: `useActionState` + `useFormStatus` for Server Action forms

**Problem:** Forms backed by Server Actions need pending state and validation errors without a full client-side state machine.

**Pattern:** `useActionState` wires the Server Action (typed `(prevState, formData) => newState`). `useFormStatus` inside the submit button reads the pending flag. Works without JavaScript (progressive enhancement).

```tsx
'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createPost } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? '...' : 'Publish'}</button>
}

export function PostForm() {
  const [state, action] = useActionState(createPost, {})
  return (
    <form action={action}>
      <input name="title" />
      {state.errors?.title?.[0] && <p>{state.errors.title[0]}</p>}
      <Submit />
    </form>
  )
}
```

**When NOT to use:** Complex real-time client validation — use React Hook Form + Zod resolver instead.

---

### Pattern: `useOptimistic` for instant UI feedback

**Problem:** User actions (like, follow, toggle) wait for the server before reflecting in the UI.

**Pattern:** `useOptimistic(realState, reducerFn)` returns an optimistic state and an updater. Call the updater before `await action()`.

```tsx
'use client'
import { useOptimistic } from 'react'
import { sendMessage } from './actions'

export function Thread({ messages }: { messages: Msg[] }) {
  const [opt, addOpt] = useOptimistic(
    messages,
    (state, text: string) => [...state, { text, pending: true }]
  )
  return (
    <form action={async (fd) => {
      const text = fd.get('text') as string
      addOpt(text)
      await sendMessage(text)
    }}>
      {opt.map((m, i) => <div key={i}>{m.text}{m.pending && '…'}</div>)}
      <input name="text" />
    </form>
  )
}
```

**When to use:** Idempotent, reversible, non-financial actions — likes, favorites, message send, toggle.

**When NOT to use:** Financial transactions, permission changes, or any non-idempotent operation.

---

### Pattern: `useEffect` only for external system sync

**Problem:** `useEffect` is used to derive state, reset on prop change, notify a parent, or fetch data in App Router.

**Pattern:** Ask: "Is this syncing with an external system (WebSocket, third-party lib, DOM API, timer)?" If not, remove the effect. Derived values are calculated in the render body. State reset uses `key={prop}`. Parent notification goes in the event handler. Data fetching goes in a Server Component.

```tsx
// Derive in render — no effect needed
const fullName = `${firstName} ${lastName}`

// Reset with key — no effect needed
<Profile key={userId} userId={userId} />

// Correct use: external system sync
useEffect(() => {
  const ws = new WebSocket(url)
  return () => ws.close()
}, [url])
```

---

## Anti-patterns

### Anti-pattern: `useEffect` to derive state or fetch in App Router

**Symptom:** `useEffect(() => setFullName(a + ' ' + b), [a, b])` or `useEffect(() => fetch('/api/...').then(setData), [])` inside an App Router Client Component.

**Why it's bad:** Derived state creates an extra render cycle. Fetching in Client Components adds a loading waterfall, hurts LCP, and misses RSC benefits.

**Fix:** Derive inline during render. Move fetches to a Server Component parent; pass data as props. For client-side caching of reactive data, use TanStack Query.

---

### Anti-pattern: Mutating state directly before `setState`

**Symptom:** `arr.push(x); setArr(arr)` or `obj.k = v; setObj(obj)`.

**Why it's bad:** Reference identity unchanged — React does not schedule a re-render.

**Fix:** `setArr(prev => [...prev, x])`, `setObj(prev => ({ ...prev, k: v }))`.

---

### Anti-pattern: `useState` trio for loading/error/data

**Symptom:** Three separate variables: `data`, `loading`, `error` managed independently.

**Why it's bad:** Allows impossible states (`loading: true` with `data` already set).

**Fix:** Discriminated union: `{status:'idle'} | {status:'loading'} | {status:'success', data:T} | {status:'error', error:string}`. Or use TanStack Query which manages this automatically.

---

### Anti-pattern: `useMemo`/`useCallback` without measurement

**Symptom:** Every value and callback is memoized preemptively.

**Why it's bad:** Memoization hooks have overhead that exceeds the cost of recalculation in most cases. React Compiler (React 19) handles memoization automatically.

**Fix:** Remove. Add back only after profiling confirms cost, or when referential stability is required by a downstream `useEffect` or `React.memo` child.

---

## Decision criteria

| If...                                                           | Then...                                                                |
|-----------------------------------------------------------------|------------------------------------------------------------------------|
| State needed in one component                                   | `useState` (simple) or `useReducer` (state machine)                  |
| Form with Server Action, progressive enhancement needed         | `useActionState` + `useFormStatus` + Zod on server                   |
| Form with rich client validation or 3+ fields                   | React Hook Form + Zod resolver                                        |
| Action should feel instant (like, toggle, message)              | `useOptimistic` — safe only for idempotent/non-financial actions      |
| State shared across distant subtrees                            | Zustand store (Provider + `useRef` in App Router)                     |
| Filters, pagination, tabs need shareability                     | `searchParams` / `useSearchParams` — URL is the source of truth      |
| `useEffect` body only derives state from props                  | Delete; calculate inline in render body                               |
| `useEffect` body resets state on prop change                    | `key={prop}` on the child component instead                           |
| Client Component needs server data                              | Move fetch to Server Component parent; TanStack Query if reactive     |
