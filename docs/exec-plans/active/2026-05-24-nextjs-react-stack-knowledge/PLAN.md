---
title: "Next.js + React Stack Knowledge"
mode: full
status: active
created: 2026-05-24
---

# Exec Plan: Next.js + React Stack Knowledge

**PRD:** ./PRD.md
**CONTEXT:** ./CONTEXT.md (17 decisões — D1-D17)
**Reuses infra from:** [2026-05-18-stack-knowledge-rails](../../completed/2026-05-18-stack-knowledge-rails/) (anti-drift + verifier refined regression) e [2026-05-16-stack-knowledge-nodejs-typescript](../../completed/2026-05-16-stack-knowledge-nodejs-typescript/) (infra Node `runStackKnowledgeInit`, `copyKnowledge`, `getStackKnowledgePreface`, telemetria)
**Planos:** 3 planos, 20 fases total
**Created:** 2026-05-24

---

## Goal

Criar `knowledge/nextjs/` paralelo a `knowledge/rails/` e `knowledge/nodejs-typescript/`, contendo 15 atoms destilados (em **EN** — D15) do material bruto em `Infos/knowledge/NextJS/` (14 deep-research + 6 SKILL.md V2 do agent-skills do Andre, MIT — D14). Cobertura: Next.js 14+ App Router (com migration tips Pages Router) + React conceitual (hooks, suspense, RSC). Detector ganha `probeReact` (anchor `vite.config.{ts,js,mjs}` — D12) compartilhando a mesma matrix `nextjs/` (D6). Entregue em 3 planos sequenciais (infra → atoms feature-driven → cross-cutting + integrations). Skills cross-stack `/security`, `/react-patterns`, `/api-design`, `/system-design` recebem preface Next-específico via `getStackKnowledgePreface()` agnóstico de stack.

## Scope

- **Plugin matrix:** `knowledge/nextjs/INDEX.md` (cabeçalho `# Next.js + React Knowledge — Index` — D16; layout `## By Cross-Stack Skill` + `## By Tier` + `## By keyword` em EN — D15) + 15 atoms em `atoms/*.md` (frontmatter padronizado com `next_versions` opcional para PPR — D13; corpo ≤200 linhas hard cap — R3-C; 4 seções obrigatórias: "When to consult" + "Senior patterns" + "Anti-patterns" + "Decision criteria").
- **Skill `/init`:** mudanças em 4 arquivos acopladas em **fase-04 atômica** do Plano 01 (R4) — `stack-id-map.ts` (`MATRIX_FOLDER_VALUES` ganha `'nextjs'`; mapping `nextjs→nextjs` e `react→nextjs`); `detect-stack.ts` (StackId ganha `'react'`; `probeReact` anchor vite.config.{ts,js,mjs}; precedência `probeNextjs → probeReact → probeNodeTs`); `detect-multi-stack.ts` (`SOURCE_EXT_BY_MATRIX['nextjs']` + `ANCHOR_CHECKS` para vite.config); `stack-aware-input-paths.ts` (`pickStaticMap('react') → NEXTJS_CANDIDATES`).
- **Schema validation:** `harness:validate` reconhece `next_versions` opcional (já existe `rails_versions` — padrão validado).
- **Licença:** `THIRD-PARTY-NOTICES.md` (raiz do plugin OU `knowledge/nextjs/`) com texto MIT completo + Copyright 2025 Addy Osmani + lista das 6 SKILL.md V2 do agent-skills-main usadas como inspiração (D14, RF-15, resolve R6).
- **Fase-00 pré-RED no Plano 01 (D17, resolve R1):** grep `'nodejs-typescript'` + `'node-ts'` + `STACK_ID_TO_MATRIX_FOLDER` em `tests/**` e `skills/init/lib/**/*.test.ts`; catalogar ~9 arquivos; ajustar assertions ANTES do mapping change; suite verde no estado intermediário.
- **4 skills cross-stack:** ZERO mudança de código (`/security`, `/react-patterns`, `/api-design`, `/system-design`). Consumem `.claude/knowledge/INDEX.md` via `getStackKnowledgePreface()` agnóstico de stack.
- **Quality gate:** anti-drift clause + verifier refined regression desde Plano 01 fase-03 (piloto) — R3-A. Audit humano Luiz em 3 atoms flagged (`react-server-components`, `security-stack-specific`, `supabase-integration`) — R3-B. Hard cap 200 linhas; excedente vira backlog em `TODO.md` — R3-C.
- **Fixtures:** `tests/fixtures/nextjs-app-router-fixture/` (Plano 01 fase-05) + `tests/fixtures/nextjs-supabase-fixture/` (Plano 03 fase-05). Tracer bullet E2E em `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts`.
- **Backward compatibility (D9):** projetos Next previamente inicializados com `primary: 'nodejs-typescript'` precisam rodar `/init --refresh-knowledge`. Documentado em CHANGELOG/MEMORY do Plano 01.
- **Out of scope:** React Native; Frameworks Meta-React além de Next (Remix, TanStack Start, Astro); migração automática silenciosa (D9 rejeita); atoms dedicados a libs específicas (TanStack Query, shadcn, Zustand) — entram como exemplos dentro de atoms cross-cutting; documentação Vercel-specific deploy; tradução PT-BR dos atoms knowledge/nextjs/ (D15: EN é decisão arquitetural); atribuição inline em cada atom (D14: NOTICES único); knowledge para projetos Next que usam Pages Router como driver primário (T3 migration tips only).

