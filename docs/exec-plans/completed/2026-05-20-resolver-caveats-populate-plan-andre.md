---
title: "Resolver 4 caveats herdados/introduzidos pelo PRD populate-plan-andre-port"
mode: quick
status: active
created: 2026-05-20
project: anti-vibe-coding
---

# Quick Plan: Resolver Caveats Pos-PRD populate-plan-andre-port

## Goal

Limpar a divida tecnica acumulada apos o merge do PRD `populate-plan-andre-port`:
suite com 3 fails baseline, typecheck com 3 erros GT-01, harness:validate exit 1 com
62 broken-links no golden novo, e stash@{0} duplicado nao-droppado. Resultado esperado:
`bun test`, `bun run typecheck`, `bun run harness:validate`, `bun run compound:check`
todos exit 0 — primeira vez em ~7 semanas que a suite esta 100% verde.

## Scope

Arquivos esperados (escopo glob):
- `skills/init/lib/lazy-import.test.ts` (typecheck fix)
- `skills/lib/subagent-contract.ts` (ajv API drift)
- `scripts/harness-validate*.ts` (allowlist `tests/e2e/__golden__/`)
- `tests/e2e/greenfield-populate-plan-tracer.test.ts` (formato novo "fases")
- `tests/e2e/ca12-*.test.ts` (formato novo "fases" + dependencia de harness:validate)
- `tests/fixtures/v6-state-fixture/docs/STATE.md` (M no git status — investigar)
- git stash drop (limpar stash@{0} duplicado)

FORA do escopo:
- Re-arquitetar qualquer step do `/init`
- Mudar contrato do subagent-contract.ts (so atualizar API ajv)
- Editar golden `populate-plan-andre-parity.md` (validator e quem se adapta, nao golden)

## Execution Steps

1. **Investigar os 3 test fails** → verify: tenho diagnostico escrito (causa raiz) para cada um dos 3 testes. CA-12 #2 (`harness:validate exit 0`) provavelmente depende de fix do item 3. CA-12 #1 (`>= 5 tasks`) + tracer (`>= 1 task per file`) provavelmente sao asserts contra format antigo "tasks" do PLAN.md (pre-Plano 02 reescreveu para "fases").

2. **Fix typecheck GT-01 — `lazy-import.test.ts`** → verify: `bun run typecheck` nao reporta mais TS2307 em `lazy-import.test.ts:15`. Solucao: trocar import literal de `'./does-not-exist-xyz'` por `// @ts-expect-error intentional missing module for lazy-import test` antes da linha 15, OU usar string com variavel `const missing = './does-not-exist-xyz' as string`. Manter intencao do teste (testar comportamento de lazy-import quando modulo nao existe).

3. **Fix typecheck GT-01 — `subagent-contract.ts`** → verify: `bun run typecheck` nao reporta mais TS2305 (`AnySchema`) nem TS2339 (`instancePath`). Verificar versao atual do ajv via `bun pm ls | Select-String ajv` e ajustar imports/usage para API atual. `AnySchema` virou `Schema` em ajv 8.x. `instancePath` ainda existe — provavelmente type mismatch de versao. Atualizar import + cast se necessario.

4. **Fix broken-links no harness:validate** → verify: `bun run harness:validate` nao reporta mais broken-link em arquivos sob `tests/e2e/__golden__/`. Solucao preferida: adicionar allowlist no validator (`scripts/harness-validate*.ts`) — diretorio `tests/e2e/__golden__/` contem snapshots, NAO docs reais. Comentario inline justificando. Se o validator nao tiver mecanismo de exclusao por path, adicionar um. Editar golden NAO eh opcao (perderia fidelidade do snapshot).

5. **Fix 2 test fails de formato antigo (CA-12 #1 + tracer CA-01)** → verify: `bun test` reporta 0 fails para esses 2 testes. Releer assert exato + comparar com output atual de `generatePopulatePlanV2()`. Substituir checks de "tasks" por "fases" (renomeacao Plano 02). Se test era essencial e perdeu cobertura na renomeacao, garantir que cobertura equivalente existe no `populate-plan-parity.test.ts`.

6. **Cleanup stash@{0} + investigar STATE.md modificado** → verify: `git stash list` mostra stash@{0} = WIP no commit ANTERIOR a `164bcd0` (i.e. nao o duplicado de fase-06). `git diff tests/fixtures/v6-state-fixture/docs/STATE.md` mostra OK para commitar (sem segredos, sem placeholder errado) OU revertido. `git stash drop stash@{0}` apos confirmar que e duplicata do commit `8355829` (mesmas alteracoes ja committed).

7. **Validacao final + commit** → verify: `bun test` exit 0 (zero fails), `bun run typecheck` exit 0, `bun run harness:validate` exit 0, `bun run compound:check` exit 0. Commits separados por categoria: `fix(typecheck): GT-01 lazy-import + subagent-contract ajv API drift`, `fix(harness:validate): allowlist __golden__ snapshots`, `fix(tests): formato fases (renomeacao Plano 02 populate-plan-andre-port)`.

## Validation Log

(preencher durante execucao)

- Step 1: 
- Step 2: 
- Step 3: 
- Step 4: 
- Step 5: 
- Step 6: 
- Step 7: 

## Compound Opportunity

Itens candidatos a compound note se a investigacao revelar pattern:

- **Step 2 (lazy-import test):** se o fix exigir mudanca de estilo de teste (import literal vs dinamico), capturar "tests que validam comportamento sob modulo ausente devem usar `@ts-expect-error` + comentario explicito, nao import literal — TS2307 nao eh erro do projeto, eh sinal de propositalidade".
- **Step 5 (renomeacao "tasks" → "fases" sem cobertura migrada):** se confirmar que Plano 02 trocou o vocabulario mas deixou 2 testes batendo no antigo sem migrar, isso eh proxy para "rename mecanico no codigo de producao sem grep paralelo em tests" — compound parecido ao compound `validation-gate-path-drift` (capturado em 2026-05-20).

Se nenhum dos dois revelar nada novo: registrar como "tarefa de saneamento de debt, sem lessao durable" e nao criar compound.

## Lessons Captured

(preencher ao /iterate apos merge)

## Exit Criteria

- [ ] `bun test` exit 0 (zero fails)
- [ ] `bun run typecheck` exit 0
- [ ] `bun run harness:validate` exit 0
- [ ] `bun run compound:check` exit 0
- [ ] `git stash list` nao contem mais stash@{0} duplicado
- [ ] Working tree limpo OU contem apenas mudancas planejadas para o proximo PRD
- [ ] Pelo menos 3 commits atomicos por categoria (typecheck, harness:validate, tests)
- [ ] Compound Opportunity decidido (sim/nao com razao)
