<!--
Princípio universal #5 — Comment Provenance.
Esta fase TOCA codigo .ts (parser format-knowledge-preview.ts). Provenance comment OBRIGATORIO no diff, formato:
`// 2026-05-24 (Luiz/dev): aceitar 'By keyword' (EN) alem de 'Por keyword' (PT-BR) — RF-11 do PRD next-stack + G9 do README Plano 03`
Markdown (INDEX.md) NAO precisa provenance porque tem frontmatter `updated:` ou heading com data.
-->

# Fase 06: INDEX final consolidado + parser RF-11

**Plano:** 03 — Cross-cutting + React + Integrations + INDEX final + audit humano
**Sizing:** S (~1.5h — escrita do INDEX + ajuste de parser regex + teste novo)
**Depende de:** fase-01..05 (todos os 8 atoms desta wave + 6 atoms do Plano 02 + piloto Plano 01 fase-03 presentes em disco para o mapping)
**Visual:** false

---

## O que esta fase entrega

`knowledge/nextjs/INDEX.md` final (substitui skeleton do Plano 01 fase-01) com:
- Cabecalho `# Next.js + React Knowledge — Index` (D16 — mantido do skeleton)
- Preambulo curto documentando heterogeneidade EN/PT-BR (D15 — mantido do skeleton)
- `## By Cross-Stack Skill` com `### For /security`, `### For /react-patterns`, `### For /api-design`, `### For /system-design`, cada uma com >=2 atoms (CA-09 — G11 do README)
- `## By Tier` (T1: 7 atoms + T2: 6 atoms + T3: 2 atoms = 15 atoms canonicos)
- `## By keyword` (tabela markdown EN: keyword1, keyword2, ... | [atom](./atoms/atom.md))

E ajuste do parser `skills/init/lib/format-knowledge-preview.ts:29` para aceitar `## By keyword` (EN) alem de `## Por keyword` (PT-BR) — RF-11 do PRD. Novo teste em `format-knowledge-preview.test.ts` cobrindo o caminho EN. Testes pre-existentes (PT-BR) continuam verdes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/nextjs/INDEX.md` | Modify (overwrite skeleton) | Substitui skeleton do Plano 01 fase-01 por INDEX final consolidado |
| `skills/init/lib/format-knowledge-preview.ts` | Modify | Regex ajustada de `Por` para `(?:Por|By)` (RF-11) + provenance comment |
| `skills/init/lib/format-knowledge-preview.test.ts` | Modify | Adicionar 1 novo teste cobrindo INDEX com `## By keyword` |

---

## Implementacao

### Passo 1: Confirmar 15 atoms presentes em disco

Antes de escrever INDEX, verificar que `knowledge/nextjs/atoms/` contem 15 atoms:

```bash
ls knowledge/nextjs/atoms/ | wc -l   # esperado: 15
```

Atoms esperados (do PRD):
- T1 (7): `app-router-and-layouts.md` (P01), `react-server-components.md` (P02), `server-actions-and-mutations.md` (P02), `middleware-and-edge.md` (P02), `data-fetching-and-cache.md` (P02), `security-stack-specific.md` (P03), `react-hooks-and-state.md` (P03)
- T2 (6): `rendering-strategies.md` (P02), `performance-and-turbopack.md` (P03), `testing-strategy.md` (P03), `ui-and-styling.md` (P03), `error-handling-observability.md` (P03), `react-suspense-patterns.md` (P03)
- T3 (2): `supabase-integration.md` (P03), `pages-router-migration-tips.md` (P02)

Se algum faltar, BLOCKER — voltar a fase correspondente.

### Passo 2: Escrever INDEX final consolidado

Substituir `knowledge/nextjs/INDEX.md` (skeleton do Plano 01 fase-01) pelo conteudo final. Manter cabecalho + preambulo do skeleton. Layout abaixo (molde adaptado de [`knowledge/rails/INDEX.md`](../../../../knowledge/rails/INDEX.md) traduzido para EN — sem cross-link Rails-style; ajustado para 4 skills cross-stack do D7):

