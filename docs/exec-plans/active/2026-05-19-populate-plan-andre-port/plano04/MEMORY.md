# Memoria: Plano 04 — MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Status:** em andamento

**Bloqueadores ja resolvidos:** Plano 01 (lista canonica completa, `EXCLUDED_FROM_POPULATION_V2`
reduzido, `CanonicalDoc` estendido com `docs/PRODUCT_SENSE.md` + `README.md`,
`tests/e2e/populate-plan-parity.test.ts` com 2 asserts MH-1 ativos). Plano 04 roda em paralelo
com Plano 02 e Plano 03 — arquivos disjuntos.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano04-fase01-nextjs-coverage:** 8 entries adicionadas a `NEXTJS_CANDIDATES` em
  `skills/init/lib/stack-aware-input-paths.ts`:
  - `'AGENTS.md'`: paths `['README.md', 'package.json', 'CLAUDE.md']`
  - `'CLAUDE.md'`: paths `['AGENTS.md', 'README.md', 'package.json']`
  - `'docs/PRODUCT_SENSE.md'`: paths `['README.md', 'src/app/page.tsx', 'package.json']`
  - `'docs/PLANS.md'`: paths `['docs/exec-plans/active/', 'docs/exec-plans/completed/']`
  - `'docs/QUALITY_SCORE.md'`: paths `['.github/workflows/', '.github/pull_request_template.md', 'package.json']`
  - `'docs/STATE.md'`: paths `['package.json', 'docs/exec-plans/active/']`
  - `'docs/design-docs/core-beliefs.md'`: paths `['CLAUDE.md', 'docs/CODE_STYLE.md', 'README.md']`
  - `'README.md'`: paths `['package.json', 'src/app/page.tsx', 'next.config.js', 'next.config.mjs', 'next.config.ts']`
  - Total: NEXTJS_CANDIDATES foi de 6 para 14 chaves.
  - Por que: MH-4 — cada CanonicalDoc deve ter entry em pelo menos 1 stack.
  - Impacto: `result.keys()` inclui os 8 novos docs quando primary='nextjs'. Fase-03
    (parity asserts) vai verificar isso via CA-02.

- **DI-Plano04-fase01-fixture-stubs:** 3 arquivos vazios criados em
  `tests/fixtures/stack-aware/nextjs-supabase/`:
  - `src/lib/supabase/client.ts` — stub para CA-02 SECURITY/ARCHITECTURE
  - `supabase/migrations/20260519000000_init.sql` — stub para CA-02 SECURITY/RELIABILITY
  - `supabase/functions/hello/index.ts` — stub para CA-02 RELIABILITY
  - Os outros 5 arquivos do fixture (package.json, src/app/layout.tsx, src/lib/supabase/server.ts,
    src/middleware.ts, supabase/config.toml) ja existiam antes desta fase.
  - Por que: CA-02 exige `>= 3` paths com `exists: true` em ARCHITECTURE/SECURITY/RELIABILITY.
    Sem os stubs, `fs.access` falha e o assert de RELIABILITY cai em 2 reais (ao inves de >= 3).
  - Impacto: fixture tem agora 8 arquivos (7 stubs + package.json).

- **DI-Plano04-fase01-supabase-extra-expansion:** `NEXTJS_SUPABASE_EXTRA` expandido:
  - `docs/SECURITY.md`: adicionado `src/lib/supabase/client.ts` (4 paths total)
  - `docs/RELIABILITY.md`: adicionados `supabase/config.toml` e `src/lib/supabase/server.ts`
    (4 paths total, de 2 originais)
  - `ARCHITECTURE.md`: nao alterado (ja tinha 5 paths, CA-02 ja passava)
  - Por que: CA-02 exige >= 3 paths reais em cada doc critico para Next.js+Supabase.

- **DI-Plano04-fase01-generic-candidates:** `GENERIC_CANDIDATES` expandido com:
  - `'README.md'`: paths `['package.json', 'Gemfile', 'composer.json', 'pyproject.toml']`
  - `'docs/PRODUCT_SENSE.md'`: paths `['README.md', 'package.json']`
  - Por que: G7 do plano — CanonicalDoc inclui README.md e PRODUCT_SENSE.md (Plano 01);
    sem entry no mapa generico, `result.get('README.md')` retorna undefined para stacks
    null/unknown.

