# Memoria: Plano 04 — Step 7 (generate-populate-plans CORE)

**Feature:** init-refactor-v7
**Iniciado:** 2026-05-21
**Concluido:** 2026-05-21
**Status:** completed

---

## Decisoes de Implementacao

### Fase 05 (concluida)

- **DI-Plano04-fase05-runInit-returns-not-throws:** `runInit` NAO propaga `AbortError` — captura
  internamente e retorna `{ kind: 'aborted', code, reason }`. Spec original do fase-05 usava
  `try { await runInit(...) } catch(e) { expect(e).toBeInstanceOf(AbortError) }` que nunca
  acionaria a expectation (catch nao recebe nada). Testes ajustados para verificar
  `result.kind === 'aborted'` + `result.code === 20` + `result.reason.includes(...)`.

- **DI-Plano04-fase05-tdd-gate-workaround:** TDD gate do projeto bloqueou criar
  `tests/e2e/__fixtures__/v7-populate-helpers.ts` (helper sem teste). Workaround:
  criar `v7-populate-helpers.test.ts` (RED) primeiro com 2 testes (copia .gitkeep, copia tree)
  e em seguida criar o helper (GREEN). 2 testes de helper passaram como bonus.

- **DI-Plano04-fase05-fixture-strategy:** 3 fixtures greenfield minimas:
  - `v7-populate-node/`: `package.json` com `typescript` em devDeps (dispara primary=`node-ts`)
  - `v7-populate-rails/`: `Gemfile` com `gem 'rails', '~> 7.1'` (dispara primary=`rails`)
  - `v7-populate-no-stack/`: apenas `.gitkeep` (nenhum probe encontrado → primary=null)
  Fixtures sao greenfield: scaffold+link+install-gh rodam fresh, sem manifest legacy.

### Fase 04 (concluida)

- **DI-Plano04-fase04-abort-message:** CONFIRMADA. Wording exato de 3 linhas:
  ```
  Stack not detected — run /anti-vibe-coding:detect-architecture before /init.
  Detected primary: null.
  Waves in 16 populate plans cannot be path-resolved without stack.
  ```
  Validado por teste de assertion exata (`expect(err.reason).toBe(ABORT_MESSAGE_NO_STACK)`).

- **DI-Plano04-fase04-summary-format:** CONFIRMADA. 4 linhas:
  1. `init-07: N plans generated (STACK stack)`
  2. `Legacy artifacts found: N`
  3. `Docs skipped: N (...)`
  4. `Output: docs/exec-plans/active/*-populate-*/`

- **DI-Plano04-fase04-registry-stub-loop-i=7:** registry.test.ts loop de stubs atualizado de
  `i = 6..9` para `i = 7..9`. Plano 05 vai substituir Steps 8-10 — loop ficara apenas com
  validacao de IDs ja-reais.

### Fase 03 (concluida)

- **DI-Plano04-fase03-found-literal-true:** `LegacyEntrySchema` (Plano 02) usa
  `found: z.literal(true)` — entradas com `found: false` invalidam o schema inteiro (Zod falha).
  Spec original tinha fixture com 3 entradas (2 `found: true` + 1 `found: false`). Corrigido para
  2 entradas `found: true` produzindo `legacyArtifactsFound: 2` corretamente. O filtro
  `e.found === true` no codigo eh redundante mas inofensivo dado o schema literal.

- **DI-Plano04-fase03-path-posix:** Campo `path` do `GeneratedPlan` usa `path.posix.join`
  (forward slashes portavel). O `absPath` usado em `fs.writeFile` usa `path.join` real
  (OS separator). Separa "valor exportado" de "operacao filesystem".

### Fase 02 (concluida)

- **DI-Plano04-fase02-stackid-node-ts:** Spec usava `'nodejs-typescript'` como StackId, mas o tipo
  real em `detect-stack.ts` exporta `'node-ts'`. Corrigido tanto no codigo de `CODE_PATHS_BY_DOC`
  quanto nos testes (sem alterar `detect-stack.ts`). `'nextjs'` tambem mapeado explicitamente em
  `CODE_PATHS_BY_DOC` (compartilha matrix folder com `'node-ts'` conforme `stack-id-map.ts`).