## Assumptions

- **Infra Node+TS 100% reusável:** `runStackKnowledgeInit`, `copyKnowledge` (5-status), `getStackKnowledgePreface`, telemetria `stack_detected` + `knowledge_copied`, `MATRIX_FOLDER_VALUES`, `--refresh-knowledge` — todos stack-agnostic e validados em v6.3.2/v6.3.3.
- **Padrão de atom já estabelecido:** `knowledge/rails/INDEX.md` + `knowledge/nodejs-typescript/atoms/` servem de molde. Heterogeneidade de idioma (Rails/Node-TS em PT-BR; Next em EN) aceita conscientemente (D15).
- **Material fonte disponível:** 14 deep-research files (`compass_artifact_wf-*.md` + `deep-research-report*.md`) + 6 SKILL.md V2 (`nextjs-app-router-patterns V1/V2`, `nextjs-best-practices`, `nextjs-expert`, `nextjs-supabase-auth`, `nextjs-turbopack`) em `Infos/knowledge/NextJS/` (~900KB).
- **Compound lessons regression aplicada desde piloto (D12 do PRD Rails — aprendizado portado):**
  - `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` → anti-drift clause OBRIGATÓRIA no prompt do extrator desde Plano 01 fase-03.
  - `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` → verifier audita APENAS "Senior patterns" + "Anti-patterns" + "Decision criteria" (≥80% claims rastreáveis a `sources:`).
- **Helper `NEXTJS_CANDIDATES` já existe** em `stack-aware-input-paths.ts` — apenas precisa `pickStaticMap('react')` ramificar para ele (R4 mitigation).
- **Detector probeNextjs já existe** em `detect-stack.ts:71-82` (regex `'next' in deps`). RF-03 adiciona `probeReact` (novo) sem mexer em probeNextjs.
- **`harness:validate` aceita campo `next_versions` opcional** (sem code change — padrão já validado por `rails_versions` em Rails wave).
- **Fontes `Infos/knowledge/NextJS/`** permanecem inalteradas durante execução. Frontmatter `sources:` aponta para elas (audit trail).
- **`Infos/` está no .gitignore** — material de consulta fica local; atoms destilados (em `knowledge/nextjs/`) é que vão pro repo.

## Risks

