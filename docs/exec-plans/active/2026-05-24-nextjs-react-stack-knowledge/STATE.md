# State: Next.js + React Stack Knowledge

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 01/3
**Last Updated:** 2026-05-24
**Detailed plans created:** Plano 01 (6 fases), Plano 02 (7 fases), Plano 03 (7 fases). Todos os 3 planos detalhados.

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Infra + Detector + Tracer Bullet | 6 | 4/6 | in-progress |
| 02 | Atoms Feature-driven Next (EN) | 7 | 0/7 | pending |
| 03 | Cross-cutting + React + Integrations + INDEX final | 7 | 0/7 | pending |

## Progress Global

Fases done: 4/20 (20%)

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
