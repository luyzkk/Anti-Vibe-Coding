# Memoria: Plano 02 — Orchestrator, Hierarchy, Goldens (wiring)

**Feature:** Refatorar populate-plan-generator → hierarquia + FasePlanInput v1
**Iniciado:** 2026-05-21
**Status:** em andamento

---

## Decisoes de Implementacao

### fase-01

- **DI-Plano02-fase01-stack-shape**: `DetectedStack` real requer `{ primary, secondary, signalSource, anchorFiles }` (NAO `{ primary, confidence, signals }` como o spec do arquivo de fase usava). Subagente corrigiu os 5 testes para usar shape real. Spec inline da fase-01 estava desatualizado em relacao ao `skills/init/lib/detect-stack.ts`.
- **DI-Plano02-fase01-step07-minimal-fix**: `skills/init/lib/steps/07-generate-populate-plans.ts` tocado minimamente para corrigir TS error (`result.plans` -> `result.fasePlans`, `result.stackPrimary ?? 'unknown'` -> `result.stackPrimary`) — necessario para `bun run typecheck` passar apos GenerateResult virar GenerateResultV2. Wording completo do summary + abort message permanece para fase-02.
- **DI-Plano02-fase01-tdd-gate**: TDD hook obriga arquivo de teste para CADA arquivo source novo. Subagente criou 3 .test.ts unitarios (1 por template) com 9 testes adicionais (total 14 testes novos da fase-01: 5 integracao + 9 unitarios).
- **DI-Plano02-fase01-test-assertion-markdown**: Assertions nos testes dos templates esperam `**Stack detected:**` (negrito markdown) em vez de `Stack detected:` literal. Testes ajustados; implementacoes mantidas conforme spec.

### fase-02

- **DI-Plano02-fase02-test-scope-extra**: Alem dos 3 testes especificados no fase doc, 2 testes pre-existentes em `07-generate-populate-plans.test.ts` (`summary contains "16 plans generated"` e `summary has 4 lines (NFR Observabilidade)`) tambem foram atualizados — o primeiro testava wording antigo, o segundo testava ordem antiga de linhas. Sem ajuste falhariam. Escopo expandido eh genuino.
- **DI-Plano02-fase02-summary-line-order**: Spec define nova ordem: `init-07 / Folder / Legacy / Docs skipped`. Antes era `init-07 / Legacy / Docs / Output:`. Linha "Folder" agora eh `lines[1]`, "Legacy" virou `lines[2]`. Downstream que parseie por indice (telemetria?) precisa saber.

### fase-03

- **DI-Plano02-fase03-tree-already-correct**: `init-greenfield.tree.json` ja estava com hierarquia nova (commit anterior — Plano 05 fase-06 ja havia regenerado). Subagente NAO tocou. Spec ficou desatualizada em relacao ao estado real do repo.
- **DI-Plano02-fase03-stub-step-id**: Golden `init-greenfield.stdout.txt` referenciava step id `[91-generate-populate-plan]` (stub antigo, antes do refactor). Substituido por `[generate-populate-plans]` (id real). Mensagem final "Harness scaffold criado" removida — nao eh emitida pelo step 07 real.
- **DI-Plano02-fase03-andre-parity-real-output**: Golden `populate-plan-andre-parity.md` regenerado a partir do output REAL do `renderFasePlan` para uma fase representativa (docs/DESIGN.md), com 11 H2 (10 Andre + Final Report Contract). Spec original sugeria fase-01-agents-md.md — escolha eh equivalente.
- **DI-Plano02-fase03-acceptance-tests-out-of-scope**: 3 arquivos de teste NAO listados nos "Arquivos Afetados" da fase-03 tambem foram modificados — `init-v7-final-acceptance.test.ts`, `init-v7-populate-plans-node.test.ts`, `init-v7-populate-plans-rails.test.ts`. Sem essas correcoes, 9 testes falhariam (esperavam 16 pastas separadas). Escopo legitimo: nao se pode declarar fase-03 verde com testes adjacentes vermelhos. Aceito.

### fase-04