- **R1 — Mudar mapping quebra ~9 testes pré-existentes (Alto, Alta prob):** ~~Pendente~~ **RESOLVED (D17)** — Plano 01 fase-00 pré-RED audita + ajusta assertions ANTES do mapping change. Suite verde no estado intermediário.
- **R2 — Drift entre `security-stack-specific.md` e `testing-strategy.md` cross-matrix (Média, Médio):** **ACCEPTED (R2-C)** — atoms Next standalone, sem governance ativo. Drift vira débito tratado quando aparecer. Custo aceito.
- **R3 — Destilação vira copy-paste sem síntese (Alto, Média prob):** **RESOLVED (R3-A + R3-B + R3-C)** — anti-drift clause obrigatória no prompt do extrator desde Plano 01 fase-03; verifier refined sobre piloto + batches; audit humano Luiz em 3 atoms flagged (react-server-components, security-stack-specific, supabase-integration); hard cap 200 linhas (excedente vira `TODO.md` backlog).
- **R4 — Probe React sem `pickStaticMap('react')` → paths vazios (Alto, Alta prob se esquecido):** **MITIGATED** — Plano 01 fase-04 acopla 4 mudanças num phase atômico; Review Checklist exige unit test confirmando `pickStaticMap('react')` retorna `NEXTJS_CANDIDATES`.
- **R5 — Monorepo Next+Vite ruidoso em `secondary: ['react']` (Baixa, Baixo):** **ACCEPTED** — CA-03 já assert; documentar como edge case esperado em `app-router-and-layouts.md`. Telemetria captura antes de codar fix.
- **R6 — Licença SKILL.md V2 do Andre (Baixa, Alto):** ~~Pendente~~ **RESOLVED (D14)** — MIT verificado em `Infos/knowledge/NextJS/agent-skills-main/LICENSE` (Copyright 2025 Addy Osmani). Plano 01 fase-02 cria `THIRD-PARTY-NOTICES.md`.
- **R7 — Inconsistência PT-BR vs EN entre matrix folders (N/A, Baixo):** ~~Pendente~~ **RESOLVED (D15 — trade-off aceito)** — knowledge/nextjs/ nasce em EN. Heterogeneidade documentada em preâmbulo INDEX.md.
- **R8 (novo, derivado de R3) — Atoms ultrapassam hard cap 200 linhas e tentam inflar (Média, Alta prob):** verifier rejeita átomos > 200; conteúdo excedente vira backlog em `TODO.md` (espelha D25 Rails).
- **R9 (novo) — Anti-drift clause é esquecida em batches paralelos do Plano 02/03 (Médio, Média prob):** mitigação = bloco verbatim das duas compound lessons VAI EM TODOS os prompts dos subagentes extrator (regression desde fase-03 Plano 01); plan-verifier confirma presença antes de aceitar batch.

## Execution Steps

### Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Infra + Detector + Tracer Bullet (com fase-00 pré-RED + piloto + anti-drift regression) | 6 | ~12-14h | — |
| 02 | Atoms Feature-driven Next (6 atoms EN) + verifier batch | 7 | ~10-12h | 01 |
| 03 | Cross-cutting + React + Integrations + INDEX final + audit humano | 7 | ~12-14h | 02 |

**Total:** 20 fases, ~34-40h.

### Grafo de Dependências

```
Plano 01 (Infra + Detector + Tracer)
    |
    v
Plano 02 (Atoms Feature-driven Next)
    |
    v
Plano 03 (Cross-cutting + React + Integrations + INDEX final)
```

**Paralelismo:** Sequencial entre planos. Plano 02 depende de matrix folder existir (Plano 01 fase-01) + detector funcionar (fase-04) + anti-drift clause + verifier refined validados no piloto (fase-03/04). Plano 03 depende dos 6 atoms feature-driven do Plano 02 para o INDEX final mapear todas as skills cross-stack corretamente. **Dentro de cada plano**, fases de extração de atoms são paralelizáveis (subagentes em paralelo via `/execute-plan`) — verifier + audit humano sequenciais ao final do batch.

### Tracer Bullet

- **Plano:** 01
- **Fases:** fase-00 a fase-05 (slice end-to-end completo)
- **Descrição:** fase-00 pré-RED audit + ajuste de ~9 testes pré-existentes (D17, resolve R1) + scaffold `knowledge/nextjs/` + `THIRD-PARTY-NOTICES.md` (D14, resolve R6) + atom piloto `app-router-and-layouts.md` em EN com anti-drift clause + verifier refined (regression desde aqui, R3-A) + detector ajuste atômico (4 arquivos coordenados, mitiga R4) + fixture `nextjs-app-router-fixture/` + tracer bullet E2E `init-v7-nextjs-tracer-bullet.test.ts` provando que `runInit([])` em projeto Next 14 retorna `primary='nextjs'` e copia `.claude/knowledge/INDEX.md` + `atoms/app-router-and-layouts.md`. Valida arquitetura ponta-a-ponta ANTES de investir em 14 atoms restantes.

