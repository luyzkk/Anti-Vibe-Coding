# Audit Report — fase-00 pré-RED (Plano 01)

**Data:** 2026-05-24
**Executado por:** plan-executor (fase-00)
**Objetivo:** Catalogar arquivos que assertam mapping `nextjs→nodejs-typescript` E ajustar ANTES do mapping change em fase-04.

---

## Metodologia

Três greps executados na codebase:

1. `grep -rn "'nodejs-typescript'|\"nodejs-typescript\"" tests/ skills/init/lib/ --include="*.ts"`
2. `grep -rn "'node-ts'|\"node-ts\"" tests/ skills/init/lib/ --include="*.test.ts"`
3. `grep -rn "STACK_ID_TO_MATRIX_FOLDER" tests/ skills/init/lib/ --include="*.ts"`

---

## Arquivos catalogados

| # | Arquivo | Linha(s) | Assertion / Uso | Categoria | Ajuste aplicado |
|---|---------|----------|-----------------|-----------|-----------------|
| 1 | `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | 83 | `expect(stack.primary).toBe('node-ts')` | A (probe-only — `stack.primary` é StackId interno, não MatrixFolder; fixture Node-TS puro sem `next`) | nenhum |
| 2 | `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | 88 | `expect(stackJson.primary).toBe('nodejs-typescript')` | C (fixture `package.json: { typescript }` — Node-TS puro sem `next`; `node-ts→nodejs-typescript` não muda em fase-04) | nenhum |
| 3 | `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | 175 | `expect(stackJson!.secondary).toEqual(['nodejs-typescript'])` | C (fixture `multi-stack` com Rails+Node-TS sem `next`; mapping correto e imutável nesta fase) | nenhum |
| 4 | `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | 207 | `expect(stackJson!.primary).toBe('nodejs-typescript')` | C (fixture `node-ts-only` — Node-TS puro sem `next`) | nenhum |
| 5 | `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | 231 | `copyKnowledge({ ..., primary: 'nodejs-typescript' })` | A (chamada direta ao helper com MatrixFolder literal — não depende do detector/mapping) | nenhum |
| 6 | `tests/e2e/stack-knowledge-rails-full.test.ts` | 157 | `expect(multiResult.secondary).toContain('nodejs-typescript')` | C (fixture `monorepo-rails-node` — Rails+Node-TS sem `next`; mapping correto) | nenhum |
| 7 | `tests/e2e/stack-knowledge-rails-full.test.ts` | 213 | `expect(stack.primary).toBe('node-ts')` | A (StackId interno, não MatrixFolder; fixture `node-only` sem `next`) | nenhum |
| 8 | `tests/e2e/stack-knowledge-rails-full.test.ts` | 216 | `expect(result.stackPrimary).toBe('nodejs-typescript')` | C (fixture `node-only` — Node-TS puro sem `next`; mapping correto) | nenhum |
| 9 | `tests/e2e/stack-knowledge-rails-tracer.test.ts` | 90 | `expect(result.stackPrimary).toBe('nodejs-typescript')` | C (fixture com `package.json: { typescript }` — Node-TS puro sem `next`) | nenhum |
| 10 | `tests/e2e/init-v7-tracer-bullet.test.ts` | 66 | `expect(detectLog).toContain('stack=node-ts')` | A (probe-only — StackId interno; fixture `init-v7-greenfield` tem `typescript` sem `next`) | nenhum |
| 11 | `tests/repo-structure/knowledge-path.test.ts` | 23 | `path.join(knowledgeDir, 'nodejs-typescript', 'INDEX.md')` | A (referência de path para diretório existente — não mapping do detector; diretório `knowledge/nodejs-typescript/` continuará existindo após fase-04) | nenhum |
| 12 | `skills/init/lib/copy-knowledge.test.ts` | 18-272 (múltiplas) | `primary: 'nodejs-typescript'` em chamadas a `copyKnowledge` | A (unit tests de copyKnowledge — MatrixFolder passada diretamente como input; não dependem do mapping detector→folder) | nenhum |
| 13 | `skills/init/lib/detect-multi-stack.test.ts` | 22, 53, 77, 92 | `expect(result.primary).toBe('nodejs-typescript')` | C (fixtures geradas com `{ typescript }` sem `next`; `node-ts→nodejs-typescript` não muda em fase-04; assertions corretas e imutáveis) | nenhum |
| 14 | `skills/init/lib/emit-stack-knowledge-events.test.ts` | 11, 59, 70 | `'nodejs-typescript' as MatrixFolder` como dado fixo de teste | A (dado mock — não depende do mapping; validação do shape de eventos) | nenhum |
| 15 | `skills/init/lib/run-stack-knowledge-init.test.ts` | 32, 110, 123 | `expect(result.stackPrimary).toBe('nodejs-typescript')` | C (fixtures com `{ typescript }` — Node-TS puro sem `next`) | nenhum |
| 16 | `skills/init/lib/stack-id-map.test.ts` | 7 | `expect(isMatrixFolder('nodejs-typescript')).toBe(true)` | A (type guard — não assertion de mapping; `nodejs-typescript` continuará sendo MatrixFolder válido após fase-04) | nenhum |
| 17 | `skills/init/lib/steps/09-copy-knowledge.test.ts` | 13, 20, 56, 72 | `stackPrimary: 'nodejs-typescript'` em mocks de `RunStackKnowledgeInitResult` | A (dado mock direto — não depende do detector) | nenhum |
| 18 | `skills/init/lib/write-stack-json.test.ts` | 21-272 (múltiplas) | `primary: 'nodejs-typescript'` como dados de input/output | A (unit tests de writeStackJson — MatrixFolder passada como valor de dado; não verifica mapping detector→folder) | nenhum |
| 19 | `skills/init/lib/detect-multi-stack.test.ts` | 60 | `// go.mod maps to StackId 'unknown' → STACK_ID_TO_MATRIX_FOLDER['unknown'] = null` | A (comentário de código — não assertion) | nenhum |

