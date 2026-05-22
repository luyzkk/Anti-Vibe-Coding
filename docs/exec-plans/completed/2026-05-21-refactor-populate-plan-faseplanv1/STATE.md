# State: Refatorar populate-plan-generator → hierarquia + FasePlanInput v1

**Plan:** ./PLAN.md
**Phase:** completed
**Current Plan:** 02/2
**Last Updated:** 2026-05-21

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Schema + Renderer + Data | 4 | 4/4 | completed |
| 02 | Orchestrator + Hierarchy + Goldens | 5 | 5/5 | completed |

## Progress Global

Fases done: 9/9 (100%)

## Log

- 2026-05-21: PRD escrito via /write-prd (auto mode, defaults aceitos)
- 2026-05-21: PLAN.md + STATE.md gerados via /plan-feature inline
- 2026-05-21: plano01/ e plano02/ detalhados gerados via /plan-feature inline
- 2026-05-21: /execute-plan iniciado — Plano 01 fase-01 in-progress (dev escolheu executar 4 fases sequencialmente)
- 2026-05-21: Plano 01 fase-01 completed — render-fase-plan.ts + .test.ts + golden criados, 5 testes verdes, typecheck limpo. GT-Plano01-fase01-no-lint-script registrado (sem `bun run lint` no projeto).
- 2026-05-21: Plano 01 fase-02 completed — DocInstruction extendido com 6 campos, 16 entradas migradas, import linha 8 trocado para render-fase-plan, 6 testes novos adicionados ao .test.ts existente (25 total verdes). GT-Plano01-fase02-slug-preserves-underscore registrado (4 slugs com `_`).
- 2026-05-21: Plano 01 fase-03 completed — 16 .md de guidance + _template.md + _index.md + populate-guidance-files.test.ts criados em skills/init/assets/populate-guidance/. 3 testes verdes (existencia, >=500 chars, header `# Guidance: {docPath}`). Stack-specific section presente nos 7 docs com stackVariants, omitida nos outros 9.
- 2026-05-21: Plano 01 fase-04 completed — populate-guidance-drift.test.ts com 2 testes (mustCover → prosa e simetrico). 128 assertions, 0 fails. Validacao RED via mutacao manual de "Auth Flow" -> "Authentication Flow" em SECURITY.md confirmou rigidez (mensagens acionaveis em ambos os testes). _template.md atualizado com nota de convencao.
- 2026-05-21: **Plano 01 completed (4/4 fases)** — Suite final: 35 testes verdes / 547 assertions / 4 arquivos de teste + typecheck limpo. Memoria "Notas para Planos Seguintes" preenchida em plano01/MEMORY.md com API publica, contrato de adapter, slugs corretos, e baseline de testes.
- 2026-05-21: Plano 02 fase-01 completed — commit 8475224 (`feat(init): emit populate-harness hierarchy`). generatePopulatePlans agora emite 1 pasta `{date}-populate-harness/` com PRD+CONTEXT+PLAN+16 fase-NN-*.md. Adapter DocInstruction->FasePlanInput, 3 templates novos, renderAndrePlan antigo removido, snippet obsoleto deletado. 5 testes integrados verdes (72 assertions), Plano 01 baseline 40 verdes mantido, typecheck limpo. 1 teste regressivo em `07-generate-populate-plans.test.ts` falha (espera 16 pastas) — estado intermediario explicito; fase-02 corrige. Step 07 source ja teve fix minimo `result.plans -> result.fasePlans` para typecheck passar.
- 2026-05-21: Plano 02 fase-02 completed — commit a692dcc (`feat(init): update step 07 wording for populate-harness hierarchy`). ABORT_MESSAGE_NO_STACK trocou "16 populate plans" -> "16 populate-harness fases". summary multilinha reescrito: linha 1 "1 folder generated with N fases (stack)", linha 2 "Folder: {folderPath}", linhas 3-4 Legacy/Docs skipped. 13 testes verdes em 07-generate-populate-plans.test.ts (3 escopados + 2 ajustados de pre-existentes + 8 outros). Suite das libs Plano 01 + Plano 02 fase-01: 40 verdes mantidos. Typecheck limpo.
- 2026-05-21: Plano 02 fase-03 completed — commit cd567d6 (`test(e2e): regenerate goldens for populate-harness hierarchy`). Goldens regenerados: stdout.txt (step id stub substituido por real, novo summary 4-linhas), populate-plan-andre-parity.md (fase representativa real via renderFasePlan, 11 H2). tree.json JA estava correto (Plano 05 fase-06 deixou em estado novo). 3 arquivos de teste de aceitacao tambem foram atualizados (init-v7-final-acceptance + populate-plans-node + populate-plans-rails) — esperavam arquitetura antiga de 16 pastas. Suite e2e: 84 pass / 14 skip / 0 fail (98 tests, 21 files). Libs: 53 pass. CA-14 (run-init-audit-integration.test.ts) ja era falha pre-existente (stack=unknown aborta com DR-2), NAO tocada nesta fase.
- 2026-05-21: Plano 02 fase-04 completed — commit 662d3c2 (`docs(plan): register Feature B as TD-01 — /plan-feature unification (ADR-0022)`). Entrada TD-01 anexada a `docs/exec-plans/tech-debt-tracker.md` (arquivo ja existia com formato tabela; subagente NAO foi usado, edicao direta de markdown). Soft deadline 2026-06-20. Links para ADR-0022 e PRD-A resolvem. Feita em formato hibrido: linha na tabela + H2 detalhado abaixo, respeitando convencao existente do arquivo.
- 2026-05-21: Plano 02 fase-05 completed — commit 1f1c1c5 (`feat(init): generate STATE.md in populate-harness folder (CA-01 fix)`). Final validation revelou gap em CA-01 (PRD listava STATE.md, fase-01 do plano omitiu). Fix: novo `populate-harness-state-template.ts` + integracao no gerador + 5 testes unitarios + 1 teste integrado + atualizacao golden tree.json (adicionou PRD/CONTEXT/STATE.md que estavam ausentes desde Plano 05 fase-06). Suite final: typecheck verde, e2e 84/84 ativos verdes (14 skip por DR-2), feature libs 68/68 (10 arquivos), harness:validate verde, compound:check verde. Falhas pre-existentes em `harness-validate-v6-path-whitelist.test.ts` (6) e `harness-validate-advanced.test.ts` (EBUSY flake em paralelo) NAO sao regressao desta feature — confirmadas revertendo skills/init/lib para estado anterior ao Plano 01.
- 2026-05-21: **Plano 02 completed (5/5 fases)** e **Feature A done** — CA-01 a CA-10 do PRD verificados. ADR-0022 implementada (FasePlanInput v1, hierarquia populate-harness, drift test, Final Report Contract hardcoded). Feature B (TD-01) registrada em tech-debt-tracker.md com soft deadline 2026-06-20.
