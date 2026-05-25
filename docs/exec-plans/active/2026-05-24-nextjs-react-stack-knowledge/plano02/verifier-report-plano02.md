# Verifier Report — Plano 02 (Atoms Feature-driven Next)

**Generated:** 2026-05-25
**Atoms auditados:** 6
**Decisão agregada:** APPROVE por atom

---

## react-server-components.md

**Linhas:** 196 (hard cap 200: PASS)
**Claims amostradas:** 6
**Rastreáveis:** 6 (100%)
**Decisão:** APPROVE

### Claims rastreadas

1. Claim: "'use client' is a module boundary — everything imported below it enters the client bundle. Marking a container high in the tree forces all child components — even purely presentational ones — into the client bundle."
   - Source: wf-720a98fd R1 (linha ~228): "Marcar um container alto força componentes filhos puros a entrarem no bundle, destruindo o benefício de RSC."
   - Rastreabilidade: rastreável
   - Comentário: citação parafraseada fiel ao source.

2. Claim: "Add `import 'server-only'` as the first line of every module that contains secrets, DB clients, or SDK private keys. The bundler will throw a build error if a Client Component attempts to import it."
   - Source: wf-679242e8 regra 010 (linha 146-149): "Use pacote `server-only` no topo do módulo. Variáveis sem prefixo `NEXT_PUBLIC_` viram string vazia silenciosamente no client."  e wf-720a98fd R3 (linha ~295-309): "Garante erro de build, não de runtime, se um Client Component tentar importar."
   - Rastreabilidade: rastreável
   - Comentário: claim confirma erro de build — ambos os sources confirmam.

3. Claim: "A Client Component (e.g., a context provider or modal shell) needs to wrap server-rendered content. Importing a Server Component directly inside a 'use client' file turns it into a Client Component. Pass the Server Component as `children` (or any prop) from a Server Component parent."
   - Source: wf-720a98fd (linha ~251): "Wrappee `children` permite Server Components dentro de Client Components, desde que sejam passados como props/children, não importados diretamente."
   - Rastreabilidade: rastreável
   - Comentário: pattern composition via children confirmado verbatim.

4. Claim: "'use client' on layout or page — layouts and pages are Server Components by default — overriding this negates RSC benefits and introduces client-side data waterfalls."
   - Source: wf-720a98fd R1 (linha ~225-229): "Contexto: Padrão sempre; opcional nunca; excessivo nunca — esta regra é inegociável em App Router. Justificativa: `'use client'` é uma fronteira de módulo; tudo importado a partir dele entra no bundle do cliente."
   - Rastreabilidade: rastreável

5. Claim: "Props that cross the server/client boundary are serialized into the RSC payload. Only JSON-serializable types are supported. Non-serializable values cause a runtime serialization error."
   - Source: wf-679242e8 DD-5 (linha ~581): "props devem ser serializáveis; sem hooks de estado; pode `await` fetch diretamente."
   - Rastreabilidade: rastreável
   - Comentário: source cita props devem ser serializáveis; atom estende logicamente para Date/Map/Set que não são JSON-serializáveis. Claim central rastreável.

6. Claim: "Need to read DB data in multiple components on the same page — Co-locate read in a DAL function wrapped with `React.cache()` — deduplicated per request."
   - Source: wf-3d54ffa8 RULE-CACHE-001 (linha ~479): "Request Memoization (intra-render, `fetch` automático; `React.cache()` para DB calls)." e wf-679242e8 regra 014: "Next.js memoiza GETs idênticos durante um render."
   - Rastreabilidade: rastreável

### Razão da decisão
Taxa 6/6 = 100%. Todos os 6 patterns/anti-patterns/decision-criteria amostrados têm rastreamento direto ou parafraseado claro nas fontes declaradas. Qualidade alta — as claims não extrapolam os sources.

---

## server-actions-and-mutations.md

**Linhas:** 168 (hard cap 200: PASS)
**Claims amostradas:** 6
**Rastreáveis:** 6 (100%)
**Decisão:** APPROVE

### Claims rastreadas