---

## Achado Crítico: Nenhum Caso Categoria B

**O PRD estimava ~9 arquivos afetados com assertions Categoria B (mapping `nextjs→nodejs-typescript` direto).** O audit encontrou que este padrão NÃO existe na codebase atual.

**Por quê?** Todos os testes existentes que assertam `nodejs-typescript` operam sobre:
1. Fixtures Node-TS puro (`{ devDependencies: { typescript } }` sem `next`) → StackId `node-ts` → MatrixFolder `nodejs-typescript`. Este mapping (`node-ts→nodejs-typescript`) NÃO muda em fase-04.
2. Dados mock passados diretamente como MatrixFolder (não via detector).

Nenhum teste foi encontrado que: (a) usa fixture com `next` em deps, E (b) asserta `primary === 'nodejs-typescript'` esperando o mapping `nextjs→nodejs-typescript`.

**Implicação para fase-04:** A mudança do mapping `nextjs→nodejs-typescript` para `nextjs→nextjs` em `stack-id-map.ts` NÃO causará regressão nos testes existentes, porque nenhum teste exercita atualmente a path `nextjs→nodejs-typescript` (não existe fixture de projeto Next.js nos testes da suite atual).

---

## Resumo

- **Total catalogado:** 19 ocorrências em 11 arquivos distintos
- **Categoria A (probe-only / dado mock, sem ajuste):** 9 arquivos
- **Categoria B (desacoplar — Opção A/B):** 0 arquivos — **NENHUM caso B encontrado**
- **Categoria C (fixture Node-TS isolada, assertion correta, sem ajuste):** 5 arquivos
- **Categoria C (skip temporário — Opção C):** 0 skips — limite ≤1 cumprido (0 < 1)

---

## Estado da suite pós-fase-00

- `bun test` → EXIT=0 (suite verde no estado intermediário, confirmado em execução desta fase)
- **Falhas pré-existentes** (não relacionadas a esta fase, confirmadas via git log):
  - `tests/harness-validate-v6-path-whitelist.test.ts`: 6 falhas — último commit `2de5886` (pré-existente)
  - `tests/fixtures/generate-compound-fixture.test.ts`: 5 falhas — último commit `aecb0f1` (pré-existente)
- Pós-fase-04, nenhum arquivo categoria B precisará ser ajustado (não há categoria B)
- A suite existente protegerá o comportamento `node-ts→nodejs-typescript` após fase-04

---

## Notas para fase-04

1. O mapping change (`nextjs→nextjs` em `STACK_ID_TO_MATRIX_FOLDER`) não quebrará nenhum teste existente
2. `detect-multi-stack.ts` também usa `'nodejs-typescript'` como chave em `SOURCE_EXT_BY_MATRIX` — quando fase-04 adicionar `'nextjs'`, essa chave precisará ser atualizada em paralelo (escopo de fase-04, não desta fase)
3. Os testes novos de fase-04 (probeReact, precedência) serão os primeiros a exercitar a path `nextjs→nextjs`

<!-- Gerado por plan-executor em 2026-05-24 — fase-00 pré-RED audit, Plano 01 Next.js + React Stack Knowledge -->
