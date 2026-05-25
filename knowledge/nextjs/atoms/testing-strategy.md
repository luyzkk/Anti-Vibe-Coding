---
topic: testing-strategy
stack: nextjs
layer: full-stack
sources:
  - skill: nextjs-best-practices (Infos/knowledge/NextJS/nextjs-best-practices/SKILL.md)
  - skill: nextjs-expert (Infos/knowledge/NextJS/nextjs-expert/SKILL.md)
  - research: wf-73b5487f (Infos/knowledge/NextJS/compass_artifact_wf-73b5487f-4f51-4408-8e87-0ec1450db2c2_text_markdown.md)
tier: 2
triggers: [Playwright, React Testing Library, Vitest, async server component test, msw, RSC test, integration test, E2E, component test]
cross_stack_skills: []
updated: 2026-05-25
---

# Testing Strategy

## When to consult

- When choosing a test runner for a new Next.js App Router project
- When deciding whether an async Server Component needs a unit test or an E2E test
- When writing tests for Server Actions, Route Handlers, or middleware
- When mocking `next/navigation`, `next/headers`, or `next/cache`
- When a Playwright suite is slow or flaky and needs structural fixes

## Senior patterns

### Pattern: Match test tool to Next.js surface

| Surface | Strategy | Primary tool |
|---|---|---|
| **Client Component** | RTL + user-event + MSW (if it fetches) | Vitest + RTL |
| **Async Server Component** | E2E only — do not attempt jsdom | Playwright |
| **Sync Server Component** | RTL with caveats; prefer Playwright | Playwright |
| **Server Action** | Import and call directly; mock Next.js modules | Vitest |
| **Route Handler (App Router)** | `testApiHandler({ appHandler })` via NTARH | Vitest + NTARH |
| **Middleware (Edge)** | Light integration with `NextRequest` fake + smoke E2E | Playwright |

The official Next.js documentation states: *"Since async Server Components are new to the React ecosystem, Vitest currently does not support them. While you can still run unit tests for synchronous Server and Client Components, we recommend using E2E tests for async components."*

### Pattern: Default stack for new App Router projects

```
Test runner:      Vitest (native ESM/TS/JSX, ~2× cold start vs Jest)
Component/DOM:    @testing-library/react + @testing-library/user-event + @testing-library/jest-dom
Network mocking:  MSW (same handlers in unit, integration, E2E, and dev)
E2E:              Playwright (native parallelism, WebKit, trace viewer)
Route Handlers:   next-test-api-route-handler (NTARH)
```

Do not use Jest unless there is a pre-existing constraint. Do not use Enzyme — incompatible with React 18+.

### Pattern: `customRender` with all real providers

Create `test/utils/render.tsx` wrapping all providers (Theme, Auth, Query, i18n). Re-export everything from `@testing-library/react` and enforce via ESLint to block direct imports elsewhere.

```tsx
export function render(ui: ReactElement, opts: { session?: Session } = {}) {
  return rtlRender(ui, { wrapper: ({ children }) => (
    <ThemeProvider><QueryProvider><AuthProvider session={opts.session}>
      {children}
    </AuthProvider></QueryProvider></ThemeProvider>
  )})
}
export * from '@testing-library/react'
```

Create a new `QueryClient({ defaultOptions: { queries: { retry: false } } })` per test — shared cache leaks state between tests.

### Pattern: Mock `next/navigation` completely

Mocking only `useRouter` causes silent failures when the component also calls `useSearchParams`, `usePathname`, or `redirect`. Mock all exports; implement `redirect` as a throw so it is assertable.

```ts
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
                       back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: (path: string) => { throw new Error(`NEXT_REDIRECT:${path}`) },
}))
```

Do not mock `next/router` in App Router — that is the Pages Router module.

### Pattern: Test Server Actions by calling them directly

Import the action and call it with plain arguments or `FormData`. Mock `next/navigation`, `next/cache`, `next/headers` at module level. Add `// @vitest-environment node`. Cover at minimum: unauthenticated user, unauthorized user, invalid input, happy path.

```ts
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: (p: string) => { throw new Error(`R:${p}`) },
}))
test('createOrder redirects after persisting', async () => {
  await expect(createOrder(formData)).rejects.toThrow('R:/orders/123')
  expect(revalidatePath).toHaveBeenCalledWith('/orders')
})
```

### Pattern: MSW as the single network-mocking strategy

Define MSW handlers in `test/utils/handlers.ts`. Set `onUnhandledRequest: 'error'` so unmocked requests cause explicit test failures. The same handlers work in unit, integration, E2E, and local development.

```ts
// vitest.setup.ts
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Pattern: Playwright `storageState` for authenticated suites

Create a `setup project` that logs in once via API (not UI) and saves session state. A benchmark cited in the source measured 71% reduction in suite time after adopting storage state.

```ts
setup('authenticate', async ({ request }) => {
  await request.post('/api/login', { data: { email, password } })
  await request.storageState({ path: 'playwright/.auth/user.json' })
})
```

Use `testInfo.parallelIndex` or random IDs for data isolation in parallel workers.

## Anti-patterns

**Rendering async Server Components in jsdom** — the official documentation confirms Vitest and Jest do not support them. Cover via Playwright E2E; extract fetch/transform logic into a pure function for unit testing.

**`waitForTimeout` in Playwright** — arbitrary waits are the primary cause of flaky, slow suites. Replace with `await expect(locator).toBeVisible()`, `page.waitForURL()`, `page.waitForResponse()`, or `expect.poll()`.

**Mocking internal hooks** (`vi.mock('./useCart')`) — couples tests to implementation; a refactor breaks the test without changing behavior. Inject state via Context in `customRender` or mock at the network level with MSW.

**Mocking `next/router` in App Router** — the wrong module; `next/navigation` is the App Router equivalent. Mocking `next/router` silently does nothing or produces confusing errors.

**Giant snapshots** — hundreds-of-line snapshots are never reviewed in PR; `--updateSnapshot` becomes a rubber stamp. Use `toMatchInlineSnapshot` for outputs ≤ 20 lines; for components, use explicit RTL role/text assertions.

**> 3 `vi.mock` calls in one test file** — the test is verifying mocks, not behavior. Move to integration with MSW + `customRender`, or up to Playwright E2E.

## Decision criteria

| If... | Then... |
|---|---|
| Component uses state, event handlers, or browser APIs | Vitest + RTL + jsdom |
| Component is an async Server Component | Playwright E2E only |
| Testing a Server Action | Import directly; mock Next.js modules; `// @vitest-environment node` |
| Testing a Route Handler with cookies/headers | NTARH (`testApiHandler({ appHandler })`) |
| Test needs network responses | MSW handlers — not `vi.mock` of fetch/axios |
| Client Component uses `useRouter` or `useSearchParams` | Mock full `next/navigation` including redirect-as-throw |
| Playwright suite is slow or flaky | Add `storageState`; remove `waitForTimeout`; use `getByRole` locators |
| Test file has > 3 `vi.mock` calls | Move to integration with MSW, or up to Playwright E2E |
| New App Router project, picking stack | Vitest + RTL + MSW + Playwright |
| Pages Router project with Jest working | Keep Jest; swap `ts-jest` for `@swc/jest` for speed |
| Cypress suite < 200 tests | Keep Cypress; migrate to Playwright when > 300 or WebKit needed |