### Resumo por Plano

#### Plano 01 — Infra + Detector + Tracer Bullet (6 fases, ~12-14h)
> Slice end-to-end mínimo: fase-00 pré-RED audit de testes + scaffold matrix + NOTICES + piloto T1 com anti-drift + detector atômico + fixture/tracer E2E. Valida arquitetura, protocolos de qualidade e backward compat antes de investir em 14 atoms restantes. Estabelece anti-drift + verifier refined como regression desde piloto (R3-A).

Fases planejadas (criadas pelo subagente no Step 9):
- fase-00: pré-RED audit (D17, resolve R1) — grep `'nodejs-typescript'` + `'node-ts'` + `STACK_ID_TO_MATRIX_FOLDER` em tests; catalogar ~9 arquivos afetados; ajustar assertions; suite verde no estado intermediário (esta fase NÃO toca código de produção, só testes)
- fase-01: scaffold `knowledge/nextjs/` + `INDEX.md` skeleton EN (cabeçalho `# Next.js + React Knowledge — Index` per D16; preâmbulo documenta heterogeneidade EN/PT-BR per D15)
- fase-02: `THIRD-PARTY-NOTICES.md` (D14, RF-15, resolve R6) — texto MIT completo + Copyright 2025 Addy Osmani + lista das 6 SKILL.md V2 do agent-skills-main
- fase-03: atom piloto `app-router-and-layouts.md` em EN (T1) — anti-drift clause OBRIGATÓRIA no prompt do subagente extrator (R3-A); verifier refined sobre piloto (audita APENAS Senior patterns + Anti-patterns + Decision criteria, ≥80% claims rastreáveis a sources)
- fase-04: detector ajuste atômico (RF-02/03/04, mitiga R4) — `stack-id-map.ts` + `detect-stack.ts` (probeReact anchor vite.config.{ts,js,mjs}, precedência probeNextjs → probeReact → probeNodeTs) + `detect-multi-stack.ts` + `stack-aware-input-paths.ts` (pickStaticMap('react') → NEXTJS_CANDIDATES) numa única phase; unit test no pickStaticMap obrigatório no checklist
- fase-05: fixture `tests/fixtures/nextjs-app-router-fixture/` (Next 14 mínimo: 5 arquivos) + tracer bullet E2E `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` (assert primary='nextjs', INDEX.md existe, atoms/app-router-and-layouts.md existe)

#### Plano 02 — Atoms Feature-driven Next (7 fases, ~10-12h)
> Destila 6 atoms feature-driven (em EN) — 5 T1 + 1 T2 com seção PPR + 1 T3 migration tips. Extração paralelizável; verifier refined ao final do batch. Anti-drift clause aplicada em todos os prompts (regression desde Plano 01 fase-03).

Fases planejadas:
- fase-01: `react-server-components.md` (T1) — **flagged audit humano R3-B** (novo conceito Next: server vs client boundaries, props serialization, useState/useEffect proibidos em RSC)
- fase-02: `server-actions-and-mutations.md` (T1) — `'use server'`, validação Zod, revalidatePath/Tag, progressive enhancement
- fase-03: `middleware-and-edge.md` (T1) — runtime constraints, cookie handling, NextAuth/Clerk/Supabase auth patterns
- fase-04: `data-fetching-and-cache.md` (T1) — `fetch()` com cache options, Next cache layers (data cache + full route cache), revalidate, tags
- fase-05: `rendering-strategies.md` (T2 — frontmatter `next_versions: ['>=15']` na seção PPR per D13) — SSG/SSR/ISR + seção PPR (Partial Pre-Rendering Next 15+)
- fase-06: `pages-router-migration-tips.md` (T3) — migração Pages → App Router para projetos Next 13+
- fase-07: verifier refined sobre batch (6 atoms) — R3-A; bloco verbatim das compound lessons no prompt do verifier

