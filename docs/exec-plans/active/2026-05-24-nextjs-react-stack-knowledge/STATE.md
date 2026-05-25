# State: Next.js + React Stack Knowledge

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 03/3
**Last Updated:** 2026-05-25 (fase-06 done)
**Detailed plans created:** Plano 01 (6 fases), Plano 02 (7 fases), Plano 03 (7 fases). Todos os 3 planos detalhados.

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Infra + Detector + Tracer Bullet | 6 | 6/6 | done |
| 02 | Atoms Feature-driven Next (EN) | 7 | 7/7 | done |
| 03 | Cross-cutting + React + Integrations + INDEX final | 7 | 6/7 | in-progress |

## Progress Global

Fases done: 19/20 (95%)

## Atoms Flagged para Audit Humano (R3-B)

| Atom | Plano | Fase de criação | Auditor | Status | Data |
|------|-------|----------------|---------|--------|------|
| `react-server-components.md` (T1) | 02 | fase-01 | Luiz | pending | — |
| `security-stack-specific.md` (T1) | 03 | fase-01 | Luiz | pending | — |
| `supabase-integration.md` (T3) | 03 | fase-05 | Luiz | pending | — |

Audit final agendado para Plano 03 fase-07 (signature `Aprovado por Luiz em YYYY-MM-DD`).

## Log