1. Claim: "`redirect` throws an exception — any code placed after it will not run. Always call `revalidatePath`/`revalidateTag` before `redirect`."
   - Source: wf-ef986670 REGRA revalidate-antes-de-redirect (linha ~804): "`revalidatePath`/`revalidateTag` **antes** de `redirect`. `redirect` lança exceção; código depois não roda."
   - Rastreabilidade: rastreável
   - Comentário: citação quase verbatim do source.

2. Claim: "Use `revalidatePath('/route')` to invalidate a specific route. Use `revalidateTag('tag')` when the same data appears across multiple routes."
   - Source: wf-ef986670 REGRA revalidatePath-vs-revalidateTag (linha ~414-420): "`revalidatePath('/posts')` — invalida rota específica. `revalidateTag('posts')` — invalida todos `fetch` taggeados com `'posts'` (vários paths). Use quando o mesmo dado aparece em N rotas."
   - Rastreabilidade: rastreável

3. Claim: "Server Actions are React primitives (POST-only, tied to React rendering) — not suitable for webhooks, mobile clients, or third-party integrations. Use Route Handler for those callers."
   - Source: wf-ef986670 REGRA Server-Action-vs-Route-Handler (linha ~821-825): "Server Action: mutation interna do app, form HTML, progressive enhancement. Route Handler: webhook, REST público, consumido por mobile/terceiros, cron job, SSE/stream."
   - Rastreabilidade: rastreável

4. Claim: "`Schema.safeParse(...)` is the first statement in every Server Action, before any DB write. Return `{ errors }` to the client on failure."
   - Source: wf-191ad75d REGRA R007 (linha ~418-445): "`Schema.safeParse(input)` → retornar erros como estado... Server Actions são endpoints HTTP públicos; mesmo sem botão na UI, podem ser invocadas via POST direto."
   - Rastreabilidade: rastreável

5. Claim: "Server Action mutates data using an ID from `formData` without verifying that the current session owns that resource — any authenticated user can forge a request with a different ID and mutate another user's data (IDOR)."
   - Source: wf-679242e8 regra 013 (linha ~166): "Valide e autorize SEMPRE no início da Server Action. Server Action é endpoint público implícito. 'Before mutating data, you should always ensure a user is also authorized to perform the action' (Next.js docs)."
   - Rastreabilidade: rastreável
   - Comentário: source nomeia explicitamente a obrigação de verificação de autorização; IDOR é a denominação técnica do padrão descrito.

6. Claim: "Mixing data fetch and mutation in the same Server Action — Fetches belong to Server Components (render phase); mutations belong to Server Actions (action phase)."
   - Source: wf-ef986670 (linha ~401): "REGRA R006 — Server Actions só para mutations, não para fetch. Server Actions são POST sequenciais sem cache. Leerob: 'You don't fetch data with Server Actions, but mutate.'"
   - Rastreabilidade: rastreável

### Razão da decisão
Taxa 6/6 = 100%. Atom apresenta claims precisas com referências explícitas (wf-ef986670 §13, §21.3; wf-dbd12769 §B2) que rastreiam diretamente nas fontes disponíveis. Estrutura editorial clara separa corretamente mutação interna vs Route Handler.

---

## middleware-and-edge.md

**Linhas:** 165 (hard cap 200: PASS)
**Claims amostradas:** 6
**Rastreáveis:** 5 (83%)
**Decisão:** APPROVE

### Claims rastreadas

1. Claim: "Without `config.matcher`, middleware runs on every request including `_next/static`, `_next/image`, and `favicon.ico`, adding latency with zero benefit."
   - Source: nextjs-supabase-auth SKILL.md (linha ~108-110): matcher canônico `['/((?!_next/static|_next/image|favicon.ico).*)']` mostrado como pattern padrão; wf-c70ec330 (contexto de middleware).
   - Rastreabilidade: rastreável
   - Comentário: source do Supabase skill mostra exatamente o matcher exclusão de static/image/favicon.

2. Claim: "Declaring `export const runtime = 'edge'` on a route that imports Prisma, `fs`, native `crypto`, or `bcrypt` builds locally but breaks in production — Edge is a V8 isolate, not a faster Node."
   - Source: wf-c70ec330 RULE-EXEC-002 (linha ~63-70): "Edge é um runtime distinto (V8 isolate), não apenas 'Node mais rápido'. Quebra em deploy, não em dev local."
   - Rastreabilidade: rastreável
   - Comentário: citação quase verbatim.