- **DI-Plano04-fase02-rails-cobertura:** 8 entries adicionadas a `RAILS_CANDIDATES`:
  - `'AGENTS.md'`: paths `['README.md', 'Gemfile', 'CLAUDE.md']`
  - `'CLAUDE.md'`: paths `['AGENTS.md', 'README.md', 'Gemfile']`
  - `'docs/PRODUCT_SENSE.md'`: paths `['README.md', 'config/routes.rb', 'Gemfile']`
  - `'docs/PLANS.md'`: paths `['docs/exec-plans/active/', 'docs/exec-plans/completed/']`
  - `'docs/QUALITY_SCORE.md'`: paths `['.github/workflows/', '.github/pull_request_template.md', 'Gemfile']`
  - `'docs/STATE.md'`: paths `['Gemfile.lock', 'docs/exec-plans/active/', 'config/application.rb']`
  - `'docs/design-docs/core-beliefs.md'`: paths `['CLAUDE.md', 'docs/CODE_STYLE.md', 'README.md']`
  - `'README.md'`: paths `['Gemfile', 'config/routes.rb', 'bin/rails']`
  - Total: RAILS_CANDIDATES foi de 4 para 12 chaves.
  - Por que: MH-4 — paridade com Next.js para os 8 docs canonicos novos.
  - Fixture rails NAO ganhou stubs novos (decisao explicita do Passo 4 da fase).

- **DI-Plano04-fase02-nodets-cobertura:** 10 entries adicionadas a `NODE_TS_CANDIDATES`:
  - `'AGENTS.md'`: paths `['README.md', 'package.json', 'CLAUDE.md']`
  - `'CLAUDE.md'`: paths `['AGENTS.md', 'README.md', 'package.json']`
  - `'docs/PRODUCT_SENSE.md'`: paths `['README.md', 'package.json']`
  - `'docs/PLANS.md'`: paths `['docs/exec-plans/active/', 'docs/exec-plans/completed/']`
  - `'docs/QUALITY_SCORE.md'`: paths `['.github/workflows/', '.github/pull_request_template.md', 'package.json']`
  - `'docs/STATE.md'`: paths `['package.json', 'docs/exec-plans/active/']`
  - `'docs/design-docs/core-beliefs.md'`: paths `['CLAUDE.md', 'docs/CODE_STYLE.md', 'README.md']`
  - `'docs/SECURITY.md'`: paths `['.env.example', 'package.json']` — Node-TS generico sem middleware scaffold
  - `'docs/RELIABILITY.md'`: paths `['package.json', 'tsconfig.json']`
  - `'README.md'`: paths `['package.json', 'tsconfig.json', 'src/index.ts']`
  - Total: NODE_TS_CANDIDATES foi de 2 para 12 chaves.
  - Por que: MH-4 — paridade com Next.js. SECURITY e RELIABILITY acrescentados (nao existiam antes).
  - Paths magros para SECURITY/RELIABILITY — `exists: false` em greenfield e comportamento correto.
  - Fixture empty inalterado (apenas .gitkeep) — fase-03 e Plano 05 dependem disso para CA-05.

<!-- DI-Plano04-fase02-no-vendor-paths: entries de Rails NAO incluem `vendor/bundle/`,
  `tmp/`, `log/`. Sao paths runtime, nao scaffold.
  - Por que: PRD MH-4 explicito — "sem inventar paths, apenas scaffold padrao".

- DI-Plano04-fase03-empty-fixture-reuse: parity test CA-05 reusa
  `tests/fixtures/stack-aware/empty/` ao inves de criar novo.
  - Por que: ja existe e tem zero arquivos (perfeito para "stack nao detectado").
  - Impacto: se alguem adicionar arquivos ao empty, CA-05 quebra.
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **Gotcha-Plano04-mergeCandidates-ordem:** quando `mergeCandidates(base, extra)` deduplica,
  a ordem dos paths no array final segue insertion order do Set. Se base tem `[a, b]` e
  extra tem `[b, a]`, resultado e `[a, b]` (base preservada). Esse comportamento e usado
  pelo renderer para listar paths em ordem previsivel.
  - Como deveria ser feito: nao mudar ordem de candidatos em entries existentes — apenas
    appendar novos.
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 2 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Apos fase-01 (para fase-02, fase-03, Plano 05 fase-01)

**Fixture `tests/fixtures/stack-aware/nextjs-supabase/` — lista completa de arquivos:**
- `package.json` (pre-existente — NAO alterar, pode quebrar outros testes)
- `src/app/layout.tsx` (pre-existente — stub vazio)
- `src/lib/supabase/server.ts` (pre-existente — stub vazio)
- `src/middleware.ts` (pre-existente — stub vazio)
- `supabase/config.toml` (pre-existente — stub vazio)
- `src/lib/supabase/client.ts` (criado em fase-01 — stub vazio)
- `supabase/migrations/20260519000000_init.sql` (criado em fase-01 — stub vazio)
- `supabase/functions/hello/index.ts` (criado em fase-01 — stub vazio)

