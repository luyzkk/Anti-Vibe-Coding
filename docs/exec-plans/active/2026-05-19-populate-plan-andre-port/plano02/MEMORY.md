# Memoria: Plano 02 — MH-2 PLAN.md / fase.md templates estilo Andre

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Concluido:** 2026-05-20
**Status:** completed

**Bloqueadores ja resolvidos:** Plano 01 (lista canonica completa, EXCLUDED_FROM_POPULATION_V2
reduzido + exportado, CanonicalDoc estendido, TEMPLATE_MANIFEST com 3 entries novas,
parity test esqueleto com 2 asserts MH-1 ativos).

---

## Decisoes de Implementacao

- **DI-Plano02-fase01-precondicao-quebrada:** Ao executar fase-01, o subagente detectou que
  o parity test falhava com `SyntaxError: Export named 'EXCLUDED_FROM_POPULATION_V2' not found`.
  Investigacao revelou que o trabalho de Plano 01 (reportado completo no MEMORY) NUNCA foi
  committed — estava em `stash@{0}` junto com 3 hooks WIP nao relacionados.
  - Por que: bug no fluxo anterior — Plano 01 marcou MEMORY como done mas as alteracoes de
    codigo foram stashed (provavelmente acidentalmente antes de outro contexto). Resultado: o
    repo ficou em estado pre-Plano-01 enquanto MEMORY afirmava completude.
  - Impacto: orchestrador (este turno) restaurou seletivamente do `stash@{0}` apenas os 5
    arquivos relevantes ao Plano 01 (NAO tocou nos 3 hooks WIP nem no fixture STATE.md auto-gen)
    e criou 3 commits retroativos: `e1f1a32` (fase-01), `c8bde21` (fase-02), `2f028dd` (fase-03).
    Stash@{0} permanece intacto com os hooks WIP. Plano 02 prosseguiu normalmente apos isso.

- **DI-Plano02-fase02-dir-ja-existia:** Diretorio `skills/init/assets/templates/exec-plan/` ja
  existia ao iniciar fase-02 (criado em fase-01). `mkdir -p` foi idempotente — sem erro.
  - Por que: ordem de execucao foi sequencial (nao paralela como o README do plano sugeria) —
    o orchestrador escolheu sequencial para evitar race em git index.
  - Impacto: nenhum. Verificacao do Passo 1 (fase-02) passou diretamente.

- **DI-Plano02-fase03-test-expectations-mudadas:** Apenas 1 expectation foi atualizada em
  `populate-plan-generator.test.ts`. Teste original (linha 34-42): `PLAN.md index contains
  glossario + phase table` — verificava `## Glossario de Instrucoes LLM` e `| Fase | Doc
  canonico | Arquivo | Status |`. Novo (post-fase-03): renomeado para `PLAN.md index contains
  phase table and project name (post-MH-2)`. Expectations: continua verificando a tabela de
  fases (preservada via `{{PHASES_TABLE}}`) e agora verifica `Populate Harness — test-project`
  (do frontmatter `title` interpolado).
  - Por que: tpl novo (canon Andre) nao tem "Glossario de Instrucoes LLM". As 11 secoes
    obrigatorias sao validadas em parity test (fase-04), nao aqui.
  - Impacto: 6 pass (sem mudanca de contagem). Outros 5 testes continuaram intactos.

- **DI-Plano02-fase04-reuse-prd-link:** Constante `PRD_LINK` ja existia em
  `tests/e2e/populate-plan-parity.test.ts` linha 17 (criada em Plano 01 fase-02). Reutilizada
  nas 2 mensagens de erro dos novos testes. NAO re-declarada.
  - Por que: single source of truth — drift entre 2 declaracoes de PRD_LINK quebraria a
    mensagem educativa.
  - Impacto: nenhum (idempotente).

- **DI-Plano02-fase04-red-validado:** RED do Passo 6 (apagar `## Observability` do tpl,
  rodar teste, ver falhar com mensagem listando `## Observability`, restaurar tpl) foi
  EXECUTADO e PASSOU. Confirma que o gate "nunca diminuir" CA-03 nao e tautologico.
  - Por que: validar manualmente que o teste detecta drift real.
  - Impacto: tpl restaurado antes do commit final. Nao ha mudanca no working tree relativa a
    isso.

---

## Bugs Descobertos

- **BUG-Plano02-fase01-plano01-nao-committed:** Vide DI-Plano02-fase01-precondicao-quebrada
  acima. Causa raiz: workflow do Plano 01 deixou alteracoes em stash sem committar. Fix:
  recuperacao seletiva via `git checkout stash@{0} -- <files>` + 3 commits retroativos.
  Stash@{0} preservado intacto.

---

## Gotchas

- **GT-Plano02-fase03-promise-all-leitura:** `renderPhase` lendo tpl por chamada = N reads de
  FS (>= 12). `Promise.all` paraleliza no event loop. Para >= 50 fases, considerar cache em
  memoria do tpl (lazy memoize). Atualmente: aceitavel.