#### Plano 03 — Cross-cutting + React + Integrations + INDEX final (7 fases, ~12-14h)
> 8 atoms restantes (cross-cutting + React conceitual + Supabase T3) + fixture Supabase variante + INDEX final consolidado com mapping das 4 skills cross-stack + verifier refined + audit humano Luiz dos 3 atoms flagged. Fecha entrega.

Fases planejadas:
- fase-01: `security-stack-specific.md` (T1, **flagged audit humano R3-B**) + `react-hooks-and-state.md` (T1) — middleware auth, CSRF, RSC leaks, secret handling, useState/useReducer/useFormState/useOptimistic
- fase-02: `performance-and-turbopack.md` (T2) + `testing-strategy.md` (T2) — bundle, RSC payload, edge cold start; Playwright, RTL, RSC tests
- fase-03: `ui-and-styling.md` (T2) + `error-handling-observability.md` (T2) — Tailwind, fonts, images, shadcn; error.tsx boundaries, OTel integration
- fase-04: `react-suspense-patterns.md` (T2) — Suspense boundaries, streaming, loading.tsx, error.tsx interplay
- fase-05: `supabase-integration.md` (T3, **flagged audit humano R3-B**) + fixture `tests/fixtures/nextjs-supabase-fixture/` (variante com `@supabase/ssr` + pasta `supabase/`) + E2E supabase CA-06 (assert `atoms/supabase-integration.md` existe quando `hasSupabaseSignal()` retorna true)
- fase-06: `INDEX.md` consolidado — `## By Cross-Stack Skill` (### For /security, ### For /react-patterns, ### For /api-design, ### For /system-design, cada uma com ≥2 atoms — CA-09) + `## By Tier` + `## By keyword` (em EN); confirmar `formatKnowledgePreview` parser top-N keywords funciona contra novo INDEX (RF-11)
- fase-07: verifier refined batch C (8 atoms) + audit humano Luiz dos 3 atoms flagged (`react-server-components` do Plano 02 fase-01 + `security-stack-specific` + `supabase-integration`) com signature `Aprovado por Luiz em YYYY-MM-DD` em STATE.md

---

## Review Checklist

- [ ] 15 atoms escritos em `knowledge/nextjs/atoms/*.md`, todos com frontmatter completo (incluindo `sources:` apontando para `Infos/knowledge/NextJS/...`)
- [ ] Nenhum atom > 200 linhas (hard cap, verifier rejeita — R3-C; excedente em `TODO.md` backlog)
- [ ] Zero placeholders `[A DEFINIR]` em qualquer atom
- [ ] Todos os atoms contêm as 4 seções obrigatórias: "When to consult" + "Senior patterns" + "Anti-patterns" + "Decision criteria"
- [ ] `INDEX.md` ≤ 100 linhas, layout D9 (`## By Cross-Stack Skill` + `## By Tier` + `## By keyword`) em EN (D15); cabeçalho `# Next.js + React Knowledge — Index` (D16); preâmbulo documenta heterogeneidade idioma
- [ ] `THIRD-PARTY-NOTICES.md` contém: texto MIT completo + `Copyright (c) 2025 Addy Osmani` + lista nomeada das 6 SKILL.md V2 (RF-15, CA-11)
- [ ] Schema `next_versions` opcional aceito por `harness:validate`; atoms Node/Rails continuam válidos (CA-10)
- [ ] `bun run harness:validate` e `bun run compound:check` passam sobre toda subárvore (NFR)
- [ ] Detector: `probeReact` retorna `'react'` quando `vite.config.{ts,js,mjs}` presente + `react` em deps SEM `next` (CA-02)
- [ ] Detector: precedência `probeNextjs > probeReact` quando projeto tem AMBOS `next` E `vite.config.ts` (CA-03 — primary='nextjs', secondary inclui 'react')
- [ ] **R4 explícito:** unit test confirma `pickStaticMap('react')` retorna `NEXTJS_CANDIDATES` (não vazio)
- [ ] Plano 01 fase-00 catalogou ~9 arquivos afetados; assertions ajustadas; suite verde no estado intermediário ANTES do mapping change
- [ ] CA-08-equivalente humano (R3-B): Luiz assinou aprovação dos 3 atoms flagged (`react-server-components`, `security-stack-specific`, `supabase-integration`) em STATE.md
- [ ] Verifier refined batch: ≥80% claims rastreáveis a `sources:` em Senior patterns + Anti-patterns + Decision criteria (R3-A) — replica meta D12 do Rails wave
- [ ] Anti-drift clause + verifier refined protocol citados nos prompts dos subagentes desde Plano 01 fase-03 (R3-A)
- [ ] E2E `init-v7-nextjs-tracer-bullet.test.ts` passa (CA-01)
- [ ] E2E supabase variante passa (CA-06)
- [ ] Todos E2E pré-existentes continuam verdes (`init-v7-tracer-bullet.test.ts`, `init-cutover-greenfield.test.ts`, `stack-knowledge-tracer-bullet.test.ts`, fixtures adr/lessons — CA-10)
- [ ] Telemetria `stack_detected` e `knowledge_copied` emitida para `nextjs` e `react` sem instrumentação adicional (NFR)
- [ ] Performance `runStackKnowledgeInit` em fixture Next.js < 500ms (CA-07, NFR pré-existente preservado)
- [ ] CHANGELOG/MEMORY documenta backward compat (D9): projetos Next pré-mudança precisam rodar `/init --refresh-knowledge`
- [ ] Provenance comments aplicados nos arquivos `.ts` modificados (formato `// 2026-05-24 (Luiz/dev): rationale + ref PRD`)

---

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

---

## Compound Opportunity

<!-- preencher ao /iterate: o que merece virar compound note? -->

Candidates a observar:
- Anti-drift + verifier refined aplicados como regression desde piloto (não apenas em batch final) — confirmar se a taxa de claims rastreáveis (~100% no Rails wave) replica para Next
- Heterogeneidade de idioma entre matrix folders (Rails/Node-TS PT-BR + Next/React EN) — documentar trade-off como pattern para próximas stacks com vocabulário consagrado em outro idioma (Go, Elixir?)
- Probe React compartilhando matrix nextjs/ (D6) — padrão para próximas linguagens com "framework dominante + base conceitual compartilhada" (ex: Phoenix+Elixir, Gin+Go?)
- Hard cap 200 linhas + TODO.md backlog → pattern de quality gate "graceful degradation" (atom denso mas auditável)

---

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

Referências entrando como regression desde Plano 01 fase-03 (R3-A — herança do Rails wave D12):
- `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` → anti-drift clause obrigatória no prompt do extrator
- `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` → verifier audita APENAS Senior patterns + Anti-patterns + Decision criteria

---

## Exit Criteria

- [ ] 15 atoms + `INDEX.md` em `knowledge/nextjs/` commitados, todos validados por verifier refined + 3 com audit humano assinado por Luiz
- [ ] `THIRD-PARTY-NOTICES.md` commitado (RF-15, CA-11) com texto MIT + Copyright Addy Osmani + lista das 6 SKILL.md V2
- [ ] Plano 01 fase-00 catalogou ~9 arquivos pré-existentes; assertions ajustadas; mapping change resultou em ZERO regressão
- [ ] Schema `next_versions` opcional no validator + regression test passando (RF-04 mantém atoms Node/Rails verdes)
- [ ] Detector: `probeReact` + precedência ajustada + helper `pickStaticMap('react')` confirmados por unit + E2E tests
- [ ] E2E suite passa: CA-01 (Next 14 tracer), CA-02 (Vite React), CA-03 (monorepo Next+Vite), CA-04 (atoms canônicos copiados), CA-05 (refresh-knowledge backward compat), CA-06 (Supabase variant), CA-07 (perf <500ms), CA-08 (harness:validate), CA-09 (INDEX coverage), CA-10 (zero regressão), CA-11 (NOTICES content)
- [ ] `bun run harness:validate` + `bun run compound:check` passam sobre toda subárvore `knowledge/`
- [ ] STATE.md marca todos os 3 planos como completed; pasta migrada para `docs/exec-plans/completed/`
- [ ] CHANGELOG documenta: nova stack + backward compat path (`/init --refresh-knowledge`)

---

## Decisões do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|---------------|
| D1 (escopo Next.js + React unificado) | Estrutura de matrix em todos os planos |
| D2 (App Router 13+ com Pages migration tips em T3) | Plano 02 fase-06 (`pages-router-migration-tips.md`) |
| D3 (destilar 14 deep-research + 6 SKILL.md V2 em 15 atoms próprios) | Todos os planos — frontmatter `sources:` referencia ambas as origens |
| D4 (Supabase como atom T3 dedicado) | Plano 03 fase-05 |
| D5 (estrutura híbrida feature + cross-cutting + React) | Plano 02 (feature-driven) + Plano 03 (cross-cutting + React) |
| D6 (probeReact separado, matrix compartilhada com nextjs) | Plano 01 fase-04 |
| D7 (4 skills cross-stack: /security, /react-patterns, /api-design, /system-design) | Plano 03 fase-06 (INDEX `## By Cross-Stack Skill`) |
| D8 (T1=fundamentos Next 14+ — 7 atoms; T2=context-dependent — 6; T3=deep-dive — 2) | Distribuição de tiers em todos os atoms |
| D9 (backward compat via /init --refresh-knowledge) | Plano 01 fase-04 — CHANGELOG/MEMORY documenta |
| D10 (fixture Next 14 App Router mínima) | Plano 01 fase-05 |
| D11 (3 planos sequenciais) | Esta estrutura |
| D12 (probeReact anchor vite.config.{ts,js,mjs} only) | Plano 01 fase-04 |
| D13 (PPR em seção dentro de rendering-strategies + frontmatter `next_versions: ['>=15']`) | Plano 02 fase-05 |
| D14 (THIRD-PARTY-NOTICES.md único + MIT + Copyright Addy Osmani) | Plano 01 fase-02 |
| D15 (atoms em EN, INDEX em EN; Rails/Node-TS permanecem PT-BR; heterogeneidade documentada em preâmbulo) | Plano 01 fase-01 (skeleton) + todos os atoms (Planos 02/03) |
| D16 (cabeçalho `# Next.js + React Knowledge — Index`) | Plano 01 fase-01 |
| D17 (fase-00 pré-RED audit ANTES do mapping change) | Plano 01 fase-00 |
| RF-15 (THIRD-PARTY-NOTICES.md) | Plano 01 fase-02 |
| **R2-C (atoms standalone, drift como custo aceito)** | Convenção em todos os atoms cross-matrix (security-stack-specific, testing-strategy) — sem cross-link header, sem drift verifier |
| **R3-A (anti-drift + verifier refined regression desde piloto)** | Plano 01 fase-03 (introduz); Plano 02 fase-07 (verifier batch); Plano 03 fase-07 (verifier batch + audit humano) |
| **R3-B (audit humano em 3 atoms flagged)** | `react-server-components` (Plano 02 fase-01), `security-stack-specific` + `supabase-integration` (Plano 03 fase-01/05); audit em Plano 03 fase-07 |
| **R3-C (hard cap 200 linhas + TODO.md backlog v6.4+)** | Review Checklist de todos os planos; verifier refined rejeita; excedente vira backlog |
| **R4 reforço (unit test `pickStaticMap('react')`)** | Review Checklist Plano 01 + fase-04 |
| **R5 (monorepo Next+Vite — comportamento esperado documentado)** | Atom `app-router-and-layouts.md` seção edge cases (Plano 01 fase-03) |
| RF-12 (CRA como Could Have / TODO futuro) | Out of scope desta iteração; registrado em `TODO.md` se sinal de demanda surgir |
| RF-13 (atom routing avançado se app-router-and-layouts > 400 linhas) | Backlog — verifier rejeita por hard cap antes; split vira decisão runtime |
| RF-14 (warning Next 13 sugere upgrade para 14+) | Could Have; backlog após release inicial |

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-05-24 a partir de PRD.md + CONTEXT.md (17 decisões) -->
