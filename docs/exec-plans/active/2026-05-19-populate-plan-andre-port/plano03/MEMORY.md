# Memoria: Plano 03 — MH-3 Instrucoes imperativas

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Concluido:** 2026-05-20
**Status:** completed

**Bloqueadores ja resolvidos:** Plano 01 (lista canonica completa, `EXCLUDED_FROM_POPULATION_V2`
reduzido, `tests/e2e/populate-plan-parity.test.ts` com 2 asserts MH-1 ativos). Plano 03 roda
em paralelo com Plano 02 e Plano 04 — arquivos disjuntos.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano03-fase01-import-style:** import no teste usa path relativo curto `'./populate-plan-generator'`
  (sem alias `@/skills/...`). Teste fica em `skills/init/lib/` lado a lado com o modulo.
  - Por que: sem alias configurado para esse path no tsconfig; convencao do repo para tests unitarios
    em `lib/` usa relativo. Confirmado por inspecao dos outros testes na pasta.
  - Impacto: fase-03 (parity test em `tests/e2e/`) usara import relativo mais longo
    `../../skills/init/lib/populate-plan-generator` ou alias conforme convencao do diretorio.

- **DI-Plano03-fase01-estado-inicial:** linhas reais no momento da execucao (shiftadas vs doc):
  - Linha 101: `// --- Mapa de instrucoes LLM por doc canonico ---` (doc dizia ~74).
  - Linha 106: `const LLM_INSTRUCTIONS: Record<string, string> = {` (doc dizia ~79).
  - Linha 155: `const DEFAULT_INSTRUCTION =` (doc dizia ~128).
  - Linha 160: `function llmInstructionFor(dst: string): string` (doc dizia ~133).
  - Linha 204: `function renderLLMInstructionBlock(instruction: string): string` (doc dizia ~177).
  - Por que: Plano 02 fase-03 adicionou TPL_DIR, readTpl, applyVars e datePathSafe antes da secao.
  - Impacto: fase-02 deve reler o arquivo antes de editar — linhas continuarao shiftadas.

- **DI-Plano03-fase01-test-each-count:** `test.each` com 10 casos invalidos funciona corretamente
  no bun v1.3.9 com formato `test.each([[label, input], ...])('%s', ...)`. 12 testes passaram
  (1 render + 1 happy + 10 invalidos). Sem necessidade de fallback para 10 testes explicitos (G5).

- **DI-Plano03-fase02-export-llm-instructions:** decidiu opcao (a) do Passo 6 do doc —
  `export` adicionado em fase-02 ja (linha 157). Facilita o test.each interno desta fase e
  simplifica fase-03 (passo "adicionar export" some, sobra apenas o import no parity test).
  Grep confirmou: nenhum consumer externo importava `LLM_INSTRUCTIONS` anteriormente (era
  `const` privado sem callers externos no source).

- **DI-Plano03-fase02-batch-size:** 12 entries refatoradas em 4 lotes de 3 (rodando
  `bun run typecheck` entre lotes). Particao:
  - Lote 1: `ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/SECURITY.md`.
  - Lote 2: `docs/RELIABILITY.md`, `docs/DESIGN.md`, `docs/CODE_STYLE.md`.
  - Lote 3: `docs/QUALITY_SCORE.md`, `docs/PLANS.md`, `docs/STATE.md`.
  - Lote 4: `docs/design-docs/core-beliefs.md`, `AGENTS.md`, `CLAUDE.md`.
  Nenhum lote precisou de retorno.

- **DI-Plano03-fase02-default-provisorio:** `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03`
  adicionado em linha 377 (logo apos `DEFAULT_INSTRUCTION` string original na linha 368).
  `DEFAULT_INSTRUCTION` string MANTIDO intocado ao lado (fase-03 deleta). `llmInstructionFor`
  retorna `ImperativeInstruction` e usa o LEGACY como fallback.

- **DI-Plano03-fase02-phase-type:** `PopulatePlanPhase.instrucaoLLM` tipo mudou de `string`
  para `ImperativeInstruction` (linha 56, comentario 2026-05-19). Cascata obrigatoria:
  `renderLLMInstructionBlock` aceita `ImperativeInstruction` e chama `formatImperativeInstruction`.

