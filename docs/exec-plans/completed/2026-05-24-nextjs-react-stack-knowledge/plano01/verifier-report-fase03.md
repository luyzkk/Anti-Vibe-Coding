# Verifier Report — app-router-and-layouts.md

**Date:** 2026-05-24
**Protocol:** refined (only Senior patterns + Anti-patterns + Decision criteria audited)
**Atom:** knowledge/nextjs/atoms/app-router-and-layouts.md (140 lines)

## Sources audited

1. `Infos/knowledge/NextJS/nextjs-app-router-patterns/SKILL.md`
2. `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/resources/implementation-playbook.md`
3. `Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-254e-4bbf-9f64-2ff832c5006c_text_markdown.md`
4. `Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-b0bd-468e-8550-7a44c0456970_text_markdown.md`
5. `Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md` *(added post-audit to make claim #12 RASTREAVEL — verbatim quote of Next.js docs at line 17 of this source; technical claim was already supported by sources 3 and 4)*

## Sections evaluated (per VERIFIER REFINED protocol)

- `## Senior patterns` (5 pattern blocks)
- `## Anti-patterns` (3 anti-pattern blocks)
- `## Decision criteria` (9-row table)

Sections **NOT audited** (editorial scaffolding per protocol): `## When to consult`, `## Edge cases`.

## Claims auditadas

| # | Section | Claim | Status | Source | Passage |
|---|---------|-------|--------|--------|---------|
| 1 | Senior patterns / Server-first | "Marking `page.tsx` or `layout.tsx` as `'use client'` pulls all child components into the client bundle" | RASTREAVEL | source 3, line 302 (R002) | "Once a file is marked with 'use client', all its imports and child components are considered part of the client bundle (Next.js docs)" |
| 2 | Senior patterns / Server-first | "Keep layouts and pages as Server Components" + "isolate interactivity in small leaf components" | RASTREAVEL | source 3, line 36; source 4, line 226-227 (R1) | "By default, layouts and pages are Server Components" / "Mantenha o 'use client' o mais perto possível das folhas que precisam de estado/eventos/browser API" |
| 3 | Senior patterns / Server-first | Code example with `params: Promise<{ id: string }>` and `await params` | RASTREAVEL | source 2, lines 305-307, 322-323, 430-432; source 3, line 85 | impl-playbook Pattern 5: `params: Promise<{ id: string }>` + `const { id } = await params`; compass table: "params: Promise<{id}> (Next 15+)" |
| 4 | Senior patterns / Server-first | "'use client' belongs at leaf components that need state, event handlers, or browser APIs" | RASTREAVEL | source 3, line 49; source 4, line 226-227 | "Client Components com 'use client'" / "Estado local, eventos, browser APIs"; compass 720a98fd R1: "estado/eventos/browser API" |
| 5 | Senior patterns / File conventions | Existence and roles of `loading.tsx` (Suspense fallback), `error.tsx` (Error Boundary, `'use client'` required), `not-found.tsx` (notFound() target) | RASTREAVEL | source 1, lines 36-44; source 2, lines 32-43; source 3, line 50 | SKILL.md File Conventions table: `loading.tsx # Loading UI (Suspense)`, `error.tsx # Error boundary`, `not-found.tsx # 404 UI`; compass 191ad75d table feature row |
| 6 | Senior patterns / Parallel routes | `@slot` convention in layout with named slots (`analytics`, `team`) for independent rendering with own `loading.tsx` | RASTREAVEL | source 2, lines 246-284 (Pattern 4) | impl-playbook: `DashboardLayout({ children, analytics, team })` + `app/dashboard/@analytics/page.tsx` + `app/dashboard/@analytics/loading.tsx` |
| 7 | Senior patterns / Intercepting routes | `(.)resource/[id]` convention; `@modal/default.tsx` for non-intercepted; full page at `resource/[id]/page.tsx` | RASTREAVEL | source 2, lines 286-351 (Pattern 5) | impl-playbook file-structure comment block: "app/@modal/(.)photos/[id]/page.tsx # Intercept" + "default.tsx" + "photos/[id]/page.tsx # Full page" |
| 8 | Senior patterns / Route Handlers | "Server Actions are POST-only React primitives, not general HTTP endpoints" | RASTREAVEL | source 3, line 401 (R006); source 4, line 349 (R4 trade-offs) | "Server Actions são POST sequenciais sem cache"; "Server Actions só fazem POST e não são cacheáveis" |
| 9 | Senior patterns / Route Handlers | Export named HTTP verb functions from `app/api/.../route.ts` using Web Fetch primitives | RASTREAVEL | source 2, lines 399-444 (Pattern 7); source 3, lines 776-784 (R028) | impl-playbook Pattern 7 exports `GET`/`POST` from `route.ts`; compass R028 "Crie app/api/x/route.ts com export async function GET/POST" |
| 10 | Senior patterns / Route Handlers | "Use for webhooks, public REST APIs, GET shared with mobile/3rd-party"; not for mutations called only from own React UI | RASTREAVEL | source 4, lines 313-316 (R4) | "Se quem chama é seu próprio React (form, event handler), use Server Action. Se quem chama é máquina externa (webhook Stripe/GitHub, mobile app, integração 3rd-party, scraper), use Route Handler" |
| 11 | Anti-patterns / `'use client'` on container | Quote: "layouts and pages are Server Components" | RASTREAVEL VERBATIM | source 3, line 36 | "Documentação oficial: 'By default, layouts and pages are Server Components'" |
| 12 | Anti-patterns / `pages/api/` in App Router | Quote: "Route Handlers are the equivalent of API Routes inside the pages directory meaning you do not need to use API Routes and Route Handlers together." | **RASTREAVEL VERBATIM** (post-polish) | source 5, line 17 | **Polish 2026-05-24:** added `compass_artifact_wf-dbd12769` to `sources:` frontmatter. The verbatim quote (attributed to Next.js docs) appears at line 17: `**Rationale** — Next.js docs: "Route Handlers are the equivalent of API Routes inside the pages directory meaning you do not need to use API Routes and Route Handlers together."` Quote is now traceable to a declared source. |
| 13 | Anti-patterns / `pages/api/` fix | Use `app/api/users/route.ts` with named exports (`GET`, `POST`) using Web Fetch primitives instead of `NextApiResponse` | RASTREAVEL | source 2, lines 399-444; source 3, R028 line 776-784; source 4, R13 line 466-470 | impl-playbook Pattern 7; compass R028; compass 720a98fd R13 "Em App Router, criar app/api/**/route.ts. Não misture pages/api/" |
| 14 | Anti-patterns / Over-nesting | Quote: "Don't over-nest layouts — Each layout adds to the component tree." | RASTREAVEL VERBATIM | source 1, line 113; source 2, line 536 | SKILL.md Don'ts: "**Don't over-nest layouts** - Each layout adds to the component tree" (verbatim); impl-playbook Don'ts list (verbatim) |
| 15 | Anti-patterns / Over-nesting fix | "Colocate layout only when there is actual shared UI"; use route groups `(groupName)` to organize without layout overhead | RASTREAVEL | source 4, R12 line 456-461 | "Use route groups `()` para organização sem afetar URL"; "Quando 3+ rotas compartilham layout/loading distinto do resto, crie um route group" |
| 16 | Decision criteria | "Caller is your own React form or event handler → Server Action (`'use server'`)" | RASTREAVEL | source 4, R4 line 313-316; source 3, R006 line 393-401 | "Se quem chama é seu próprio React (form, event handler), use Server Action" |
| 17 | Decision criteria | "Caller is Stripe webhook, mobile app, or 3rd party → Route Handler" | RASTREAVEL | source 4, R4 line 313-316; AP3 line 614-618 | "Se quem chama é máquina externa (webhook Stripe/GitHub, mobile app, integração 3rd-party, scraper), use Route Handler" |
| 18 | Decision criteria | "UI shared across sibling routes, persists on nav → `layout.tsx`" | RASTREAVEL | source 3, table line 87 | "Layouts | layout.tsx aninhado, persistente" |
| 19 | Decision criteria | "UI remounts on every navigation (e.g. animations) → `template.tsx` instead of `layout.tsx`" | RASTREAVEL | source 1, line 41; source 2, line 41 | SKILL.md File Conventions: "template.tsx       # Re-mounted layout"; impl-playbook same line. The "remounts on every navigation" semantic is directly supported by "Re-mounted layout" labeling. The "animations" example is editorial framing (acceptable per protocol since the underlying technical claim — that template.tsx remounts vs layout.tsx persisting — is sourced). |
| 20 | Decision criteria | "Route needs independent loading per section → parallel routes (`@slot` + `loading.tsx` per slot)" | RASTREAVEL | source 2, Pattern 4 lines 246-284; source 1, line 105 | impl-playbook Pattern 4 demonstrates exactly this with `@analytics/loading.tsx`; SKILL.md Do's: "Leverage parallel routes - Independent loading states" |
| 21 | Decision criteria | "Detail view should overlay list without losing context → intercepting route `(.)resource/[id]`" | RASTREAVEL | source 2, Pattern 5 lines 286-351 | impl-playbook Pattern 5 "Intercepting Routes (Modal Pattern)" — exact convention demonstrated |
| 22 | Decision criteria | "Page has dynamic data unique per request → Dynamic Server Component — no `export const revalidate`" | RASTREAVEL | source 3, table line 90 | "ISR | `export const revalidate = N` ou `fetch(url, {next:{revalidate:N}})`" — implicit by contrast; row entries support the contrast |
| 23 | Decision criteria | "Page is mostly static, updates periodically → Add `export const revalidate = N` or `fetch` ISR options" | RASTREAVEL VERBATIM | source 3, table line 90 | "ISR | `export const revalidate = N` ou `fetch(url, {next:{revalidate:N}})`" (verbatim) |
| 24 | Decision criteria | "New project — App Router vs Pages Router → Always App Router; Pages Router only for existing legacies" | RASTREAVEL | source 3, R027 lines 758-766; source 4, R8 line 403-410; source 4, table line 49-50 | "Não introduzir em App Router; aceitar em Pages"; "Novos projetos: App Router. Legado em produção: não migrar tudo de uma vez"; "Use App Router | Use Pages Router | Nunca; Pages Router só para preservar legado" |

## Summary

- Total de claims auditadas: **24**
- Rastreaveis (initial audit): **23** → **24 post-polish** (claim #12 RASTREAVEL after adding source 5)
- Infundadas: **1** → **0 post-polish**
- Taxa de fidelidade (initial): 23/24 = **95.8%**
- Taxa de fidelidade (post-polish): 24/24 = **100%**
- Meta: ≥80%
- Status: **APROVADO**

## Findings detail

### Single infundada claim (Claim #12)

The atom's Anti-pattern "`pages/api/` in an App Router project" cites this quote attributed to "Next.js docs":

> "Route Handlers are the equivalent of API Routes inside the pages directory meaning you do not need to use API Routes and Route Handlers together."

This exact wording is **not present in any of the 4 declared sources**. It appears in a sibling file in the same `Infos/knowledge/NextJS/` directory (`compass_artifact_wf-dbd12769-8414-4475-a272-347c72513e4f_text_markdown.md` line 17), which the atom does NOT list in its `sources:` frontmatter.

The underlying technical assertion (don't mix `pages/api/` with App Router; use `app/api/.../route.ts`) is **fully supported** by sources 3 and 4 (R028, R13). The problem is purely the verbatim quote attribution — the extractor pulled a quote from an undeclared adjacent file.

### Two options to remediate (informational, not blocking since ≥80%)

**Option A (preferred — surgical fix):** Replace the quoted sentence with a paraphrase that the declared sources actually support, e.g.:

> "Why it's bad: Mixes routing systems. The senior consensus (sources 3/4) is: in App Router, do not introduce `pages/api/` — use Route Handlers (`app/api/.../route.ts`) instead."

**Option B:** Add `compass_artifact_wf-dbd12769-...md` to the atom's `sources:` frontmatter (if that file is indeed a valid ground-truth document for this atom) — then the existing verbatim quote becomes traceable.

## Recommendations

**APPROVED — fase-03 advances to Plano 01 fase-04.**

**Polish applied (2026-05-24):** Option B selected and applied. `compass_artifact_wf-dbd12769-...md` added as source 5 to the atom's `sources:` frontmatter (5 sources total). The verbatim quote is now traceable, raising fidelity to 100% (24/24). Atom still 141 lines (was 140 — +1 source line).