- **DI-Plano02-fase04-format-hybrid**: `tech-debt-tracker.md` ja existia com formato tabela (`| Item | Impact | Owner | ... |`). Spec do fase-04 esperava formato narrative puro (`## TD-01: ...`). Escolha: formato hibrido — uma linha na tabela existente (com link interno) + secao H2 detalhada abaixo. Respeita convencao existente do arquivo (feedback `copy-then-improve`) sem perder os campos planejados (Triggers, Soft deadline, Reversibilidade).
- **DI-Plano02-fase04-no-subagent**: fase-04 eh edicao trivial de markdown sem TDD. Orquestrador (Claude) fez direto, sem spawn de plan-executor. Spec da skill nao requer subagente para fases simples — Step 4c diz "Se a fase NAO tem TDD explicito (ex: migration pura, config): executar diretamente". Aceito.

### fase-05

- **DI-Plano02-fase05-ca01-gap-fix**: Final validation revelou drift entre PRD CA-01 (lista STATE.md) e spec do fase-01 do plano (omitiu STATE.md). Dev escolheu fix imediato (em vez de aceitar gap ou virar TD-02). Implementado com TDD: test escrito primeiro (RED por module not found), source escrito depois (GREEN), 5 testes unitarios + 1 integrado. Golden tree.json atualizado para incluir PRD/CONTEXT/STATE.md (estavam ausentes desde Plano 05 fase-06 — divergencia pre-existente paralela).
- **DI-Plano02-fase05-no-subagent**: fase-05 (final validation) executada diretamente pelo orquestrador. Step 4c da skill execute-plan permite isso para fases sem TDD explicito. O fix de CA-01 dentro de fase-05 usou TDD manual (RED + GREEN) com Write hook bloqueando source antes de test — convencao do projeto respeitada.
- **DI-Plano02-fase05-preexisting-failures-isolated**: 6 fails em `tests/harness-validate-v6-path-whitelist.test.ts` + 1 EBUSY flake em `harness-validate-advanced.test.ts` confirmados pre-existentes via `git stash + git checkout 4717980 -- skills/init/lib/ + bun test`. NAO sao regressao desta feature. Documentados aqui mas FORA do escopo do PRD-A.

---

## Bugs Descobertos

<!-- preencher durante execucao -->

---

## Gotchas

### fase-01

- **GT-Plano02-fase01-step07-regression-expected**: 1 teste em `skills/init/lib/steps/07-generate-populate-plans.test.ts` (`writes 16 PLAN.md files`) AGORA falha porque output mudou para 1 pasta + 16 fase-NN-*.md. Estado intermediario esperado — fase-02 reescreve esses testes para a nova realidade. NAO eh regressao real.
- **GT-Plano02-fase01-step07-wording-pending**: Step 07 ja tem o fix de tipo (DI-step07-minimal-fix), mas o `summary` (linha que printa "wrote 16 populate plans") e `ABORT_MESSAGE_NO_STACK` AINDA usam wording antigo. fase-02 atualiza. **RESOLVIDO em fase-02 (commit a692dcc).**

### fase-02

- **GT-Plano02-fase02-summary-line-order-change**: A ordem das linhas do summary mudou (`Folder` agora antes de `Legacy`). Qualquer parser que dependa do INDICE da linha (em vez do prefixo da linha) vai pegar valor errado. fase-03 regen golden — vai capturar a nova ordem implicitamente.

### fase-03

- **GT-Plano02-fase03-ca14-preexisting-failure**: `tests/e2e/run-init-audit-integration.test.ts` ja tinha 1 teste falhando antes desta fase (CA-14, stack=unknown aborta com DR-2 antes de gerar agents-log.json). NAO eh regressao desta feature. fase-05 final-validation pode ou nao escalar isso — registrar separadamente.
- **GT-Plano02-fase03-test-skips-dr2**: 4 testes em `init-cutover-greenfield.test.ts` estao em `test.skip` por DR-2 (init aborta sem stack — node-ts em sandbox sem package.json typescript). Comportamento correto da feature. Apenas 1 teste (tier-3) roda sem stack.

### fase-05

- **GT-Plano02-fase05-golden-ausente-pre-existente**: Golden `init-greenfield.tree.json` estava SEM as entradas `PRD.md`, `CONTEXT.md`, `STATE.md` da pasta populate-harness desde Plano 05 fase-06 (regen anterior). So tinha `PLAN.md`. Como os 2 testes que comparam tree.json estao em test.skip por DR-2, a divergencia nunca quebrou suite. Fix aproveitado em CA-01 (commit 1f1c1c5). Atencao: se algum dia os testes sairem do skip, esta divergencia volta a importar.
- **GT-Plano02-fase05-tdd-gate-write-order**: Hook TDD do projeto bloqueia escrita do SOURCE se nao existe TEST file. Workflow correto: 1) escrever `.test.ts`, 2) rodar `bun test` para confirmar RED por module not found, 3) escrever source. Tentar escrever source primeiro causa erro do hook. Em fase futura, lembrar a ordem.