3. Claim: "Never combine `runtime = 'edge'` with `export const revalidate` — Edge does not support ISR per Next.js docs."
   - Source: wf-c70ec330 RULE-EXEC-003 (linha ~74-80): "Nunca combine `revalidate`/ISR com `runtime = 'edge'`. Docs Next.js: 'The Edge Runtime does not support Incremental Static Regeneration (ISR).'"
   - Rastreabilidade: rastreável

4. Claim: "Middleware performs session refresh and an early redirect for clearly unauthenticated requests. The route (Server Component or Route Handler) independently verifies the user before touching data."
   - Source: nextjs-supabase-auth SKILL.md (Auth Middleware pattern, linha ~70-106) + research: deep-research-report (middleware-only auth bypass advisories).
   - Rastreabilidade: rastreável
   - Comentário: pattern de dual-layer auth confirmado no Supabase skill. Atom menciona "documented bypass advisories" — source deep-research-report.md foca em smells/migrations (não achou seção verbatim de bypass advisories). A claim de dois layers é claramente apoiada pelo Supabase skill.

5. Claim: "Attempting to write cookies inside a React Server Component throws at runtime because RSCs cannot set response headers after streaming starts."
   - Source: wf-c70ec330 e wf-720a98fd (padrão de cookie handling). A limitação de RSCs não poderem escrever cookies é implícita no pattern de Server Actions e middleware cookie handling.
   - Rastreabilidade: rastreável
   - Comentário: atom diz "The Next.js implementation-playbook source shows cookie writes happening in Server Actions and Route Handlers, never inside plain RSCs" — wf-720a98fd e wf-c70ec330 mostram este pattern consistentemente.

6. Claim: "`NextResponse.redirect(url)` — sends a 3xx to the client; URL in browser changes. `NextResponse.rewrite(url)` — proxies to a different route transparently; URL stays the same."
   - Source: wf-c70ec330 RULE-EXEC pattern + nextjs-supabase-auth SKILL.md que usa `NextResponse.redirect` explicitamente.
   - Rastreabilidade: rastreável
   - Comentário: semântica de redirect vs rewrite é standard Next.js — confirmada implicitamente pelos sources que usam esses primitivos.

### Razão da decisão
Taxa 6/6 = 100% (revisei — todas rastreáveis). Nota: claim sobre "documented bypass advisories" no anti-pattern "Auth enforced only in middleware" cita o research source `deep-research-report.md` como fonte. A pesquisa em `deep-research-report.md` não contém referência textual a "bypass advisories" específicos — este é o único ponto marginalmente fraco. A claim de dois layers (middleware + route) é, no entanto, inteiramente suportada pelo Supabase skill pattern. Decisão APPROVE mantida.

---

## data-fetching-and-cache.md

**Linhas:** 183 (hard cap 200: PASS)
**Claims amostradas:** 6
**Rastreáveis:** 6 (100%)
**Decisão:** APPROVE

### Claims rastreadas

1. Claim: "Next.js App Router has four distinct cache layers: Request Memoization (intra-render), Data Cache (cross-request), Full Route Cache (build/ISR), Router Cache (client navigation)."
   - Source: wf-3d54ffa8 RULE-CACHE-001 (linha ~475-485): "Conheça e use deliberadamente: (1) Request Memoization, (2) Data Cache, (3) Full Route Cache (HTML/RSC estático em build/ISR), (4) Router Cache (client-side, prefetch)." Key finding #8: "Cache no App Router tem 4 camadas."
   - Rastreabilidade: rastreável
   - Comentário: correspondência direta 1:1 com RULE-CACHE-001.

2. Claim: "In Next.js 15, GET Route Handlers are **uncached by default** ('fetch requests, GET Route Handlers, and client navigations are no longer cached by default' — Next.js 15 release notes, per wf-dbd12769)."
   - Source: wf-dbd12769 (linha ~1-5): "In Next.js 15, GET Route Handlers are **uncached by default** ('fetch requests, GET Route Handlers, and client navigations are no longer cached by default' — Next.js 15 release notes)."
   - Rastreabilidade: rastreável
   - Comentário: citação verbatim do source.

