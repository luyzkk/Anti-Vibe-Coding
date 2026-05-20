# State: Portar a estrutura de populate-plan do Andre para `/init`

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 03/5 (Plano 03 em andamento — fase-02/3 done)
**Last Updated:** 2026-05-20

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | MH-1 Lista completa de docs (Tracer Bullet) | 3 | 3/3 | completed |
| 02 | MH-2 PLAN.md / fase.md templates estilo Andre | 4 | 4/4 | completed |
| 03 | MH-3 Instrucoes imperativas | 3 | 2/3 | in-progress |
| 04 | MH-4 Discovery `(stack-id + doc-canonico) -> paths` | 3 | 0/3 | pending |
| 05 | Gate completo + SH + compound + goldens | 6 | 0/6 | pending |

## Progress Global

Fases done: 9/19 (47%)

## Log

- 2026-05-19: Plano criado via /plan-feature (5 planos, 19 fases, ~24h estimado).
- 2026-05-19: Plano 02 detalhado via /plan-feature (4 fases: PLAN.md.tpl, fase.md.tpl, refatorar-renderer, parity-assert-secoes). Subagente isolado.
- 2026-05-19: Plano 03 detalhado via /plan-feature (3 fases: schema-imperative-instruction, reescrever-llm-instructions, default-imperative-assert-ca06). Subagente isolado.
- 2026-05-19: Plano 04 detalhado via /plan-feature (3 fases: expandir-nextjs-supabase, expandir-rails-node-ts, parity-asserts-ca02-ca05). Subagente isolado.
- 2026-05-20: Plano 05 detalhado via /plan-feature (6 fases: golden-snapshot, sh2-laravel-python, sh3-lessons-prepopulado, sh4-audit-log-detalhado, pipeline-compound-note, regenerar-goldens). Estrutura completa — todos os 5 planos do PRD agora tem fases detalhadas em planoNN/.
- 2026-05-20: Plano 01 executado via /execute-plan (3 fases completas). EXCLUDED reduzido, CanonicalDoc estendido, TEMPLATE_MANIFEST + 3 entries. Parity test minimo criado (2/2 pass). Unit test flipado. 1 golden defasado em init-cutover-greenfield (input para Plano 05 fase-06 — esperado). Aborts pre-existentes do V6.6.0 knowledge gate confirmados via baseline antes de fase-01.
- 2026-05-20: Plano 02 executado via /execute-plan (4 fases completas). PLAN.md.tpl (11 H2 + 3 opcionais), fase.md.tpl (6 marcadores), renderer async lendo tpls, 2 parity asserts CA-03 adicionados (total 4 asserts ativos). 10/10 testes verdes (6 generator + 4 parity). DESCOBERTO: trabalho do Plano 01 estava em stash@{0}, nao committed — recuperado seletivamente e 3 commits retroativos criados (`e1f1a32`, `c8bde21`, `2f028dd`) antes de prosseguir Plano 02. Stash@{0} intacto. Commits Plano 02: `d5c78f9`, `98b103d`, `fc55b4a`, `778decb`.
- 2026-05-20: Plano 03 fase-01 executado via /execute-plan (subagente plan-executor). ImperativeInstruction interface + formatImperativeInstruction + isImperativeInstruction exportados de populate-plan-generator.ts. Novo imperative-instruction.test.ts com 12 testes (1 render + 1 happy guard + 10 test.each invalidos). RED confirmado por import error. GREEN: 22/22 verde (12 novos + 6 generator + 4 parity). Typecheck: 3 erros GT-01 pre-existentes (sem novos). Commit: `84c14d5`. LLM_INSTRUCTIONS / DEFAULT_INSTRUCTION / llmInstructionFor / renderLLMInstructionBlock intactos (sao fase-02 e fase-03).
- 2026-05-20: Plano 03 fase-02 executado via /execute-plan (subagente plan-executor). LLM_INSTRUCTIONS tipo mudou para Record<string, ImperativeInstruction> + exportado; 12 entries reescritas em 4 lotes de 3 com typecheck entre lotes (DI-Plano03-fase02-batch-size). Brecha "mantenha o template" matada em QUALITY_SCORE.md. llmInstructionFor retorna ImperativeInstruction. renderLLMInstructionBlock chama formatImperativeInstruction (heading preservado). DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03 provisorio adicionado (fase-03 deleta). PopulatePlanPhase.instrucaoLLM cascade-updated para ImperativeInstruction. test.each(Object.entries(LLM_INSTRUCTIONS)) adicionado em populate-plan-generator.test.ts. 34/34 verde (12 + 18 + 4). Typecheck: apenas 3 erros GT-01 pre-existentes. Commit: `69234d3`.