```markdown
<!-- 2026-05-24 (Luiz/dev): INDEX final consolidado Plano 03 fase-06. Layout D9 (by cross-stack skill + by tier + by keyword) em EN per D15. 15 atoms canonicos. -->

# Next.js + React Knowledge — Index

> Senior Next.js + React knowledge (Next 14+ App Router, React 18+). 15 atoms covering App Router, Server Components, Server Actions, middleware, data fetching, rendering strategies, security, performance, testing, UI/styling, error handling, React hooks, Suspense patterns, plus Supabase integration and Pages Router migration tips.
>
> **Heterogeneity note:** This matrix is written in **English** (aligned with Next.js/React official docs and global ecosystem vocabulary). Other matrix folders (`knowledge/rails/`, `knowledge/nodejs-typescript/`) remain in PT-BR. Cross-stack skill preface mixes PT-BR (skill wrapper text) with EN (atom citations) — accepted trade-off per D15.

---

## By Cross-Stack Skill

### For /security
- **middleware-and-edge** (T1) — middleware auth, runtime constraints, cookies handling, NextAuth/Clerk/Supabase auth patterns
- **security-stack-specific** (T1) — middleware auth, CSRF in Server Actions, RSC secret leaks (`server-only`), auth.js patterns

### For /react-patterns
- **react-server-components** (T1) — server vs client boundaries, props serialization, useState/useEffect forbidden in RSC
- **react-hooks-and-state** (T1) — useState/useReducer/useFormState/useOptimistic, interplay with Server Actions
- **react-suspense-patterns** (T2) — Suspense boundaries, loading.tsx, streaming SSR, use() hook (Next 15+)
- **rendering-strategies** (T2) — when to use static/dynamic/PPR (Next 15+)

### For /api-design
- **server-actions-and-mutations** (T1) — `'use server'`, when to use vs route handlers, validation with Zod, revalidatePath/Tag
- **data-fetching-and-cache** (T1) — `fetch()` with cache options, Next cache layers (data cache + full route cache), revalidate, tags
- **app-router-and-layouts** (T1) — route handlers, dynamic routes, parallel routes

### For /system-design
- **data-fetching-and-cache** (T1) — Next cache layers (data cache + full route cache), invalidation strategies
- **rendering-strategies** (T2) — SSG/SSR/ISR/PPR trade-offs
- **performance-and-turbopack** (T2) — bundle size, RSC payload, edge cold start, Turbopack vs Webpack
- **error-handling-observability** (T2) — error.tsx boundaries, OTel integration via instrumentation.ts

---

## By Tier

### Tier 1 — Every Next.js senior dev needs (7 atoms)
- `app-router-and-layouts` — App Router, nested layouts, parallel routes, route handlers
- `react-server-components` — server vs client boundaries, async components, RSC props serialization
- `server-actions-and-mutations` — `'use server'`, validation, revalidatePath, progressive enhancement
- `middleware-and-edge` — middleware.ts, edge runtime constraints, cookies, auth patterns
- `data-fetching-and-cache` — `fetch()` cache, Next cache layers, revalidate, tags
- `security-stack-specific` — middleware auth, CSRF, RSC secret leaks, auth.js patterns
- `react-hooks-and-state` — useState/useReducer/useFormState/useOptimistic patterns

### Tier 2 — Common in mid-size apps (6 atoms)
- `rendering-strategies` — SSG/SSR/ISR + PPR section (Next 15+)
- `performance-and-turbopack` — bundle, RSC payload, edge cold start
- `testing-strategy` — Playwright, RTL, async server component tests
- `ui-and-styling` — Tailwind, next/font, next/image, shadcn patterns
- `error-handling-observability` — error.tsx, global-error.tsx, OTel via instrumentation.ts
- `react-suspense-patterns` — Suspense boundaries, streaming, loading.tsx interplay with error.tsx

### Tier 3 — Niche / legacy (2 atoms)
- `supabase-integration` — `@supabase/ssr`, RLS via SSR, signed URLs, edge functions
- `pages-router-migration-tips` — Pages -> App Router migration for Next 13+ projects

---

## By keyword

| Keyword | Atoms |
|---|---|
| app router, layout, route handler, parallel route | [app-router-and-layouts](./atoms/app-router-and-layouts.md) |
| RSC, server component, "use client", props serialization | [react-server-components](./atoms/react-server-components.md) |
| server action, "use server", revalidatePath, mutation | [server-actions-and-mutations](./atoms/server-actions-and-mutations.md) |
| middleware, edge runtime, cookies, NextAuth, Clerk | [middleware-and-edge](./atoms/middleware-and-edge.md) |
| fetch, cache, revalidate, tags, data cache | [data-fetching-and-cache](./atoms/data-fetching-and-cache.md) |
| SSG, SSR, ISR, PPR, partial prerendering | [rendering-strategies](./atoms/rendering-strategies.md) |
| security, CSRF, RSC leak, auth.js, server-only | [security-stack-specific](./atoms/security-stack-specific.md) |
| Turbopack, bundle, RSC payload, edge cold start | [performance-and-turbopack](./atoms/performance-and-turbopack.md) |
| Playwright, RTL, Vitest, async server component test | [testing-strategy](./atoms/testing-strategy.md) |
| Tailwind, next/font, next/image, shadcn | [ui-and-styling](./atoms/ui-and-styling.md) |
| error.tsx, global-error, OTel, Sentry, instrumentation.ts | [error-handling-observability](./atoms/error-handling-observability.md) |
| useState, useReducer, useFormState, useOptimistic | [react-hooks-and-state](./atoms/react-hooks-and-state.md) |
| Suspense, loading.tsx, streaming, use() hook | [react-suspense-patterns](./atoms/react-suspense-patterns.md) |
| supabase, RLS, "@supabase/ssr", signed URL | [supabase-integration](./atoms/supabase-integration.md) |
| Pages Router, migration, getServerSideProps, getStaticProps | [pages-router-migration-tips](./atoms/pages-router-migration-tips.md) |

Coverage Next 14+ / React 18+. Next 15-only features (PPR, `use()` hook stable) marked with `next_versions: ['>=15']` in atom frontmatter (currently: `rendering-strategies`).
```

