# State: Next.js + React Stack Knowledge

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 01/3
**Last Updated:** 2026-05-24
**Detailed plans created:** Plano 01 (6 fases), Plano 02 (7 fases), Plano 03 (7 fases). Todos os 3 planos detalhados.

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Infra + Detector + Tracer Bullet | 6 | 1/6 | in-progress |
| 02 | Atoms Feature-driven Next (EN) | 7 | 0/7 | pending |
| 03 | Cross-cutting + React + Integrations + INDEX final | 7 | 0/7 | pending |

## Progress Global

Fases done: 1/20 (5%)

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
