---
slug: nextjs-react-stack-knowledge
date: 2026-05-24
status: draft
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado deste PRD deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-24 (Luiz/dev): probeReact anchor vite.config only — D12 do PRD`
-->

# PRD: Next.js + React Stack Knowledge

**Status:** Draft (riscos R1/R6/R7 e OQ-1/2/3 ratificados em 2026-05-24 — pronto para /plan-feature)
**Author:** Luiz/dev + AI
**Date:** 2026-05-24
**Context:** ./CONTEXT.md (17 decisões — D1-D11 originais + D12-D17 fechando riscos/OQs)

---

## Problema

Hoje o plugin Anti-Vibe-Coding tem knowledge stack-specific para **Rails** ([knowledge/rails/](../../../knowledge/rails/)) e **Node+TypeScript** ([knowledge/nodejs-typescript/](../../../knowledge/nodejs-typescript/)), com 14 atoms cada cobrindo padrões sênior consumidos por skills cross-stack (`/security`, `/api-design`, etc.) via preface no INDEX.md.

Mas projetos **Next.js** — que são a maioria do ecossistema React em produção — recebem o knowledge genérico `nodejs-typescript/` ([stack-id-map.ts:43](../../../skills/init/lib/stack-id-map.ts#L43): `'nextjs': 'nodejs-typescript'`). Isso significa:
- Skills cross-stack consultam atoms de Node+TS puro (Fastify, Express, Prisma) quando o dev está num projeto Next.js (App Router, RSC, Server Actions, middleware).
- Padrões Next-específicos críticos (RSC boundaries, server actions vs route handlers, cache layers, middleware auth) ficam invisíveis ao plugin.
- Projetos React puros (Vite) caem em `node-ts` matrix sem nenhum atom React-conceitual.
- ~900KB de material destilável já existe em [Infos/knowledge/NextJS/](../../../Infos/knowledge/NextJS/) (14 deep-research files + 6 SKILL.md V2 do plugin do Andre) mas não está integrado.

**Impacto:** o plugin entrega valor parcial para >50% dos projetos que ele atende (todo projeto Next/Vite-React). Skills cross-stack reduzem-se ao denominador comum Node+TS, perdendo o diferencial sênior que o plugin promete.

---

## Solucao

### Outcomes (declarativo — o QUE)

- Projeto Next.js inicializado via `/init` recebe **knowledge stack-aware específico de Next.js + React** com 15 atoms (T1: 7, T2: 6, T3: 2), em vez do conteúdo genérico Node+TS.
- Projetos React puros (Vite) são detectados como stack `react` e recebem a **mesma matrix `nextjs/`** (atoms React-conceitual servem ambos os contextos).
- Skills cross-stack `/security`, `/react-patterns`, `/api-design`, `/system-design` recebem **preface stack-aware** apontando para atoms Next-específicos antes do corpo genérico.
- `.claude/knowledge/INDEX.md` instalado no projeto Next.js permite **navegação por skill cross-stack, por tier e por keyword** (mesmo modelo Rails/Node-TS).
- **Tracer bullet E2E** garante que pipeline `/init` ponta-a-ponta funciona num fixture Next 14 App Router mínimo.

### Mecanismo (algorítmico — o COMO)

**Origem dos dados:** Os 15 atoms são destilados (modelo Rails/Node-TS — frontmatter padronizado, seções "When to consult", "Senior patterns", "Anti-patterns", "Decision criteria" — **em EN**, D15) a partir de:
- 14 deep-research files em [Infos/knowledge/NextJS/compass_artifact_*.md](../../../Infos/knowledge/NextJS/) e [deep-research-report*.md](../../../Infos/knowledge/NextJS/)
- 6 SKILL.md V2 do plugin agent-skills (Addy Osmani, MIT License) em [Infos/knowledge/NextJS/agent-skills-main/](../../../Infos/knowledge/NextJS/agent-skills-main/) (`nextjs-app-router-patterns V1/V2`, `nextjs-best-practices`, `nextjs-expert`, `nextjs-supabase-auth`, `nextjs-turbopack`)

**Idioma (D15):** Atoms em **EN**. INDEX.md em EN. Heterogeneidade aceita por matrix folder — `knowledge/rails/` e `knowledge/nodejs-typescript/` permanecem PT-BR; `knowledge/nextjs/` nasce em EN para alinhar com Next.js/React docs oficiais e vocabulário do ecossistema. Documentar no preâmbulo do INDEX.md.

**Atribuição de licença (D14):** Criar `THIRD-PARTY-NOTICES.md` único (na raiz do plugin ou em `knowledge/nextjs/`) com texto MIT completo + Copyright 2025 Addy Osmani + lista das skills V2 usadas como inspiração para atoms. Atoms listam paths no frontmatter `sources:`.

**Mudanças de código:**

1. **Nova matrix folder:** `knowledge/nextjs/{INDEX.md, atoms/*.md}` espelhando layout `knowledge/rails/` e `knowledge/nodejs-typescript/`.
2. **Detector ([detect-stack.ts](../../../skills/init/lib/detect-stack.ts)):**
   - Adicionar `StackId 'react'` à union (linha 13).
   - Adicionar `probeReact` (anchor: `vite.config.{ts,js,mjs}` na raiz — D12).
   - Precedência atualizada em `PROBES`: `probeNextjs → probeReact → probeNodeTs → probeRails → probeLaravel → probePython`.
3. **Stack ID map ([stack-id-map.ts](../../../skills/init/lib/stack-id-map.ts)):**
   - `MATRIX_FOLDER_VALUES` ganha `'nextjs'`.
   - `STACK_ID_TO_MATRIX_FOLDER['nextjs'] = 'nextjs'` (era `'nodejs-typescript'`).
   - `STACK_ID_TO_MATRIX_FOLDER['react'] = 'nextjs'` (matrix compartilhada — D6).
4. **Multi-stack ([detect-multi-stack.ts](../../../skills/init/lib/detect-multi-stack.ts)):**
   - `SOURCE_EXT_BY_MATRIX['nextjs'] = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']`.
   - `ANCHOR_CHECKS` adiciona `['vite.config.ts', 'react']` e `['vite.config.js', 'react']` e `['vite.config.mjs', 'react']` (3 entries para os 3 anchors aceitos).
5. **Stack-aware input paths ([stack-aware-input-paths.ts](../../../skills/init/lib/stack-aware-input-paths.ts)):**
   - `pickStaticMap('react')` retorna `NEXTJS_CANDIDATES` (compartilhamento explícito — mitigação R4 do CONTEXT).
6. **Fixture + Tracer bullet:** `tests/fixtures/nextjs-app-router-fixture/` (Next 14 mínimo: `package.json`, `src/app/{page,layout}.tsx`, `next.config.js`, `tsconfig.json`) + `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` modelado em [init-v7-tracer-bullet.test.ts](../../../tests/e2e/init-v7-tracer-bullet.test.ts).

**Lista canônica de atoms (15):**

```
knowledge/nextjs/atoms/
  # Feature-driven Next (T1)
  app-router-and-layouts.md
  react-server-components.md
  server-actions-and-mutations.md
  middleware-and-edge.md
  data-fetching-and-cache.md
  # Feature-driven Next (T2)
  rendering-strategies.md         # SSG/SSR/ISR + seção PPR Next 15+ (D13)
  # Cross-cutting (T1)
  security-stack-specific.md
  # Cross-cutting (T2)
  performance-and-turbopack.md
  testing-strategy.md
  ui-and-styling.md
  error-handling-observability.md
  # React conceitual (T1+T2)
  react-hooks-and-state.md        # T1
  react-suspense-patterns.md      # T2
  # Integrations / legacy (T3)
  supabase-integration.md         # T3
  pages-router-migration-tips.md  # T3
```

---

## Fluxos UX por Ator

<!-- Skill é dev-tooling/CLI sem UI dedicada. Fluxo é "dev → CLI /init". -->

### Dev (consumidor do plugin) — Projeto greenfield Next.js

1. Dev clona um projeto Next 14 App Router e roda `/init` no Claude Code.
2. Step `detect-legacy-and-stack` identifica `primary: 'nextjs'` via `probeNextjs` (`package.json#dependencies.next`).
3. Step `copy-knowledge` resolve `STACK_ID_TO_MATRIX_FOLDER['nextjs']` = `'nextjs'` → copia `knowledge/nextjs/{INDEX.md, atoms/*}` para `.claude/knowledge/`.
4. Step emite preview (RF10 existente): `Top keywords: app router, RSC, server actions, middleware, ...`.
5. Dev posteriormente invoca `/security` para revisar middleware → skill detecta stack via `.claude/stack.json` e cita `middleware-and-edge` antes do corpo genérico.

**Mensagens emitidas (logger CLI):**
- Sucesso: `[copy-knowledge] copy-knowledge: stack=nextjs, status=ok`
- Greenfield React puro: `[copy-knowledge] copy-knowledge: stack=react, status=ok` (matrix `nextjs/`)

### Dev — Projeto que já rodou /init antes desta mudança

1. Dev tem `.claude/stack.json` com `primary: 'nodejs-typescript'` (estado antigo onde Next mapeava para Node-TS).
2. Dev roda `/init --refresh-knowledge` ou `/init` em modo re-populate (D9).
3. Detector re-executa, agora retorna `primary: 'nextjs'` com novo mapping.
4. `copyKnowledge` com `refresh: true` sobrescreve `.claude/knowledge/` com conteúdo `knowledge/nextjs/`.

**Mensagem informativa esperada no CHANGELOG/MEMORY do Plano 01:** "Projetos Next.js previamente inicializados precisam re-rodar `/init --refresh-knowledge` para receber o novo matrix `nextjs/`."

---

## Requisitos Funcionais

### Must Have (44% — 7 de 16)
- [ ] **RF-01:** Matrix folder `knowledge/nextjs/` criado contendo `INDEX.md` (cabeçalho `# Next.js + React Knowledge — Index` — D16; com seções "By Cross-Stack Skill", "By Tier", "By keyword" — em EN, D15) + diretório `atoms/` populado com no mínimo os 7 atoms T1.
- [ ] **RF-02:** [stack-id-map.ts](../../../skills/init/lib/stack-id-map.ts) atualizado: `MATRIX_FOLDER_VALUES` inclui `'nextjs'`; `STACK_ID_TO_MATRIX_FOLDER['nextjs']` é `'nextjs'` (não mais `'nodejs-typescript'`).
- [ ] **RF-03:** [detect-stack.ts](../../../skills/init/lib/detect-stack.ts) adiciona `probeReact` (anchor: `vite.config.{ts,js,mjs}` only — D12; CRA não é anchor) e `StackId 'react'`; precedência `probeNextjs → probeReact → probeNodeTs`.
- [ ] **RF-04:** [detect-multi-stack.ts](../../../skills/init/lib/detect-multi-stack.ts) e [stack-aware-input-paths.ts](../../../skills/init/lib/stack-aware-input-paths.ts) ajustados (SOURCE_EXT_BY_MATRIX, ANCHOR_CHECKS, pickStaticMap) sem regressão nos testes existentes.
- [ ] **RF-05:** Tracer bullet E2E (`tests/e2e/init-v7-nextjs-tracer-bullet.test.ts`) verde, asserindo: `primary='nextjs'`, `.claude/knowledge/INDEX.md` existe, `.claude/knowledge/atoms/app-router-and-layouts.md` existe.
- [ ] **RF-06:** Os 6 atoms T2 cross-cutting e React (performance-and-turbopack, testing-strategy, ui-and-styling, error-handling-observability, rendering-strategies, react-suspense-patterns) populados no padrão Rails/Node-TS (frontmatter + 4 seções obrigatórias) — **conteúdo em EN (D15)**.
- [ ] **RF-15 (D14):** `THIRD-PARTY-NOTICES.md` criado (raiz do plugin OU `knowledge/nextjs/THIRD-PARTY-NOTICES.md`) contendo: texto MIT completo + Copyright 2025 Addy Osmani + lista das 6 SKILL.md V2 do agent-skills-main usadas como inspiração + link para [Infos/knowledge/NextJS/agent-skills-main/LICENSE](../../../Infos/knowledge/NextJS/agent-skills-main/LICENSE).

### Should Have
- [ ] **RF-07:** Atom T3 `supabase-integration.md` populado, com seção carregada quando `hasSupabaseSignal()` ([stack-aware-input-paths.ts:446-473](../../../skills/init/lib/stack-aware-input-paths.ts#L446-L473)) retornar `true`.
- [ ] **RF-08:** Atom T3 `pages-router-migration-tips.md` populado (cobre migração Pages → App Router para projetos Next 13+).
- [ ] **RF-09:** Fixture variante `tests/fixtures/nextjs-supabase-fixture/` + teste E2E adicional que valida supabase-integration carregado quando signal bate.
- [ ] **RF-10:** INDEX.md `## By Cross-Stack Skill` (EN — D15) cobre 4 skills (`/security`, `/react-patterns`, `/api-design`, `/system-design`) com mapping explícito de atoms.
- [ ] **RF-11:** [run-stack-knowledge-init.ts:9](../../../skills/init/lib/run-stack-knowledge-init.ts#L9) (mensagem `formatKnowledgePreview`) parser top-N keywords funciona contra o novo INDEX.md sem ajustes (preserva compat com regex/format atual).

### Could Have
- [ ] **RF-12:** Anchor CRA (`react-scripts` em deps) como variante futura do probeReact — registrado como TODO se a comunidade pedir.
- [ ] **RF-13:** Atom dedicado de routing avançado (parallel routes, intercepting routes) se `app-router-and-layouts.md` ficar >400 linhas.
- [ ] **RF-14:** Warning estilo `extractRailsVersionWarning` ([run-stack-knowledge-init.ts:116-128](../../../skills/init/lib/run-stack-knowledge-init.ts#L116-L128)) para Next 13 (sugerir upgrade para 14+).

### Won't Have (desta versão)
- **React Native** — domínio próprio (mobile), fora do escopo deste matrix.
- **Pages Router atoms em T1/T2** — somente migration tips em T3 (decisão D2). Pages Router está em manutenção desde Next 13.
- **Matrix `react/` própria** — D6 rejeita; matrix compartilhada com nextjs evita duplicação.
- **Migration step automático que detecta `'nodejs-typescript'` em stack.json + Next signal e re-copia** — D9 rejeita por complexidade vs benefício baixo; `/init --refresh-knowledge` cobre.
- **Atoms dedicados a libs específicas** (TanStack Query, SWR, Zustand, Jotai, Radix, shadcn) — entram como exemplos dentro dos atoms cross-cutting, não como atoms próprios.
- **Atom dedicado a deploy Vercel/edge** — cabe dentro de `performance-and-turbopack.md` ou seção futura `operations-and-deploy.md` se demanda aparecer.
- **Tradução para PT-BR dos atoms knowledge/nextjs/** — D15 escolheu EN. Atoms permanecem em EN; somente preface emitido pela skill cross-stack permanece em PT-BR (texto wrapper). Heterogeneidade aceita conscientemente.
- **Atribuição inline em cada atom (header MIT por arquivo)** — D14 rejeita; usar `THIRD-PARTY-NOTICES.md` único é prática padrão e mantém atoms limpos.

---

## Requisitos Nao-Funcionais

- **Performance da init:** `runStackKnowledgeInit` em projeto Next.js fixture continua < 500ms (NFR existente preservado).
- **Cobertura de testes:** Plano 01 atinge ≥90% de cobertura nos arquivos modificados ([detect-stack.ts](../../../skills/init/lib/detect-stack.ts), [stack-id-map.ts](../../../skills/init/lib/stack-id-map.ts), [detect-multi-stack.ts](../../../skills/init/lib/detect-multi-stack.ts), [stack-aware-input-paths.ts](../../../skills/init/lib/stack-aware-input-paths.ts)).
- **Validação de schema:** todos os atoms passam por `bun run harness:validate` e `bun run compound:check` (CLAUDE.md exige antes de commit que toca `docs/` ou estrutura semelhante).
- **Provenance:** todo comentário inline novo (em arquivos `.ts` modificados) segue formato `// YYYY-MM-DD (Luiz/dev): rationale + ref PRD` — princípio universal #5.
- **Densidade dos atoms:** cada atom deve seguir as 4 seções padrão (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão) e referenciar `sources:` no frontmatter.
- **Zero regressão:** todos os testes E2E pré-existentes ([init-v7-tracer-bullet.test.ts](../../../tests/e2e/init-v7-tracer-bullet.test.ts), [init-cutover-greenfield.test.ts](../../../tests/e2e/init-cutover-greenfield.test.ts), [stack-knowledge-tracer-bullet.test.ts](../../../tests/e2e/stack-knowledge-tracer-bullet.test.ts) e os fixtures de adr/lessons) continuam verdes.

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| DT-1 (D1) | Escopo da stack | Next.js + React unificado em `knowledge/nextjs/` | Next.js only / Pastas separadas | Maioria React = Next; React conceitual leveraged em ambos; uma matrix economiza manutenção |
| DT-2 (D3) | Estratégia de destilação | Destilar 14 deep-research + 6 SKILL.md V2 em ~15 atoms próprios padronizados | Copiar SKILL.md V2 literalmente / Híbrido curado | Consistência com Rails/Node-TS é crítica para skills cross-stack consumirem preface uniforme |
| DT-3 (D5) | Estrutura dos atoms | Híbrido feature-driven + cross-cutting + React conceitual | Por feature only / Por preocupação only | Deep-research organizados por feature; consulta vem por feature OU por preocupação dependendo do problema |
| DT-4 (D6, D12) | Detecção de React puro | Probe React separado, anchor `vite.config.{ts,js,mjs}` only, matrix compartilhada com nextjs | Sem probe React / CRA também | CRA EOL desde 2025-02; vite anchor é limpo e sem falso-positivo; compartilhar matrix evita duplicação |
| DT-5 (D7) | Skills cross-stack com preface | 4 skills: /security, /react-patterns, /api-design, /system-design | Adicionar /infrastructure ou /architecture | /react-patterns é a mais natural para Next; outras 3 mapeiam direto para atoms existentes; /infra e /architecture entrariam forçados |
| DT-6 (D8) | Critério de Tier | T1 = fundamentos Next 14+ (7 atoms); T2 = context-dependent (6); T3 = deep-dive/legacy (2) | T1=tudo Next / T1=mínimo React+App Router | Espelha modelo Rails; T1 vai no preface das skills cross-stack — precisa ser ENXUTO e UNIVERSAL |
| DT-7 (D9) | Backward compatibility | Re-run `/init --refresh-knowledge` (documentado no CHANGELOG/MEMORY) | Migration step automático / Fallback temporário | Refresh já existe na pipeline; migração explícita pelo usuário é mais previsível que mágica em runtime |
| DT-8 (D11) | Granularidade dos planos | 3 planos sequenciais (Infra → Feature-driven → Cross-cutting+Integrations) | 1 plano gigante / 2 planos | Granularidade permite ship incremental; Plano 01 já entrega valor (matrix existe, projeto Next detecta corretamente) |
| DT-9 (D13) | PPR (Next 15+) | Seção dentro de `rendering-strategies.md` marcada `next_versions: ['>=15']` no frontmatter | Atom T3 próprio `ppr-partial-prerendering.md` | Mantém T2 coeso; padrão `*_versions` já existe (Rails usa `rails_versions: ['>=8.0']`) |
| DT-10 (D14) | Atribuição MIT (SKILL.md V2 do Andre) | `THIRD-PARTY-NOTICES.md` único na raiz do plugin com texto MIT + Copyright 2025 Addy Osmani | Header MIT inline em cada atom / Ignorar | MIT exige preservar copyright em "copies or substantial portions"; NOTICES único é prática padrão (kernel/Apache); atoms ficam limpos |
| DT-11 (D15) | Idioma dos atoms knowledge/nextjs/ | **EN** | PT-BR (consistência com Rails/Node-TS) | Comunidade Next/React global produz em EN; tradução cria fricção com termos técnicos consagrados; alinha com docs oficiais. Trade-off aceito: heterogeneidade por matrix |
| DT-12 (D16) | Cabeçalho do INDEX.md | `# Next.js + React Knowledge — Index` (forma explícita) | "Next.js Knowledge — Index" com nota sobre React | Título declara escopo real (matrix serve Next E React via D6); reduz dúvida para devs Vite |
| DT-13 (D17) | Mitigação de R1 | Plano 01 fase-00 pré-RED dedicada (audit + ajuste de assertions ANTES do mapping change) | Mudar mapping e consertar testes "no fluxo" | Isolamento pré-RED torna mudança atômica; audit independente é mais barato que debug pós-falha |

---

## Criterios de Aceite

- [ ] **CA-01 (RF-01, RF-02, RF-03, RF-04):** Dado um projeto Next 14 App Router (fixture `nextjs-app-router-fixture/`), quando rodar `runInit([])`, então `.claude/stack.json` contém `"primary": "nextjs"` e `.claude/knowledge/INDEX.md` existe com cabeçalho `# Next.js + React Knowledge — Index`.
- [ ] **CA-02 (RF-03):** Dado um projeto com `vite.config.ts` + `react` em `package.json#dependencies` mas SEM `next` em deps, quando rodar `detectStack(targetDir)`, então `primary === 'react'` e `signalSource === 'vite.config.ts'`.
- [ ] **CA-03 (RF-03 — precedência):** Dado um projeto com `package.json#dependencies.next` E `vite.config.ts` (caso de monorepo onde a raiz é Next), quando rodar `detectStack`, então `primary === 'nextjs'` (probeNextjs vence) e `secondary` inclui `'react'`.
- [ ] **CA-04 (RF-05, RF-06):** Dado o fixture `nextjs-app-router-fixture/`, quando rodar `runInit`, então `.claude/knowledge/atoms/` contém os 13 atoms canônicos T1 + T2 (todos exceto supabase-integration e pages-router-migration-tips se Plano 03 não tiver ainda rodado).
- [ ] **CA-05 (RF-02 — backward compat):** Dado um projeto Next 14 que já foi inicializado pré-mudança (com `.claude/stack.json` contendo `"primary": "nodejs-typescript"`), quando rodar `runInit(['--refresh-knowledge'])`, então `.claude/stack.json` é atualizado para `"primary": "nextjs"` E `.claude/knowledge/INDEX.md` é sobrescrito com o conteúdo da matrix nextjs.
- [ ] **CA-06 (RF-07 — Supabase):** Dado o fixture `nextjs-supabase-fixture/` (com pasta `supabase/` + dep `@supabase/ssr`), quando rodar `runInit`, então `.claude/knowledge/atoms/supabase-integration.md` existe e tem frontmatter `tier: 3` + `triggers: [supabase, RLS, auth.js, SSR]`.
- [ ] **CA-07 (NFR-Performance — edge case):** Dado um projeto Next.js de 1.000 arquivos `.tsx`, quando rodar `runStackKnowledgeInit`, então duração total < 500ms p95 (NFR pré-existente preservado).
- [ ] **CA-08 (NFR-Validação — edge case):** Dado os 15 atoms novos em `knowledge/nextjs/atoms/`, quando rodar `bun run harness:validate`, então saída é "valid" sem erros de schema.
- [ ] **CA-09 (RF-01, RF-10 — INDEX coverage em EN):** Dado `knowledge/nextjs/INDEX.md`, quando grepar pela seção `## By Cross-Stack Skill`, então existem subseções `### For /security`, `### For /react-patterns`, `### For /api-design`, `### For /system-design`, cada uma com no mínimo 2 atoms listados. Cabeçalho do arquivo é `# Next.js + React Knowledge — Index` (D16).
- [ ] **CA-10 (RF-04 — zero regressão):** Dado todos os fixtures pré-existentes em `tests/fixtures/`, quando rodar `bun test`, então 100% dos testes E2E + unit pré-mudança permanecem verdes (Rails, Node-TS, Python, Laravel paths não regridem). **Pré-condição (D17):** fase-00 do Plano 01 deve ter ajustado os ~9 arquivos que assertam `'nodejs-typescript'`/`'node-ts'` em projeto Next antes do mapping change.
- [ ] **CA-11 (RF-15 — licença):** Dado `THIRD-PARTY-NOTICES.md` (raiz do plugin OU `knowledge/nextjs/`), quando inspecionar conteúdo, então contém: texto MIT completo + linha `Copyright (c) 2025 Addy Osmani` + lista nomeada das 6 SKILL.md V2 do agent-skills-main usadas como inspiração + link relativo ou nota para [Infos/knowledge/NextJS/agent-skills-main/LICENSE](../../../Infos/knowledge/NextJS/agent-skills-main/LICENSE).

---

## Out of Scope

- **React Native** — domínio mobile separado, não pertence a `knowledge/nextjs/`.
- **Frameworks Meta-React** além de Next (Remix, TanStack Start, Astro) — só Next nesta iteração; padrões podem ser adicionados como atoms próprios em PRD futuro se demanda comprovada.
- **Migração automática silenciosa** de projetos pré-mudança (DT-7 — explicitamente rejeitada).
- **Atoms dedicados a libs específicas** (TanStack Query, shadcn, Zustand) — entram como exemplos dentro de atoms cross-cutting.
- **Documentação de Vercel-specific deploy** — não é responsabilidade do plugin (não somos Vercel docs).
- **Re-tradução dos atoms knowledge/nextjs/ para PT-BR** — D15 escolheu EN. Atoms permanecem em EN; tradução não está no escopo desta versão (nem das próximas — heterogeneidade por matrix é decisão arquitetural).
- **Knowledge para projetos Next.js que usam Pages Router como driver primário** — Pages Router só é coberto em T3 migration tips.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Material fonte | 14 deep-research files + 6 SKILL.md V2 em [Infos/knowledge/NextJS/](../../../Infos/knowledge/NextJS/) | Disponível (já baixado, ~900KB) |
| Helper existente | [stack-aware-input-paths.ts](../../../skills/init/lib/stack-aware-input-paths.ts) com `NEXTJS_CANDIDATES` + `NEXTJS_SUPABASE_EXTRA` | Pronto — só precisa `pickStaticMap('react')` |
| Pipeline existente | [run-stack-knowledge-init.ts](../../../skills/init/lib/run-stack-knowledge-init.ts) com `refresh` flag + `copyKnowledge` | Pronto — só consome novo matrix |
| Fixture de referência | [init-v7-tracer-bullet.test.ts](../../../tests/e2e/init-v7-tracer-bullet.test.ts) + [init-v7-greenfield fixture](../../../tests/e2e/__fixtures__/init-v7-greenfield/) | Pronto — serve de molde |
| Padrão de atom | [knowledge/rails/INDEX.md](../../../knowledge/rails/INDEX.md) + [knowledge/nodejs-typescript/atoms/](../../../knowledge/nodejs-typescript/atoms/) | Pronto — referência de layout |
| Validação | `bun run harness:validate` + `bun run compound:check` (CLAUDE.md raiz) | Disponível |

---

## Riscos

| Risco | Status | Probabilidade | Impacto | Mitigacao |
|-------|--------|--------------|---------|-----------|
| **R1:** Mudar `STACK_ID_TO_MATRIX_FOLDER['nextjs']` quebra testes pré-existentes que assertam `'nodejs-typescript'` em projeto Next.js | **RESOLVED (D17)** | Alta | Médio | **Plano 01 ganha fase-00 pré-RED dedicada** — audit grep por `'nodejs-typescript'` + `'node-ts'` + `STACK_ID_TO_MATRIX_FOLDER` em testes, catalogar ~9 arquivos, ajustar assertions ANTES do mapping change, confirmar suite verde, então mudar mapping |
| **R2:** Drift entre atoms Next (`security-stack-specific.md`, `testing-strategy.md`) e atoms Node-TS de mesmo nome | Active | Média | Médio | Convenção no PRD: atoms Next referenciam Node-TS genérico via link relativo (`../../nodejs-typescript/atoms/security-stack-specific.md`) e adicionam só o Next-específico; documentar em `knowledge/nextjs/INDEX.md` preâmbulo. **Nota D15:** referência cross-matrix mistura EN (Next) com PT-BR (Node-TS) — aceito |
| **R3:** Destilação de 14 deep-research vira copy-paste sem síntese real | Active | Média | Alto | Planos 02/03 definem CRITÉRIO DE QUALIDADE explícito por atom: anti-padrões + critérios de decisão + "when NOT to use" obrigatórios (espelho do padrão Node-TS, adaptado para EN); plan-verifier audita |
| **R4:** Probe React retorna `'react'` mas helper `stack-aware-input-paths.ts` não tem `pickStaticMap('react')` → paths vazios | Active | Alta (se esquecido) | Alto | RF-04 acopla as 4 mudanças (stack-id-map + detect-stack + detect-multi-stack + stack-aware-input-paths) num único plano (Plano 01) — não permitir merge parcial |
| **R5:** Monorepo com `next` E `vite` em packages distintos (raiz é Next, package vite-react isolado) gera `secondary: ['react']` redundante e ruidoso | Active (aceito) | Baixa | Baixo | Documentar como comportamento esperado no atom `app-router-and-layouts.md` seção edge cases; CA-03 cobre via assertion `secondary inclui 'react'`; deixar telemetria capturar antes de codar fix |
| **R6:** SKILL.md V2 do Andre podem ter licença incompatível | **RESOLVED (D14)** | Baixa | Alto | **Verificado:** [Infos/knowledge/NextJS/agent-skills-main/LICENSE](../../../Infos/knowledge/NextJS/agent-skills-main/LICENSE) é **MIT** (Copyright 2025 Addy Osmani). Ação: RF-15 cria `THIRD-PARTY-NOTICES.md` único com texto MIT + atribuição; atoms listam `sources:` no frontmatter |
| **R7:** Inconsistência de idioma PT-BR vs EN entre matrix folders | **RESOLVED (D15 — trade-off aceito)** | N/A | Baixo | Decisão dev: knowledge/nextjs/ nasce em **EN** (alinhado a Next/React docs oficiais). Rails/Node-TS permanecem PT-BR. Heterogeneidade documentada em preâmbulo do INDEX.md. **Não há mitigação** — é escolha consciente, não risco a mitigar |

---

## Notas para os Planos

- **Plano 01 (Infra) — alvo: ~6-7 fases (cresceu por causa de fase-00):**
  - **fase-00 (pré-RED audit — D17, resolve R1):** grep `'nodejs-typescript'`, `'node-ts'`, `STACK_ID_TO_MATRIX_FOLDER` em `tests/**` e `skills/init/lib/**/*.test.ts`; catalogar ~9 arquivos afetados; ajustar assertions ANTES do mapping change; suite verde no estado intermediário antes de prosseguir. **Esta fase NÃO toca código de produção, só testes.**
  - **fase-01:** scaffold `knowledge/nextjs/` (matrix folder + INDEX.md skeleton com cabeçalho EN — D16).
  - **fase-02:** RF-15 — criar `THIRD-PARTY-NOTICES.md` (D14, resolve R6) com texto MIT + Copyright 2025 Addy Osmani + lista das 6 SKILL.md V2.
  - **fase-03:** 1-2 atoms T1 piloto em EN (`app-router-and-layouts.md`) seguindo padrão Rails/Node-TS adaptado para EN.
  - **fase-04:** detector ajuste completo (RF-02/03/04 — `stack-id-map.ts` + `detect-stack.ts` + `detect-multi-stack.ts` + `stack-aware-input-paths.ts`) numa única phase atômica.
  - **fase-05:** fixture `nextjs-app-router-fixture/` + tracer bullet E2E (`init-v7-nextjs-tracer-bullet.test.ts`).
- **Plano 02 (Atoms Feature-driven Next, em EN) — alvo: ~6-7 fases:** destilar os 6 atoms feature-driven restantes (react-server-components, server-actions-and-mutations, middleware-and-edge, data-fetching-and-cache, rendering-strategies **com seção PPR + frontmatter `next_versions: ['>=15']` — D13**, pages-router-migration-tips). Atoms T1 primeiro, T2/T3 depois.
- **Plano 03 (Cross-cutting + Integrations, em EN) — alvo: ~6-7 fases:** destilar os 7 atoms restantes (security-stack-specific, performance-and-turbopack, testing-strategy, ui-and-styling, error-handling-observability, react-hooks-and-state, react-suspense-patterns, supabase-integration) + fixture supabase variante + INDEX.md final consolidado com mappings completos das 4 skills cross-stack (seções em EN: "By Cross-Stack Skill", "By Tier", "By keyword").

**Reuso e source pointers:** cada atom destilado deve listar no frontmatter `sources:` os deep-research files originais (ex: `compass_artifact_wf-137d7e26-...md`) E as SKILL.md V2 do Andre quando aplicável (ex: `nextjs-app-router-patterns V2/SKILL.md`) — padrão já estabelecido em [knowledge/nodejs-typescript/atoms/security-stack-specific.md](../../../knowledge/nodejs-typescript/atoms/security-stack-specific.md) linhas 5-7.

**Convenção de linguagem (D15):** todos os atoms em `knowledge/nextjs/atoms/*.md`, INDEX.md, e seções internas em EN. Comentários inline em código `.ts` modificado permanecem em PT-BR (padrão do plugin Anti-Vibe-Coding) seguindo formato `// 2026-05-24 (Luiz/dev): rationale + ref PRD`.