**Validar contra CA-09:** `grep -c '^### For /' knowledge/nextjs/INDEX.md` retorna `4`; cada subsecao tem >=2 bullets.

### Passo 3: Ajustar parser regex em format-knowledge-preview.ts (RF-11)

Atual ([`skills/init/lib/format-knowledge-preview.ts:29`](../../../../skills/init/lib/format-knowledge-preview.ts#L29)):

```typescript
const sectionMatch = content.match(/##\s+Por\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i)
```

Novo:

```typescript
// 2026-05-24 (Luiz/dev): aceitar 'By keyword' (EN) alem de 'Por keyword' (PT-BR) — RF-11 do PRD next-stack + G9 do README Plano 03.
// Backward compat: regex (?:Por|By) preserva matching para Rails/Node-TS INDEX PT-BR existentes.
const sectionMatch = content.match(/##\s+(?:Por|By)\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i)
```

Atualizar JSDoc da funcao (linha 10) para refletir suporte bilingue:

```typescript
/**
 * Parses the top-N keywords from the INDEX.md "Por keyword" (PT-BR) or "By keyword" (EN) table.
 * ...
 */
```

### Passo 4: Adicionar teste cobrindo INDEX EN

Em `skills/init/lib/format-knowledge-preview.test.ts`, adicionar teste novo (espelhando o padrao dos testes PT-BR existentes na linha 57 e 73):

```typescript
test('parses keywords from EN "By keyword" section (Next.js INDEX)', async () => {
  writeFileSync(
    indexPath,
    `# Index\n\n## By keyword\n\n| Keyword | Atoms |\n|---|---|\n| a, b, c, d, e, f, g, h, i, j | [atom](./atoms/atom.md) |\n`,
  )
  const result = await parseTopKeywords(indexPath, 8)
  expect(result).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
})
```

(Posicao: imediatamente apos o ultimo teste PT-BR existente. Variavel `indexPath` deve estar disponivel no scope — confirmar via Read antes de aplicar.)

### Passo 5: Validar parser nao regrediu

```bash
bun test format-knowledge-preview.test.ts
```

Todos os testes pre-existentes (PT-BR) continuam verdes + 1 novo (EN) tambem verde.

### Passo 6: Validar INDEX final via parser real

Sanity check (manual): rodar parser contra INDEX final escrito no Passo 2:

```bash
bun -e 'import("./skills/init/lib/format-knowledge-preview.ts").then(m => m.parseTopKeywords("./knowledge/nextjs/INDEX.md", 8).then(console.log))'
```

Esperado: array com 8 keywords (primeiros 8 da tabela: `app router, layout, route handler, parallel route, RSC, server component, "use client", props serialization`). Se retornar `[]`, regex falhou — debugar.

---

## Gotchas

- **G3 do plano (idioma EN):** INDEX e atoms em EN. Comentario `.ts` do parser em PT-BR (padrao).
- **G9 do plano (RF-11 regex update):** parser regex e PT-BR only HOJE. Ajuste no Passo 3 e backward-compatible (`(?:Por|By)` preserva matching para Rails/Node-TS). Sem o ajuste, `formatKnowledgePreview` retorna string vazia para projeto Next.js — quebra RF10/RF11 e UX do init message.
- **G11 do plano (CA-09 mapping):** `## By Cross-Stack Skill` lista 4 skills (CA-09 do PRD); cada uma com >=2 atoms. Mapping de referencia esta no G11 do README do Plano 03 — Passo 2 valida.
- **G12 do plano (provenance comment):** parser ajuste no Passo 3 inclui comentario `// 2026-05-24 (Luiz/dev): aceitar 'By keyword' (EN) alem de 'Por keyword' (PT-BR) — RF-11 do PRD next-stack + G9 do README Plano 03`.
- **Local (preambulo do skeleton mantido):** o skeleton do Plano 01 fase-01 ja tem cabecalho `# Next.js + React Knowledge — Index` + preambulo de heterogeneidade. Esta fase SUBSTITUI o body (passa de "skeleton vazio" para "INDEX final consolidado") mas MANTEM cabecalho + preambulo intactos.
- **Local (lookahead da regex):** lookahead atual `(?=\n##\s|$)` para no proximo `##` heading. Se INDEX final tiver `## Heterogeneity note` no preambulo ANTES de `## By keyword`, regex funciona OK (lookahead nao volta atras). Se houver `### For /security` dentro de `## By Cross-Stack Skill`, lookahead nao captura `###` (3 hashes — `\s` exige whitespace mas `\s` casa `#` nao). Verificar: o regex usa `\n##\s` exigindo exatamente `##` seguido de whitespace; `###` nao casa. Safe.
- **Local (tabela de 15 keywords):** parser pega top-N=8 (default TOP_N_KEYWORDS). INDEX tem 15 linhas de tabela. Os primeiros 8 sao os T1 (linhas 1-7) + primeiro T2 (rendering). Reordenar tabela se quiser controlar quais aparecem no preview — but T1-first ja e a ordem semantica correta.