---

## Desvios do Plano

### fase-01

- **DEV-Plano02-fase01-step07-touched**: Fase-01 spec listava 2 arquivos modificados (`populate-plan-generator.ts` + `.test.ts`). Subagente tocou tambem `steps/07-generate-populate-plans.ts` (2 linhas) porque sem o fix de tipo `bun run typecheck` quebrava. Justificado: spec criou interface change (GenerateResult -> GenerateResultV2), Step 07 era caller imediato. Aceito.
- **DEV-Plano02-fase01-tdd-gate-extra-tests**: TDD hook do projeto obriga teste por source — spec previa 5 testes mas subagente criou 5 + 9 = 14 (3 .test.ts unitarios para os 3 templates novos). Aceito — testes sao genuinos (verificam estrutura do markdown gerado).

### fase-02

- **DEV-Plano02-fase02-2-extra-tests-touched**: Spec previa 3 testes novos. Subagente tambem ajustou 2 testes pre-existentes que dependiam do wording antigo (ver DI-Plano02-fase02-test-scope-extra). 13 testes totais verdes ao final.

### fase-03

- **DEV-Plano02-fase03-3-acceptance-files-touched**: Spec listava 4 arquivos afetados (3 goldens + 1 test possivel). Subagente tocou ALEM disso 3 arquivos de teste de aceitacao (init-v7-final-acceptance + populate-plans-node + populate-plans-rails) — sem isso 9 testes falhariam (esperavam arquitetura antiga). Aceito.
- **DEV-Plano02-fase03-tree-not-touched**: Spec listava `init-greenfield.tree.json` como Modify, mas ja estava correto (DI-Plano02-fase03-tree-already-correct). Nao tocado. Listado como skip no contract output.
- **DEV-Plano02-fase03-no-atomic-commit**: Spec Passo 7 previa commit atomico junto com refactor de fase-01/02. Nao foi possivel — fase-01/02 ja commitadas separadamente. Commit so dos goldens + 3 testes de aceitacao. Comunicado explicitamente ao subagente no prompt.

### fase-04

- **DEV-Plano02-fase04-table-format**: Spec esperava entrada estilo `## TD-NN:` puro. Arquivo existente tinha tabela. Subagente nao foi spawned (edicao trivial); orquestrador escolheu formato hibrido para honrar `copy-then-improve`.

### fase-05

- **DEV-Plano02-fase05-extra-source-files**: Spec listava apenas atualizacoes de STATE/PLAN/MEMORY como arquivos afetados. Final validation revelou CA-01 gap → orquestrador adicionou `populate-harness-state-template.ts/.test.ts` e modificou `populate-plan-generator.ts/.test.ts` + `tests/e2e/__golden__/init-greenfield.tree.json`. Trabalho legitimo (PRD nao podia ser declarado done sem fechar CA-01).
- **DEV-Plano02-fase05-no-bun-lint**: Spec da fase-05 listava `bun run lint` como check. Script NAO existe (GT-Plano01-fase01-no-lint-script). Substituido por `bun run typecheck` apenas — documentado e aceito.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 5 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits gerados | 5 (8475224, a692dcc, cd567d6, 662d3c2, 1f1c1c5) |
| CA-01..CA-10 atendidos | 10/10 (CA-01 fechado em fase-05) |

---

## Notas para Planos Seguintes

Feature B (PRD separado) PRECISA saber:

- `FasePlanInput` definido em `skills/init/lib/render-fase-plan.ts` — mover para `skills/lib/render-fase-plan.ts` durante Feature B (cross-skill)
- `renderFasePlan(input): string` aceita o schema completo — pode ser reusado por `/plan-feature` e `/quick-plan`
- Final Report Contract eh hardcoded — Feature B mantém a convencao
- Goldens de e2e foram regenerados em Plano 02 fase-03 — formato esperado documentado
- `tech-debt-tracker.md` lista trigger e soft deadline 30d — verificar antes de comecar Feature B

---

<!-- Atualizado automaticamente durante execucao -->
