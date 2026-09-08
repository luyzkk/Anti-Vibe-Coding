# State: Contrato Único do Ciclo TDD por Fase

**Plan:** ./PLAN.md
**Phase:** planned
**Current Plan:** 01/2
**Last Updated:** 2026-09-08

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Fonte e contrato | 3 | 0/3 | pending |
| 02 | O ciclo roda no execute-plan | 4 | 0/4 | pending |

## Progress Global

Fases done: 0/7 (0%)

## Log

- 2026-09-08: Plano criado via /plan-feature (2 planos, 7 fases, ~8.5h) na branch feat/tdd-cycle-contract. Decisões do PRD D1–D6 mapeadas para fases. Tracer bullet = Plano 01 fase-01 (teste de paridade RED → seção-fonte mínima + checkbox REFACTOR). Sequencial entre e dentro dos planos: todas as fases editam o mesmo teste de paridade.
- 2026-09-08: Plano 01 detalhado via /plan-feature (3 fases, 1h cada; README com 6 decisões de planejamento DP-1..DP-6 e gotchas G1–G13). Achados do planejador ao ler os arquivos reais: `skills/lib/__tests__/universal-principles.test.ts` já lê o fase-template (Premissa 3 do PRD corrigida); `docs/references/tdd-cycle-checklist.md` não é rastreado pelo manifest (`docs/` ignorado); as regras do Step 9 do plan-feature vivem dentro de um fence, então a paridade da fase-03 assere com `section()` cru; a fonte cita `--tdd-level` e o 4c desde a fase-01, que só chegam no Plano 02 (DP-4).
- 2026-09-08: Plano 02 detalhado via /plan-feature (4 fases: 1.5h + 1.5h + 1h + 1.5h = 5.5h, igual ao PLAN.md; fase-04 subiu de 1h para 1.5h por ter três rodadas de dogfood: Assistido, negativo `blocked`, `--tdd-level direto`). Primeira tentativa do subagente morreu por limite de sessão sem escrever nada; segunda concluiu. README com DP-1..DP-16 e G14–G23 (G1–G13 herdados). Achados: `plan-verifier.md` §Composition diz que o execute-plan o invoca no Step 5, mas ninguém o spawna — fase-03 corrige para 4c VERIFY (DP-11); `subagent-contract.ts:126` confirma `checks[].name: string` livre, então `red-check-evidence` não toca o parser (CA-10); o script de sync lê o checkout, então o dogfood roda da branch antes do merge; a regex real do guard destrutivo casa `git checkout --`/`git checkout .`/`git restore .`, não `-b` — o bloqueio de 2026-09-08 foi o heredoc do PRD citando `git checkout --` (PLAN.md §Risks corrigido).