- **GT-Plano02-fase03-typecheck-pre-existente:** `bun run typecheck` reporta 3 erros
  pre-existentes (GT-01 herdado): `lazy-import.test.ts` (TS2307) e `subagent-contract.ts`
  (TS2305/TS2339). Nao foram introduzidos pelo Plano 02. Continuar monitorando — corrigir em
  plano dedicado.

- **GT-Plano02-fase03-no-lint-script:** Nao ha script `lint` em `package.json`. Os criterios
  de aceite mencionam `bun run lint`, mas o projeto nao tem linter configurado. Nao bloquear
  fases por isso, mas considerar adicionar (ESLint ou Biome) em plano futuro.

---

## Desvios do Plano

- **DEV-Plano02-fase-paralelas-rodaram-sequencialmente:** README do Plano 02 sugeria executar
  fase-01 e fase-02 em paralelo (arquivos disjuntos). O orchestrador escolheu sequencial para
  evitar race em git index (cada plan-executor faz commit ao final). Trade-off: ~30s a mais de
  duracao total. Beneficio: zero risco de conflito de index lock.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 1 (sequencial em vez de paralelo — sem impacto funcional) |
| Bugs encontrados | 1 (precondicao Plano 01 nao committed) |
| Retries necessarios | 0 |
| Commits Plano 02 | 4 (`d5c78f9`, `98b103d`, `fc55b4a`, `778decb`) |
| Commits retroativos Plano 01 | 3 (`e1f1a32`, `c8bde21`, `2f028dd`) |
| Testes ao final | 10/10 verde (6 generator + 4 parity) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **Caminho dos tpls criados (Plano 05 fase-01 vai gerar golden snapshot deles):**
  - `skills/init/assets/templates/exec-plan/PLAN.md.tpl` (11 H2 obrigatorias + 3 opcionais como
    `<!-- opcional: ... -->`).
  - `skills/init/assets/templates/exec-plan/fase.md.tpl` (6 marcadores `{{VAR}}`).

- **Variaveis `{{VAR}}` injetadas pelo renderer (Plano 05 fase-01 pode precisar regenerar
  manualmente o output):**
  - PLAN.md.tpl: `{{PROJECT_NAME}}`, `{{DATE}}`, `{{PHASES_TABLE}}` (3 chaves).
  - fase.md.tpl: `{{FASE_NUM}}`, `{{DOC_CANONICO}}`, `{{INPUTS_DOCS_BLOCK}}`,
    `{{INPUTS_CODE_BLOCK}}`, `{{INSTRUCAO_LLM_BLOCK}}`, `{{CRITERIO_DONE_BLOCK}}` (6 chaves).

- **Helper `applyVars` localizado em `skills/init/lib/populate-plan-generator.ts`** (linha ~29).
  Local — NAO exportado. Se Plano 05 fase-01 quiser reusar para regenerar manualmente, pode
  importar via `import { applyVars }` apos adicionar `export` no helper (decisao do dev).

- **Renderer agora eh async — `generatePopulatePlanV2` faz `await renderPlanIndex(...)` e
  `await Promise.all(...)` para phases.** Assinatura externa de `generatePopulatePlanV2`
  inalterada (ja era async). Callers fora do generator: zero (`renderPlanIndex|renderPhase`
  usados somente dentro do proprio arquivo — grep confirmado).

- **Sanity check em runtime:** `renderPlanIndex` emite `console.warn` se alguma secao de
  `EXEC_PLAN_SECTIONS_FULL` desaparecer do tpl. NAO quebra build — parity test (fase-04) eh o
  gate real. Plano 05 nao precisa silenciar esse warning.

- **Estado final do parity test:** `tests/e2e/populate-plan-parity.test.ts` tem 4 asserts
  ativos (2 do Plano 01 + 2 do Plano 02):
  1. >= 12 fases cobrindo CA-01 (Plano 01 fase-02).
  2. EXCLUDED nao readiciona PRODUCT_SENSE/README (CA-04, Plano 01 fase-02).
  3. 11 secoes obrigatorias presentes (CA-03, Plano 02 fase-04).
  4. 3 opcionais ausentes OU marcadas como `<!-- opcional -->` (CA-03, Plano 02 fase-04).

- **Plano 03 fase-03 e Plano 04 fase-03** vao estender este mesmo arquivo de parity com asserts
  de instrucoes imperativas (CA-06) e paths reais por stack (CA-02, CA-05). Continuar
  reutilizando `PRD_LINK` da linha 17 — nao re-declarar.

- **Sem testes de regressao para o teste-mutante:** O exercicio RED do Passo 6 da fase-04
  (apagar `## Observability` do tpl) foi feito e revertido sem commit. Se Plano 03/04 quiserem
  validar o RED de seus asserts, repetir o mesmo padrao (mutacao temporaria, sem commit).

- **stash@{0} ainda contem 3 hooks WIP nao relacionados** (`hooks/file-size-guard.cjs`,
  `hooks/sync-agents-to-claude.cjs`, `hooks/version-check.cjs`) + fixture STATE.md
  auto-regenerada. Plano 03+ NAO precisa toca-lo, mas saber que existe.

---

<!-- Atualizado automaticamente durante execucao -->