- **DI-Plano03-fase03-default-final:** `DEFAULT_INSTRUCTION` reescrito como `ImperativeInstruction` exportado.
  Snippet do objeto final:
  ```typescript
  export const DEFAULT_INSTRUCTION: ImperativeInstruction = {
    fontes: [
      'package.json',
      'README.md (se existir)',
      'docs/** (qualquer doc candidato relacionado ao destino)',
      'src/** ou skills/** (codigo principal)',
    ],
    secoes: ['Goal', 'Inputs', 'Output'],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Sem evidencia suficiente: flag `needsUser` + nao gerar conteudo especulativo. ' +
      'Honestidade > marketing.',
  }
  ```
  `DEFAULT_INSTRUCTION` string antigo e `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` deletados.
  `llmInstructionFor` usa `LLM_INSTRUCTIONS[dst] ?? DEFAULT_INSTRUCTION`.

- **DI-Plano03-fase03-export-confirmado:** `LLM_INSTRUCTIONS` exportado desde fase-02 (linha 157).
  Fase-03 apenas confirmou — nenhuma mudanca adicional de export necessaria.

- **DI-Plano03-fase03-red-validado:** RED mutation validado manualmente (Passo 8 do doc):
  - RED 1: comentar `fontes: []` em `ARCHITECTURE.md` → teste `every LLM_INSTRUCTION entry` falhou
    com mensagem `LLM_INSTRUCTIONS['ARCHITECTURE.md']: \`fontes\` ausente ou vazio`. Correto.
  - RED 2: `fontes: []` em `DEFAULT_INSTRUCTION` → teste `DEFAULT_INSTRUCTION is a valid...` falhou
    com mensagem apontando o schema obrigatorio e link CA-06. Correto.
  - Ambos restaurados. Suite cheia: 6 pass, 0 fail.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **Gotcha-Plano03-{tag}:** {descricao breve do que assustou}
  - Como deveria ser feito: {recomendacao}
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits Plano 03 | 3 (84c14d5, 69234d3, fa7b2d4) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Apos fase-01

- **Exports adicionados em `skills/init/lib/populate-plan-generator.ts`:**
  - `export interface ImperativeInstruction` (tipo com 3 campos: `fontes: string[]`, `secoes: string[]`, `honestidade: string`)
  - `export function formatImperativeInstruction(instr: ImperativeInstruction): string`
  - `export function isImperativeInstruction(input: unknown): input is ImperativeInstruction`
  - Posicionados entre o comentario `// --- Mapa de instrucoes LLM por doc canonico ---` e `const LLM_INSTRUCTIONS`.
- **Arquivo de teste criado:** `skills/init/lib/imperative-instruction.test.ts` (12 testes: 1 render + 1 happy + 10 invalidos via `test.each`).
- **Linhas reais apos fase-01** (para fase-02 reler antes de editar):
  - `const LLM_INSTRUCTIONS: Record<string, string>` agora em torno de linha 148 (shiftou +42 linhas vs pre-fase-01).
  - `const DEFAULT_INSTRUCTION` agora em torno de linha 197.
  - `function llmInstructionFor` agora em torno de linha 202.
  - `function renderLLMInstructionBlock` agora em torno de linha 246.
  - DEVE reler o arquivo antes de qualquer edit — linhas sao estimativa.
- **Convencao de import para testes em `skills/init/lib/`:** path relativo curto (`'./populate-plan-generator'`).
  Testes em `tests/e2e/` usarao path relativo mais longo — verificar convencao antes de escrever.
- **`bun run lint` NAO existe como script** (herdado do Plano 02 MEMORY). Typecheck via `bun run typecheck`.
  3 erros GT-01 pre-existentes (nao introduzidos): `lazy-import.test.ts` (TS2307) e `subagent-contract.ts` (TS2305/TS2339).

### Apos fase-02