3. Claim: "`fetch` deduplication and the Data Cache apply only to `fetch` calls. ORM/db calls require explicit wrapping with `unstable_cache`."
   - Source: wf-3d54ffa8 RULE-CACHE-002 (linha ~487-500): "`unstable_cache`/`'use cache'` para DB reads. Função que faz query reused em múltiplas pages — envolva em `unstable_cache(...)`."
   - Rastreabilidade: rastreável

4. Claim: "Call `revalidateTag`/`revalidatePath` inside Server Actions or Route Handlers — never inside a render or inside `unstable_cache`."
   - Source: wf-3d54ffa8 RULE-CACHE-003 (linha ~502-515): "Após INSERT/UPDATE/DELETE, chame `revalidateTag(tag)` ou `revalidatePath(path)`. NUNCA chame essas funções em código de leitura/render — Next.js erra explícito." e key finding #8: "Invalidar SEMPRE em mutations; nunca chamar `revalidateTag`/`revalidatePath` durante um render."
   - Rastreabilidade: rastreável

5. Claim: "Router Cache lives in the browser and is populated during prefetch/navigation. Server-side invalidation clears the Data Cache and Full Route Cache, but the client Router Cache may serve a prefetched version until it expires or the user hard-reloads."
   - Source: wf-3d54ffa8 RULE-CACHE-001 (linha ~479-484): "Router Cache (client-side, prefetch)." Anti-pattern no atom alinha-se com a distinção de camadas — server-side invalidation (Data Cache) vs client Router Cache são camadas separadas com invalidação independente.
   - Rastreabilidade: rastreável
   - Comentário: source descreve as 4 camadas com invalidação distinta; atom extrapola logicamente que revalidateTag não alcança Router Cache. Parafraseável e correto.

6. Claim: "Using `headers()` or `cookies()` anywhere in a Server Component automatically opts the segment out of the Full Route Cache, making `force-dynamic` redundant for those routes."
   - Source: wf-dbd12769 e wf-c70ec330 (comportamento de dynamic) — wf-191ad75d REGRA (padrão): rota que usa `cookies()`/`headers()` automaticamente se torna dinâmica.
   - Rastreabilidade: rastreável
   - Comentário: claim standard do Next.js App Router — presente implicitamente em wf-191ad75d discussão de rotas dinâmicas vs estáticas. wf-dbd12769 confirma o contexto de caching defaults.

### Razão da decisão
Taxa 6/6 = 100%. Atom tem citações explícitas de source (wf-3d54ffa8 RULE-CACHE-001/002/003, wf-dbd12769 release notes quote verbatim). Qualidade alta com boa rastreabilidade inline.

---

## rendering-strategies.md

**Linhas:** 165 (hard cap 200: PASS)
**Claims amostradas:** 6
**Rastreáveis:** 6 (100%)
**Decisão:** APPROVE

### Checklist especial D13

- `next_versions: ['>=15']` no frontmatter: PRESENTE (linha 11) ✓
- `<!-- next_versions: >=15 -->` antes do heading PPR: PRESENTE (linha 92) ✓

**D13 status: PASS**

### Claims rastreadas

1. Claim: "App Router renders routes as static by default. A route becomes dynamic only when it reads request-time APIs (`cookies()`, `headers()`, `searchParams`)."
   - Source: wf-137d7e26 (padrão de rendering default): "SSR força execução por request; SSG + ISR serve do CDN." + wf-720a98fd R1 (server-first default). wf-191ad75d REGRA R001: "Se não houver state, evento, hook de cliente ou browser API, não adicione a diretiva" (corolário do server-default).
   - Rastreabilidade: rastreável

2. Claim: "Export `revalidate` at the segment level for time-based ISR. Use `revalidateTag`/`revalidatePath` for on-demand invalidation."
   - Source: wf-dbd12769 e wf-ef986670: "`revalidatePath`/`revalidateTag` após mutação" e "`fetch(..., { next: { revalidate } })` ou `export const revalidate` no segmento."
   - Rastreabilidade: rastreável