- **DI-Plano04-fase02-test-non-null-assertions:** Typecheck inicial falhou com TS18048/TS2532 por
  array indexing sem null-check (ex: `waves[0].items`). Resolvido via non-null assertion `!`
  no test file — todas as posicoes sao seguras pela logica testada. Codigo de runtime nao usa `!`.

### Fase 01 (concluida)

- **DI-Plano04-fase01-template-renderer-pure:** CONFIRMADA. Renderer NAO le tpls de
  `skills/init/assets/templates/exec-plan/` — emite as 10 secoes via template literal TS.
  Os 2 tpls (PLAN.md.tpl + fase.md.tpl) foram DELETADOS junto com o cleanup.
  10 secoes hardcoded em TS sao mais faceis de testar (snapshot direto) que tpls com `{{VAR}}`.

- **DI-Plano04-fase01-input-shape:** CONFIRMADA. Tipo `AndrePlanInput` exportado com campos:
  `{ docPath, goal, scope: { in, out }, assumptions, risks: Array<{risk, mitigation}>,
  waves: Array<{name, items}>, reviewChecklist, compoundOpportunity, exitCriteria }`.
  Cobre todas as 10 secoes CA-07. Sem campos free-form.

---

## Bugs Descobertos

Nenhum.

---

## Gotchas

- **GT-Plano04-fase01-step91-not-deleted:** Step 91 (`91-generate-populate-plan.ts`) estava
  presente no codebase apesar do MEMORY do Plano 01 dizer que havia sido deletado em fase-05.
  O cleanup desta fase teve scope expandido para incluir Step 91 + seus dependentes
  (DEV-01 abaixo). Verify pre-conditions no codigo real antes de iniciar qualquer fase.

- **GT-Plano04-fase01-e2e-v2-orphans:** `tests/e2e/greenfield-populate-plan.test.ts` e
  `tests/e2e/populate-plan-parity.test.ts` importavam V2 exports via top-level import.
  Convertidos para `describe.skip` stub com note apontando Plano 04 fase-05.

---

## Desvios do Plano

- **DEV-01 (Plano04 fase-01):** Step 91 (`91-generate-populate-plan.ts`) NAO havia sido
  deletado em Plano 01 fase-05 como afirmava o MEMORY. O cleanup desta fase teve escopo
  expandido: git rm Step 91 + 91-generate-populate-plan.test.ts; describe.skip nos testes
  dependentes; registry.smoke.test.ts atualizado para v7 ids; run-init.test.ts com CA-07
  test.skip; imperative-instruction.test.ts convertido para stub.
  **Impacto:** cleanup commit inclui 10 arquivos deletados (spec: 8) + 5 arquivos modificados
  (spec: 0). Todos necessarios para typecheck exit 0.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 1 (DEV-01) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits | 6 (ef6814b, ad12f84, ca4f5f9, 51b0a32, 1c1d155, 0a23a9c) |
| Testes adicionados | ~60 (8+19+10+12+10) |

---

## Notas para Planos Seguintes

### Fase 02 (instructions-table-16-docs)

- **`AndrePlanInput` esta exportado** de `skills/init/lib/populate-plan-generator.ts`.
  Tipos `Wave`, `RiskEntry`, `AndrePlanInput` disponiveis para import em fase-02.

- **`renderAndrePlan(input: AndrePlanInput): string`** e `extractH2Sections(markdown): string[]`
  sao as unicas exportacoes de funcao. Puras, sem efeito colateral.

- **Testes V2 skipados** (DEV-01):
  - `tests/e2e/greenfield-populate-plan.test.ts`: `describe.skip` inteiro
  - `tests/e2e/populate-plan-parity.test.ts`: `describe.skip` inteiro
  - `skills/init/lib/imperative-instruction.test.ts`: `describe.skip` nos dois describes
  - `skills/init/lib/run-init.test.ts`: test `CA-07 convergencia` em `test.skip`