**CA-02 mecanico — status apos fase-01:**
- ARCHITECTURE.md: >= 5 paths reais (supabase/migrations/, supabase/functions/, supabase/config.toml,
  src/lib/supabase/server.ts, src/lib/supabase/client.ts — todos existem no fixture)
- docs/SECURITY.md: >= 3 paths reais (supabase/migrations/ [diretorio, nao arquivo — fs.access ok
  em dir], src/lib/supabase/server.ts, supabase/config.toml)
  - NOTA: supabase/migrations/ e detectado como diretorio via fs.access (ok)
- docs/RELIABILITY.md: >= 3 paths reais (supabase/functions/ [diretorio], supabase/migrations/
  [diretorio], supabase/config.toml)

**NEXTJS_CANDIDATES — 14 chaves apos fase-01:**
`ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/SECURITY.md`, `docs/RELIABILITY.md`,
`docs/DESIGN.md`, `docs/CODE_STYLE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/PRODUCT_SENSE.md`,
`docs/PLANS.md`, `docs/QUALITY_SCORE.md`, `docs/STATE.md`, `docs/design-docs/core-beliefs.md`,
`README.md`

**`pickStaticMap` — ainda switch-case (G6 do plano):** NAO refatorado para hash map. Plano 05
fase-02 pode fazer isso se adicionar SH-2 (Laravel + Python) e switch crescer para 7+ cases.

**Quais CanonicalDoc ainda sem entry em algum stack (input para fase-02):**
- RAILS_CANDIDATES: sem entry para AGENTS.md, CLAUDE.md, README.md, docs/PRODUCT_SENSE.md,
  docs/PLANS.md, docs/QUALITY_SCORE.md, docs/STATE.md, docs/design-docs/core-beliefs.md
- NODE_TS_CANDIDATES: sem entry para AGENTS.md, CLAUDE.md, README.md, docs/PRODUCT_SENSE.md,
  docs/PLANS.md, docs/QUALITY_SCORE.md, docs/STATE.md, docs/design-docs/core-beliefs.md,
  docs/FRONTEND.md, docs/DESIGN.md, docs/SECURITY.md, docs/RELIABILITY.md

### Apos fase-02 (para fase-03 e Plano 05)

**Contagem final de chaves:**
- `RAILS_CANDIDATES`: 4 originais + 8 novas = **12 chaves**
- `NODE_TS_CANDIDATES`: 2 originais + 10 novas (8 docs + SECURITY + RELIABILITY) = **12 chaves**

**Fixtures:**
- `tests/fixtures/stack-aware/rails/` NAO ganhou stubs novos nesta fase (decisao explicita do Passo 4).
  Fase-03 ou Plano 05 devem adicionar stubs se CA-02-equivalente para Rails for exigido.
- `tests/fixtures/stack-aware/empty/` inalterado (apenas `.gitkeep`). Fase-03 e Plano 05 dependem
  disso para CA-05 ("stack nao detectado — fallback para GENERIC_CANDIDATES").

**pickStaticMap** — ainda switch-case (G6 do plano): NAO refatorado. Continua valido para
3 stacks ativos (nextjs, rails, node-ts). Plano 05 fase-02 pode refatorar se adicionar SH-2.

**Docs canonicos sem entry em algum stack (input para fase-03 / Plano 05):**
- RAILS_CANDIDATES: sem entry para `docs/FRONTEND.md`, `docs/DESIGN.md` (correto — Rails nao tem frontend SPA)
- NODE_TS_CANDIDATES: sem entry para `docs/FRONTEND.md`, `docs/DESIGN.md` (correto — Node-TS generico nao tem UI)
- GENERIC_CANDIDATES: sem entry para AGENTS.md, CLAUDE.md, docs/PLANS.md, docs/QUALITY_SCORE.md,
  docs/STATE.md, docs/design-docs/core-beliefs.md, docs/SECURITY.md, docs/RELIABILITY.md —
  candidatos para fase-03 (CA-05 parity) ou Plano 05.

<!-- Notas de fases futuras a preencher:
- Numero final de asserts em `tests/e2e/populate-plan-parity.test.ts`.
- Path do helper que valida "stack nao detectado — fase emite nota explicita".
-->

---

<!-- Atualizado automaticamente durante execucao -->