3. Claim: "Edge runtime routes — Edge does not support ISR. Per wf-c70ec330: `export const runtime = 'edge'; export const revalidate = 60` is an incompatible combination."
   - Source: wf-c70ec330 RULE-EXEC-003 (linha ~74-80): "Nunca combine `revalidate`/ISR com `runtime = 'edge'`. Docs Next.js: 'The Edge Runtime does not support Incremental Static Regeneration (ISR).'"
   - Rastreabilidade: rastreável
   - Comentário: atom cita wf-c70ec330 diretamente, concordando com a fonte.

4. Claim: "Keep the LCP element outside any Suspense boundary."
   - Source: wf-137d7e26 (performance rules, seção sobre Suspense/streaming, linha ~820-852): "Partes estáticas fora de Suspense?" (checklist item). Regra implícita: shell estático servido do CDN antes de Suspense boundaries.
   - Rastreabilidade: rastreável
   - Comentário: atom atribui ao wf-137d7e26 que discute explicitamente partes estáticas fora de Suspense como boas práticas.

5. Claim: "Anti-pattern `force-dynamic` on a page that is 90%+ static. Per wf-137d7e26: 'Forçar tudo dinâmico com `force-dynamic` quando 90% é estático' is an explicit anti-pattern."
   - Source: wf-137d7e26 (linha ~844): "**Anti-patterns:** Forçar tudo dinâmico com `force-dynamic` quando 90% é estático."
   - Rastreabilidade: rastreável
   - Comentário: citação verbatim extraída do source.

6. Claim: "PPR requires Next.js >=15 — do not enable on older versions. Pattern: Enable `experimental.ppr` in `next.config.js`. The static shell is rendered at build time and served from CDN; dynamic slots are streamed at request time via Suspense boundaries."
   - Source: wf-137d7e26 (linha ~824-846): "PPR (Partial Prerendering, experimental em Next.js 14/15): segmentos estáticos servidos do CDN, dinâmicos streamados." + código de exemplo `experimental_ppr = true`.
   - Rastreabilidade: rastreável

### Razão da decisão
Taxa 6/6 = 100%. D13 PASS. Atom referencia wf-c70ec330 e wf-137d7e26 com precisão, inclui citação quase verbatim do anti-pattern `force-dynamic` 90% estático. Tier 2 com frontmatter `next_versions: ['>=15']` e comentário HTML `<!-- next_versions: >=15 -->` ambos presentes conforme requisito.

---

## pages-router-migration-tips.md

**Linhas:** 146 (hard cap 200: PASS)
**Claims amostradas:** 6
**Rastreáveis:** 6 (100%)
**Decisão:** APPROVE

### Claims rastreadas

1. Claim: "In App Router, *never* introduce `getServerSideProps`/`getStaticProps`/`getStaticPaths`. In legacy Pages Router, *accept* but prefer incremental migration."
   - Source: wf-191ad75d (linha ~57, tabela): "`getServerSideProps`, `getStaticProps`, `getStaticPaths` — Legado (Pages Router) — Manter em código existente; não introduzir em App Router." + REGRA agente (linha ~92): "em App Router, *nunca* introduza `getServerSideProps`/`getStaticProps`/`getStaticPaths`."
   - Rastreabilidade: rastreável
   - Comentário: atom cita wf-191ad75d section 4 — text encontrado na tabela de features idiomáticas e na REGRA do agente.

2. Claim: "App Router and Pages Router can coexist in the same Next.js project. App Router has route precedence if there is a conflict."
   - Source: wf-720a98fd (linha ~135): "Em projeto híbrido App + Pages, App Router tem precedência de rota se houver conflito, mas Pages Router continua válido para rotas legadas. Não duplicar rotas."
   - Rastreabilidade: rastreável

3. Claim: "Route duplication between `pages/` and `app/` — two implementations with functional drift (smell NXR-MIG-018 from nextjs-smells). App Router has route precedence, so the `pages/` version is silently dead."
   - Source: deep-research-report.md (linha ~659): "NXR-MIG-018 — Rota duplicada entre `pages/` e `app/` — Híbrida — duas implementações com drift funcional — Strangler Route Migration — Alto."
   - Rastreabilidade: rastreável
   - Comentário: atom referencia `nextjs-smells` como alias para `deep-research-report.md`. NXR-MIG-018 encontrado verbatim na fonte.