---

## Verificacao

### TDD

- [ ] **RED:** novo teste em `format-knowledge-preview.test.ts` cobrindo INDEX EN
  - Comando: `bun test format-knowledge-preview --grep 'EN.*By keyword'`
  - Resultado esperado ANTES do ajuste de regex: FALHA — `expected ['a',...,'h'] received []` (regex PT-BR not matching EN)

- [ ] **GREEN:** regex ajustado, teste passa
  - Comando: `bun test format-knowledge-preview --grep 'EN.*By keyword'`
  - Resultado esperado: `1 passed, 0 failed`

- [ ] **REGRESSION:** testes pre-existentes PT-BR continuam verdes
  - Comando: `bun test format-knowledge-preview`
  - Resultado esperado: TODOS passed (incluindo os pre-existentes da linha 57/73)

### Checklist

- [ ] `knowledge/nextjs/INDEX.md` substituido (skeleton do Plano 01 fase-01 -> INDEX final consolidado)
- [ ] Cabecalho `# Next.js + React Knowledge — Index` mantido (D16)
- [ ] Preambulo de heterogeneidade EN/PT-BR mantido (D15)
- [ ] `## By Cross-Stack Skill` com 4 subsections `### For /security`, `### For /react-patterns`, `### For /api-design`, `### For /system-design`, cada uma com >=2 atoms (CA-09)
  - Verificar: `grep -c '^### For /' knowledge/nextjs/INDEX.md` retorna `4`
- [ ] `## By Tier` lista 15 atoms (7 T1 + 6 T2 + 2 T3)
- [ ] `## By keyword` lista 15 linhas de tabela (uma por atom canonico)
- [ ] Parser `skills/init/lib/format-knowledge-preview.ts:29` regex aceita `(?:Por|By)` com provenance comment
- [ ] Novo teste em `format-knowledge-preview.test.ts` cobrindo INDEX EN
- [ ] `bun test format-knowledge-preview` retorna todos passed (pre-existentes + novo)
- [ ] Sanity check: `parseTopKeywords("knowledge/nextjs/INDEX.md", 8)` retorna array com 8 keywords (nao vazio)
- [ ] `bun run harness:validate` aceita INDEX final
- [ ] `bun run lint` passa no parser ajustado
- [ ] `bun run typecheck` passa (se configurado)

---

## Criterio de Aceite

**Por maquina:**
- `grep -c '^### For /' knowledge/nextjs/INDEX.md` retorna exatamente `4` (CA-09 — 4 skills)
- `grep '^- \*\*' knowledge/nextjs/INDEX.md | grep -c -E 'For /security'` >=2 (idem para cada uma das 4 skills, manualmente conferir)
- `bun test format-knowledge-preview.test.ts` retorna todos passed (incluindo novo teste EN)
- `bun -e 'import("./skills/init/lib/format-knowledge-preview.ts").then(m => m.parseTopKeywords("./knowledge/nextjs/INDEX.md").then(r => console.log(r.length)))'` retorna `8`
- `bun run harness:validate` retorna `valid`

**Por humano:**
- Inspecao manual do INDEX final confirma que mapping `## By Cross-Stack Skill` faz sentido semantico (cada atom listado na skill esta efetivamente relacionado)
- Inspecao do parser confirma regex `(?:Por|By)` nao introduz outros side-effects (lookahead, case-insensitive, etc.)

---

<!-- Gerado por /plan-feature em 2026-05-24 -->