- **12 chaves do map `LLM_INSTRUCTIONS`** (em ordem no arquivo):
  `ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/SECURITY.md`, `docs/RELIABILITY.md`,
  `docs/DESIGN.md`, `docs/CODE_STYLE.md`, `docs/QUALITY_SCORE.md`, `docs/PLANS.md`,
  `docs/STATE.md`, `docs/design-docs/core-beliefs.md`, `AGENTS.md`, `CLAUDE.md`.

- **`DEFAULT_INSTRUCTION` string (linha 368)** mantida intocada para fase-03 reescrever.
  `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` (linha 377) e o fallback provisorio de
  `llmInstructionFor`. Fase-03 deleta o LEGACY e reescreve o DEFAULT como
  `ImperativeInstruction` com `fontes`/`secoes` reais.

- **`PopulatePlanPhase.instrucaoLLM`** agora e `ImperativeInstruction` (nao mais `string`).
  Fase-03 nao precisa mudar o tipo — ja e correto.

- **Testes apos fase-02:**
  - `populate-plan-generator.test.ts`: 18 pass (6 originais + 12 do test.each).
  - `imperative-instruction.test.ts`: 12 pass (sem mudanca).
  - `tests/e2e/populate-plan-parity.test.ts`: 4 pass (sem mudanca — fase-03 estende).

- **`export const LLM_INSTRUCTIONS`** confirmado em linha 157 — fase-03 nao precisa adicionar export.

### Apos fase-03 (estado final do Plano 03)

- **Parity test: 6 asserts ativos** em `tests/e2e/populate-plan-parity.test.ts`:
  1. `plano gerado contem >= 12 fases cobrindo lista CA-01` (MH-1, Plano 01)
  2. `EXCLUDED_FROM_POPULATION_V2 nao readiciona PRODUCT_SENSE nem README (CA-04)` (MH-1, Plano 01)
  3. `PLAN.md gerado contem as 11 secoes obrigatorias (10 Andre + Observability) — CA-03` (CA-03, Plano 02)
  4. `PLAN.md tem 3 opcionais ausentes OU marcadas como <!-- opcional --> (CA-03)` (CA-03, Plano 02)
  5. `every LLM_INSTRUCTION entry is a valid ImperativeInstruction (CA-06)` (CA-06, Plano 03)
  6. `DEFAULT_INSTRUCTION is a valid ImperativeInstruction (CA-06)` (CA-06, Plano 03)

- **Path de import no parity test:** `'../../skills/init/lib/populate-plan-generator'` (relativo, 2 niveis de `tests/e2e/`).

- **API publica exportada de `populate-plan-generator.ts`** (relevante para Plano 05 fase-01):
  - `export interface ImperativeInstruction`
  - `export function formatImperativeInstruction`
  - `export function isImperativeInstruction`
  - `export const LLM_INSTRUCTIONS` (12 chaves)
  - `export const DEFAULT_INSTRUCTION`

- **12 chaves de `LLM_INSTRUCTIONS`** (em ordem):
  `ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/SECURITY.md`, `docs/RELIABILITY.md`,
  `docs/DESIGN.md`, `docs/CODE_STYLE.md`, `docs/QUALITY_SCORE.md`, `docs/PLANS.md`,
  `docs/STATE.md`, `docs/design-docs/core-beliefs.md`, `AGENTS.md`, `CLAUDE.md`.

- **`DEFAULT_INSTRUCTION.secoes`** final: `['Goal', 'Inputs', 'Output']` (formato Andre canonico).

- **Testes apos fase-03 (total: 36 pass):**
  - `tests/e2e/populate-plan-parity.test.ts`: 6 pass (4 anteriores + 2 CA-06 novos).
  - `skills/init/lib/populate-plan-generator.test.ts`: 18 pass (sem mudanca).
  - `skills/init/lib/imperative-instruction.test.ts`: 12 pass (sem mudanca).

- **Plano 05 fase-01** pode importar diretamente `DEFAULT_INSTRUCTION`, `LLM_INSTRUCTIONS`,
  `isImperativeInstruction` de `populate-plan-generator.ts` — sem necessidade de re-exportar
  via arquivo intermediario.

---

<!-- Atualizado automaticamente durante execucao -->