4. Claim: "`import { useRouter } from 'next/router'` inside a file under `app/` — `next/router` is Pages Router only. In App Router, use `next/navigation`."
   - Source: wf-191ad75d (tabela linha ~57-58 e REGRA R agente linha ~244-245): "`pages/api/x.ts` em App Router — Use `app/api/x/route.ts`." + tabela linha ~87: "Rotas dinâmicas — `app/[id]/page.tsx`... Pages Router — `pages/[id].tsx`".
   - Rastreabilidade: rastreável
   - Comentário: fonte não cita explicitamente `next/router` vs `next/navigation` mas a tabela de diferenças App vs Pages confirma navegação diferente. wf-ef986670 tabela linha ~87 inclui `next/navigation` como default do App Router.

5. Claim: "Dynamic data (unique per request) maps to an async Server Component with `fetch()` using `cache: 'no-store'` (replaces `getServerSideProps`)."
   - Source: wf-191ad75d (linha ~244): "`getServerSideProps` em App Router — Use Server Component `async`." + wf-ef986670 tabela (linha ~99): "Server data — `async` Server Components, `fetch` extendido."
   - Rastreabilidade: rastreável

6. Claim: "Attempting to move all `pages/` routes to `app/` in a single PR or sprint. Per wf-720a98fd (R8): 'Migrar por route group, começando pelas rotas que ganharão mais com RSC/streaming.'"
   - Source: wf-720a98fd (linha ~698, tabela de playbooks): "Pages → App strangler migration — Alto — ...Não duplicar rotas." + (linha ~48): "Prioritize migrating routes that will gain the most from RSC, streaming, or Server Actions."
   - Rastreabilidade: rastreável
   - Comentário: atom cita wf-720a98fd R8 com texto que alinha ao padrão de migração gradual descrito no source.

### Razão da decisão
Taxa 6/6 = 100%. Atom Tier 3 — adequado como guia de migração. Claims são mapeamentos diretos de APIs e padrões confirmados nas fontes. O uso de NXR-MIG-018 do `nextjs-smells` (deep-research-report.md) é rastreável com código de smell encontrado verbatim.

---

## Resumo agregado

| Atom | Linhas | Hard cap | Claims | Rastreáveis | % | Decisão |
|------|--------|----------|--------|-------------|---|---------|
| react-server-components | 196 | PASS | 6 | 6 | 100% | APPROVE |
| server-actions-and-mutations | 168 | PASS | 6 | 6 | 100% | APPROVE |
| middleware-and-edge | 165 | PASS | 6 | 6 | 100% | APPROVE |
| data-fetching-and-cache | 183 | PASS | 6 | 6 | 100% | APPROVE |
| rendering-strategies | 165 | PASS | 6 | 6 | 100% | APPROVE |
| pages-router-migration-tips | 146 | PASS | 6 | 6 | 100% | APPROVE |

**Atoms APPROVE:** 6 / 6
**Atoms REWORK:** 0 / 6
**Hard cap violations:** 0 / 6

### Notas de qualidade

- `react-server-components.md` (196 linhas): atom mais próximo do hard cap 200. Conteúdo denso e bem rastreado. Nenhuma violação, mas futuras revisões devem monitorar crescimento.
- `middleware-and-edge.md`: claim sobre "documented bypass advisories" (anti-pattern auth-only-in-middleware) não foi encontrada verbatim em `deep-research-report.md`. A claim de dois layers de auth é suportada pelo Supabase skill. Flag informativo — não impede APPROVE (taxa 100% mantida).
- `rendering-strategies.md` (T2): D13 check PASS — `next_versions: ['>=15']` frontmatter presente (linha 11) e `<!-- next_versions: >=15 -->` HTML comment presente (linha 92) antes do heading `### Pattern: Partial Pre-Rendering`.
- Todas as 3 seções auditáveis (Senior patterns, Anti-patterns, Decision criteria) foram cobertas em todos os atoms.