- 2026-05-24: Plano criado via /plan-feature; 17 decisões do PRD/CONTEXT aplicadas; riscos R1/R6/R7 RESOLVED, R2/R5 ACCEPTED, R3/R4 MITIGATED com gates explícitos
- 2026-05-24: Plano 02 detalhado criado via /plan-feature (subagente isolado) — 7 fases (~12.5h), anti-drift clause + verifier protocol regression aplicados; fase-01 (react-server-components) flagged R3-B audit humano pending Luiz
- 2026-05-24: Plano 03 detalhado criado via /plan-feature (subagente isolado) — 7 fases (~12h); 8 atoms restantes (cross-cutting + React + Supabase) + INDEX final consolidado + fixture supabase + verifier batch C + audit humano R3-B dos 3 atoms flagged; **incoerencia critica descoberta:** parser `format-knowledge-preview.ts:28` hardcoded PT-BR (`## Por keyword`) — quebra preview de Next.js (INDEX em EN per D15); fix planejado em Plano 03 fase-06 (regex `(?:Por|By)`, backward-compatible) + teste novo
- 2026-05-24: Plano 01 fase-00 (pre-RED audit) concluida — audit-report-fase00.md (86 linhas) catalogou 19 hits em 11 arquivos. ZERO casos categoria B (PRD estimava ~9). `bun test` EXIT=0; `git diff --stat skills/init/lib/` vazio (G7 ✓). Implicacao: fase-04 pode aplicar mapping change atomicamente sem regressao. `bun run lint` ausente — usar `bun run typecheck` futuramente (DI-Plano01-fase00-lint-script-ausente).
- 2026-05-24: Plano 01 fase-01 (scaffold knowledge/nextjs) concluida (UNCOMMITTED, aguarda bundle) — `knowledge/nextjs/INDEX.md` (82 linhas, EN, cabecalho `# Next.js + React Knowledge — Index`, preambulo D15+D6, ## By Cross-Stack Skill, ## By Tier (T1=7/T2=6/T3=2), ## By keyword placeholder, ## Status) + `knowledge/nextjs/atoms/.gitkeep`. GT-Plano01-fase01-harness-validate-atoms-vazia: `bun run harness:validate` REGRIDE com atoms/ vazia ([knowledge-presence]); estrategia: bundlar fase-01+02+03 num unico commit.
- 2026-05-24: Plano 01 fase-02 (THIRD-PARTY-NOTICES.md) concluida (UNCOMMITTED, aguarda bundle) — arquivo na RAIZ do plugin (DI-Plano01-fase02-NOTICES-na-raiz, padrao kernel/Apache), MIT verbatim de `Infos/knowledge/NextJS/agent-skills-main/LICENSE` (sem typo "OUT OF OU" — DI-Plano01-fase02-MIT-source-sem-typo), Copyright (c) 2025 Addy Osmani, lista das 6 SKILL.md V2 (CA-11 grep checks: MIT=1, Copyright=1, 6 skills=6). `bun test` + `compound:check` verdes; `harness:validate` 2 erros pre-existentes (atoms/ vazia + broken-link CHANGELOG/rails-anchor — nao introduzidos por fase-02). GT-Plano01-fase02-skills-location-V2: skills com sufixo ` V2` no nome do diretorio.
- 2026-05-24: Plano 01 fase-03 (piloto app-router-and-layouts.md) concluida (UNCOMMITTED, aguarda bundle) — `knowledge/nextjs/atoms/app-router-and-layouts.md` (141 linhas, EN, T1, 5 H2 sections, 7 frontmatter fields, 5 senior patterns + 3 anti-patterns + 9-row decision table + R5 edge case monorepo). Extrator subagente recebeu REGRA DE FIDELIDADE verbatim do compound 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md. Verifier subagente aplicou VERIFIER REFINED PROTOCOL verbatim do compound 2026-05-16-verifier-protocol-technical-sections-only.md — auditou 24 claims tecnicas (Senior patterns + Anti-patterns + Decision criteria; pulou When to consult e Edge cases per protocol). Taxa inicial: 23/24=95.8% (APROVADO, gate ≥80%). Polish aplicado: 1 source adicionado (compass dbd12769 que continha quote verbatim Next.js docs) -> taxa final 24/24=100%. Verifier-report: `plano01/verifier-report-fase03.md`. `harness:validate` agora retorna SO o erro pre-existente CHANGELOG/rails-anchor (atoms/ vazia error GONE). Anti-drift + verifier refined ESTABELECIDOS como REGRESSION desde aqui — Plano 02/03 reusam blocos verbatim.
- 2026-05-24: Plano 01 fases 01+02+03 BUNDLADAS em commit `3c55bdf` (R4 anti-regressao + GT atoms-vazia). Plano 01 fase-04 (detector atomic change) concluida em commit `4be337d` — 9 arquivos coordenados (7 spec + 2 typecheck-required: `customize-architecture.ts` + `legacy-manifest-schema.ts`). Mudancas: `STACK_ID_TO_MATRIX_FOLDER['nextjs']` agora retorna `'nextjs'` (era `'nodejs-typescript'`); `'react': 'nextjs'` adicionado (matriz compartilhada per D6); `StackId` ganhou `'react'`; `probeReact` (vite.config + react em deps, G8 false-positive guard); PROBES reordenado: `[probeNextjs, probeReact, probeNodeTs, ...]` (G3 mitigation precedencia); `SOURCE_EXT_BY_MATRIX['nextjs']` adicionado; `pickStaticMap('react')` retorna `NEXTJS_CANDIDATES`. 4 testes novos: probeReact positivo, probeNextjs vence monorepo, false-positive guard sem react, pickStaticMap('react'). `bun test` (44/44 nos 3 arquivos modificados), `bun typecheck` zero novos erros, `harness:validate` so erro pre-existente CHANGELOG/rails-anchor. DI-Plano01-fase04-scope-expansao-2-arquivos e DI-Plano01-fase04-tdd-evidence-warn registrados no MEMORY.
- 2026-05-24: Plano 01 fase-05 (tracer bullet E2E + fixture Next.js) concluida — `tests/fixtures/nextjs-app-router-fixture/` (5 arquivos: package.json, next.config.js, tsconfig.json, src/app/page.tsx, src/app/layout.tsx); `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` (11 testes, CA-01/02/03/07); bug fix em `detect-multi-stack.ts` (DI-fase05-detectMultiStack-anchor-gap: adicionado `next.config.{js,ts}` como anchor nextjs-especifico em ANCHOR_CHECKS antes de package.json). 11/11 testes verdes, `bun test` global EXIT=0, perf CA-07 ~138ms total suite. Plano 01 concluido. Proximos: Plano 02 (Atoms Feature-driven Next).
- 2026-05-25: Plano 02 concluido (7/7 fases) — verifier batch 6/6 APPROVE, 100% rastreabilidade, 0 reworks. Transicao para Plano 03 (Current Plan: 03/3). Sessao encerrada para troca de contexto — Plano 03 retoma na proxima invocacao de /execute-plan.
- 2026-05-25: Plano 02 Wave 2 (fases 04+05+06) concluida em paralelo — `data-fetching-and-cache.md` (183 linhas, 5 patterns, 4 anti-patterns, 8 rows; Next 14 vs 15 defaults documentados), `rendering-strategies.md` (165 linhas, T2, PPR marker confirmado, `next_versions: ['>=15']` frontmatter, 4 patterns, 9 rows), `pages-router-migration-tips.md` (146 linhas, T3, 4 patterns, 11-row mapping table). Todos 6 atoms Plano 02 presentes. Fase-07 (verifier batch) iniciando.
- 2026-05-25: Plano 02 Wave 1 (fases 01+02+03) concluida em paralelo — 3 atoms criados: `react-server-components.md` (196 linhas, 4 patterns, 4 anti-patterns, 8 rows), `server-actions-and-mutations.md` (168 linhas, 5 patterns, 4 anti-patterns, 8 rows), `middleware-and-edge.md` (165 linhas, 5 patterns, 4 anti-patterns, 9 rows). Todos dentro do hard cap 200. `harness:validate` so erro pre-existente CHANGELOG/rails-anchor. Todos 4 secoes obrigatorias presentes. Wave 2 iniciando (fases 04+05+06).
- 2026-05-25: Plano 03 fase-06 (INDEX final + parser RF-11) concluida — `knowledge/nextjs/INDEX.md` final (81L, 4 skills cross-stack CA-09, 15 atoms T1/T2/T3, 15-row keyword table EN); parser `format-knowledge-preview.ts` regex `(?:Por|By)` backward-compat + provenance comment; 1 novo teste EN (14/14 tests pass). TDD RED (`expected [] toEqual ['a'..'h']`) + GREEN confirmados. parseTopKeywords retorna 8 keywords do INDEX EN. Progresso: 6/7 fases. Fase-07 pendente (verifier batch + audit humano 3 atoms R3-B).
- 2026-05-25: Plano 03 Wave 2 (fases 04+05) concluida em paralelo — `react-suspense-patterns.md` (178L, T2; use() omitido por ausencia nos sources), `supabase-integration.md` (183L, T3, R3-B, RLS/signed-URLs/edge-functions omitidos), fixture `nextjs-supabase-fixture/` (6 arquivos — 5 base + supabase/.gitkeep), E2E `init-v7-nextjs-supabase.test.ts` (3 testes, TDD RED confirmado antes da extracao, GREEN 3/3 apos, tracer-bullet 11/11 sem regressao). DI-W2-supabase-rls-edge-omitidos: RLS/signed URLs/edge functions ausentes do source nextjs-supabase-auth/SKILL.md — omitidos per REGRA DE FIDELIDADE. Progresso: 5/7 fases, 8/8 atoms. Fase-06 (INDEX final + parser RF-11) + Fase-07 (verifier batch + audit humano) pendentes.
- 2026-05-25: Plano 03 Wave 1 (fases 01+02+03) concluida em paralelo — 6 atoms criados: `security-stack-specific.md` (154L, T1, R3-B flagged), `react-hooks-and-state.md` (190L, T1), `performance-and-turbopack.md` (117L, T2), `testing-strategy.md` (152L, T2), `ui-and-styling.md` (147L, T2), `error-handling-observability.md` (168L, T2). Todos dentro do hard cap 200. `harness:validate` so erro pre-existente. 3 omissoes por cobertura de source: useTransition nao nos sources (omitido de react-hooks), NextAuth/Clerk nao nos sources (omitido de security — Supabase apenas), dark mode/shadcn/CSS Modules nao nos sources (ui-and-styling mais leve). DI-W1-campo-cross_stack_skills: frontmatter usa `cross_stack_skills` (nao `related_skills` como fase docs indicavam) — consistente com atoms Plano 01 e 02. Progresso: 3/7 fases, 6/8 atoms. Wave 2 (fases 04+05) a iniciar.

## Plano 01 fase-03 — piloto app-router-and-layouts.md extraido (2026-05-24)

- **Atom:** `knowledge/nextjs/atoms/app-router-and-layouts.md`
- **Lines:** 141 (≤200 hard cap confirmed)
- **Sources consumed (5 total apos polish):**
  - `Infos/knowledge/NextJS/nextjs-app-router-patterns/SKILL.md`
  - `Infos/knowledge/NextJS/nextjs-app-router-patterns V2/resources/implementation-playbook.md`
  - `Infos/knowledge/NextJS/compass_artifact_wf-191ad75d-...md`
  - `Infos/knowledge/NextJS/compass_artifact_wf-720a98fd-...md`
  - `Infos/knowledge/NextJS/compass_artifact_wf-dbd12769-...md` (added post-polish)
- **Anti-drift clause applied in extractor prompt:** YES (REGRA DE FIDELIDADE verbatim do compound 2026-05-16)
- **Verifier refined protocol applied:** YES (verbatim do compound 2026-05-16)
- **Verifier report:** `docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano01/verifier-report-fase03.md`
- **Traceability rate:** 95.8% initial -> 100% post-polish (meta ≥80%) — APROVADO
- **Next step:** fase-04 (detector atomic changes — 4 arquivos coordenados)

## Plano 02 — Verifier batch (fase-07)

Data: 2026-05-25
Relatório: docs/exec-plans/active/2026-05-24-nextjs-react-stack-knowledge/plano02/verifier-report-plano02.md

Status por atom:
- react-server-components.md: verified
- server-actions-and-mutations.md: verified
- middleware-and-edge.md: verified
- data-fetching-and-cache.md: verified
- rendering-strategies.md: verified
- pages-router-migration-tips.md: verified