- **Step 91 deletado** — consumers historicos do V2 generator removidos do codebase.
  Nenhum step no registry v7 importa mais `generatePopulatePlanV2`.

- **Loop stubs em registry.test.ts**: Em Plano 01 fase-05, o loop era `i = 6..9` (Steps 7-10).
  Apos Plano 04 fase-04 wire-up do Step 7 real, atualizar para `i = 7..9`.

- **Commits desta fase (fase-01):**
  - `ef6814b`: chore cleanup V2 (10 arquivos deletados, 5 modificados)
  - `ad12f84`: feat renderer puro V3 (populate-plan-generator.ts + test)

### Fase 03 (generator-pipeline) — inputs

- **`POPULATE_INSTRUCTIONS_BY_DOC: ReadonlyMap<string, DocInstruction>`** com 16 entries
  exportada de `skills/init/lib/populate-instructions-table.ts`.
- **`buildWavesForDoc(doc: string, stack: StackId | null): ReadonlyArray<Wave>`** exportada do
  mesmo arquivo. Stack-aware com fallback `default`. StackIds reconhecidos: `'node-ts'`, `'rails'`,
  `'nextjs'` (mapeado para mesmo paths de `node-ts`).
- **`docToSlug(dst: string): string`** algoritmo canonico. Strip leading dot + replace `/` por `-` +
  `.md` → `-md` + lowercase.
- **Commit fase-02:** `ca4f5f9`

### Fase 04 (step-07-and-DR-2) — inputs

- **`generatePopulatePlans(opts: GenerateOpts): Promise<GenerateResult>`** exportada de
  `skills/init/lib/populate-plan-generator.ts`. Assina `opts.cwd`, `opts.stack: DetectedStack`,
  `opts.clock?: () => Date`. Step 7 chama esta funcao apos validar DR-2.
- **`GenerateResult`** tem campos `plans`, `stackPrimary`, `legacyArtifactsFound`, `docsSkipped`
  — usar para montar summary multilinha.
- **Manifest leitura graceful:** ENOENT, JSON malformado e schema Zod invalido todos retornam
  null silenciosamente (warning no caso de falha de parse). NAO aborta.
- **Commit fase-03:** `51b0a32`

### Fase 05 (e2e-fixtures) — inputs

- **Step 7 real wired no registry** posicao 7 (index 6). ID `'generate-populate-plans'`.
- **AbortError code=20** com `ABORT_MESSAGE_NO_STACK` literal — testar wording exato em e2e.
- **StackId real `'node-ts'`** — fixtures e assertions devem usar esse nome.
- **Summary format 4 linhas** — fase-05 pode testar via split('\n').
- **Commit fase-04:** `1c1d155`

### Para Plano 05 — inputs

- **Step 7 real e estavel** — ID `'generate-populate-plans'`, posicao 7 no registry.
  Plano 05 implementa Steps 8-10 (delivery-loop, copy-knowledge, final-validation).
- **`runInit` retorna em vez de lancar:** `{ kind: 'completed' | 'aborted', code?, reason? }`.
  E2E acceptance final do Plano 05 deve usar return value, nao try/catch.
- **`POPULATE_INSTRUCTIONS_BY_DOC.size === 16`** disponivel para gate de regressao
  (`scripts/harness-validate.ts` Plano 05 fase-04 pode validar contagem).
- **Fixtures v7-populate-* podem servir base para fixtures Plano 05** — ajustar conforme
  necessidade dos Steps 8-10 (delivery loop precisa pelo menos 1 PLAN.md em
  `docs/exec-plans/active/`).
- **Helper `copyFixtureToTmp`** em `tests/e2e/__fixtures__/v7-populate-helpers.ts`
  reutilizavel se Plano 05 precisar de fixture cloning.
- **Commit fase-05:** `0a23a9c`

---

<!-- Atualizado em 2026-05-21 (Plano 04 fase-05 concluida — Plano 04 completed) -->
