<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 03: Refatorar renderer para consumir os tpls

**Plano:** 02 — MH-2 PLAN.md / fase.md templates estilo Andre
**Sizing:** 2h
**Depende de:** fase-01 (PLAN.md.tpl), fase-02 (fase.md.tpl)
**Visual:** false

---

## O que esta fase entrega

`renderPlanIndex()` e `renderPhase()` em `populate-plan-generator.ts` passam a ler os tpls de
`skills/init/assets/templates/exec-plan/` via `fs.readFile` e injetar variaveis com helper
`applyVars`. `generatePopulatePlanV2` aguarda as duas funcoes (agora async). Contrato externo
do Step 91 inalterado. Step 91 segue PURO (zero LLM). Suite de testes do generator atualizada
e verde.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | imports novos (fs, path, EXEC_PLAN_SECTIONS_FULL); helpers `TPL_DIR`, `readTpl`, `applyVars`; `renderPlanIndex` async lendo `PLAN.md.tpl`; `renderPhase` async lendo `fase.md.tpl`; `generatePopulatePlanV2` com `await` nas chamadas |
| `skills/init/lib/populate-plan-generator.test.ts` | Modify | atualizar 1-2 expectations que checam substrings hardcoded do output antigo (`Glossario`, `Como executar`) — adaptar para o output do tpl novo |

---

## Implementacao

### Passo 1: Ler estado atual

Antes de tocar, reler:

- `skills/init/lib/populate-plan-generator.ts` linhas 1-30 (imports + comentarios topo)
- `skills/init/lib/populate-plan-generator.ts` linhas 195-269 (renderPhase + renderPlanIndex)
- `skills/init/lib/populate-plan-generator.ts` linhas 273-315 (generatePopulatePlanV2)
- `skills/init/lib/populate-plan-generator.test.ts` inteiro (~ 90 linhas)

Identificar nas expectations do teste quais checam substrings do output:

- Linha 27-30 (`### Inputs (docs candidatos)`, `### Inputs (codigo)`, `### Instrucao LLM`,
  `### Criterio de done`) — devem continuar passando porque o tpl preserva esses headers.
- Linha 40-41 (`## Glossario de Instrucoes LLM`, `| Fase | Doc canonico | Arquivo | Status |`)
  — esses NAO existem no tpl novo. Precisam mudar.

Registrar em MEMORY.md `DI-Plano02-fase03-test-expectations-mudadas` com a lista exata.

### Passo 2: Adicionar imports e helpers no topo de `populate-plan-generator.ts`

Apos os imports atuais (linhas 6-9), adicionar:

```typescript
// 2026-05-19 (Luiz/dev): Plano 02 fase-03 do PRD populate-plan-andre-port (MH-2) —
// renderer passa a ler tpls de assets/templates/exec-plan/. Step 91 continua PURO
// (apenas FS read + replace). G3 do README do Plano 02: ordem das 10 secoes base do
// PLAN.md.tpl deve casar com EXEC_PLAN_SECTIONS_FULL (validado em fase-04 via parity).
import { promises as fs } from 'node:fs'
import { EXEC_PLAN_SECTIONS_FULL } from '../../lib/exec-plan-sections'
```

Observacao: `path` ja esta importado na linha 6 — reusar. `import.meta.dir` ja eh acessivel
em Bun runtime.

### Passo 3: Adicionar `TPL_DIR`, `readTpl`, `applyVars`

Apos os imports, antes da secao `// ===== v2: renderer...` (linha 20):

```typescript
// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — leitura de tpl + injecao de vars.
// G1 do README do Plano 02: TEMPLATES_ROOT em template-manifest.ts:90 ja existe e aponta
// para skills/init/assets/templates/. Sub-pasta exec-plan/ foi criada em fase-01/fase-02.
// Por isso compomos o path aqui sem duplicar a constante.
const TPL_DIR = path.join(import.meta.dir, '..', 'assets', 'templates', 'exec-plan')

async function readTpl(filename: string): Promise<string> {
  return fs.readFile(path.join(TPL_DIR, filename), 'utf-8')
}

// 2026-05-19 (Luiz/dev): mustache-style replace. Sem regex — `replaceAll` literal evita
// colisao com `{` ou `}` no value. G5 do README do Plano 02.
function applyVars(tpl: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    tpl,
  )
}
```

### Passo 4: Refatorar `renderPhase` para `async` e ler `fase.md.tpl`

Substituir o corpo atual de `renderPhase` (linhas 195-212):

```typescript
// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — antes: string literal hardcoded. Agora le
// fase.md.tpl e injeta {{INPUTS_DOCS_BLOCK}}, etc via applyVars. Ordem dos blocos
// preservada (G local da fase-02). renderPhase agora e async — caller (generatePopulatePlanV2)
// faz await; assinatura externa de generatePopulatePlanV2 inalterada.
async function renderPhase(phase: PopulatePlanPhase): Promise<string> {
  const tpl = await readTpl('fase.md.tpl')
  return applyVars(tpl, {
    FASE_NUM: String(phase.fase).padStart(2, '0'),
    DOC_CANONICO: phase.docCanonico,
    INPUTS_DOCS_BLOCK: renderInputsDocsBlock(phase.inputsDocs),
    INPUTS_CODE_BLOCK: renderInputsCodeBlock(phase.inputsCode),
    INSTRUCAO_LLM_BLOCK: renderLLMInstructionBlock(phase.instrucaoLLM),
    CRITERIO_DONE_BLOCK: renderDoneCriteriaBlock(),
  })
}
```

### Passo 5: Refatorar `renderPlanIndex` para `async` e ler `PLAN.md.tpl`

Substituir o corpo atual (linhas 231-269). A logica da tabela de fases (rows) e movida para uma
variavel `phasesTable` que vira o valor de `{{PHASES_TABLE}}`:

```typescript
// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — le PLAN.md.tpl e injeta:
//   {{PROJECT_NAME}}, {{DATE}}, {{PHASES_TABLE}}.
// Glossario e secao "Como executar" do output antigo NAO existem no tpl novo (canon Andre).
// Testes em populate-plan-generator.test.ts que checavam "Glossario" devem mudar para
// asserts das 11 secoes (Goal, Scope, ..., Observability).
async function renderPlanIndex(
  phases: ReadonlyArray<PopulatePlanPhase>,
  projectName: string,
  dateStr: string,
): Promise<string> {
  const header = '| Fase | Doc canonico | Arquivo | Status |\n|------|--------------|---------|--------|'
  const rows = phases
    .map(p => {
      const file = `fase-${String(p.fase).padStart(2, '0')}-${docToSlug(p.docCanonico)}.md`
      return `| ${String(p.fase).padStart(2, '0')} | \`${p.docCanonico}\` | [${file}](./${file}) | aberta |`
    })
    .join('\n')
  const phasesTable = `${header}\n${rows}`

  const tpl = await readTpl('PLAN.md.tpl')

  // 2026-05-19 (Luiz/dev): Plano 02 fase-03 G3 — sanity check em runtime de que as 10 secoes
  // base do tpl batem com EXEC_PLAN_SECTIONS_FULL. NAO quebra build — apenas log. Parity test
  // (fase-04) e o gate real. Esse aviso ajuda o dev a perceber drift cedo, durante /init.
  for (const sec of EXEC_PLAN_SECTIONS_FULL) {
    if (!new RegExp(`^## ${sec}\\s*$`, 'm').test(tpl)) {
      console.warn(`[populate-plan-generator] PLAN.md.tpl missing canonical section: ${sec}`)
    }
  }

  return applyVars(tpl, {
    PROJECT_NAME: projectName,
    DATE: dateStr,
    PHASES_TABLE: phasesTable,
  })
}
```

### Passo 6: Ajustar `generatePopulatePlanV2` para `await`

Em `generatePopulatePlanV2` (linhas 273-315), trocar 2 chamadas:

**Antes (linha 300):**
```typescript
phaseFiles.set(file, renderPhase(phase))
```
**Depois:**
```typescript
phaseFiles.set(file, await renderPhase(phase))
```

**Antes (linha 304):**
```typescript
const planIndexMarkdown = renderPlanIndex(phases, input.projectName, dateStr)
```
**Depois:**
```typescript
const planIndexMarkdown = await renderPlanIndex(phases, input.projectName, dateStr)
```

Considerar trocar o `for...of` por `Promise.all` para paralelizar a leitura dos tpls de fase:

```typescript
const phaseFilesEntries = await Promise.all(
  phases.map(async phase => {
    const file = `fase-${String(phase.fase).padStart(2, '0')}-${docToSlug(phase.docCanonico)}.md`
    const content = await renderPhase(phase)
    return [file, content] as const
  }),
)
const phaseFiles = new Map<string, string>(phaseFilesEntries)
```

Justificativa: `readTpl` faz 1 read por fase (>= 12 reads). `Promise.all` paraleliza no event
loop sem overhead extra. Aceitavel ate ~50 fases. Documentar com comentario:

```typescript
// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — paraleliza leituras de fase.md.tpl (>= 12 reads).
// readTpl e idempotente; FS cache do OS deduplica. Sem race em writes (apenas reads).
```

### Passo 7: Atualizar testes em `populate-plan-generator.test.ts`

Reabrir o arquivo. Para o teste `PLAN.md index contains glossario + phase table`
(linhas 34-42), substituir as 2 expectations:

**Antes:**
```typescript
expect(result.planIndexMarkdown).toContain('## Glossario de Instrucoes LLM')
expect(result.planIndexMarkdown).toContain('| Fase | Doc canonico | Arquivo | Status |')
```
**Depois:**
```typescript
// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — tpl novo (canon Andre) nao tem Glossario.
// As 10 secoes Andre + Observability sao validadas em tests/e2e/populate-plan-parity.test.ts
// (Plano 02 fase-04). Aqui validamos so que a tabela de fases foi injetada e que o titulo do
// plano usa o projectName.
expect(result.planIndexMarkdown).toContain('| Fase | Doc canonico | Arquivo | Status |')
expect(result.planIndexMarkdown).toContain('Populate Harness — test-project')
```

Renomear o teste para `PLAN.md index contains phase table and project name (post-MH-2)` para
deixar claro o intento novo.

Se houver outras expectations que dependem do output antigo (ex: "Como executar", "Glossario"),
remover e adicionar comentario datado apontando para fase-04 (parity test que valida as 11
secoes).

### Passo 8: Rodar testes e iterar ate verde

```powershell
bun test skills/init/lib/populate-plan-generator.test.ts
bun test tests/e2e/populate-plan-parity.test.ts
bun run typecheck
bun run lint
```

Se algum teste falhar, ler stderr — provavelmente uma expectation de substring que ainda
referencia output antigo. Atualizar (NAO deletar) o teste mantendo o intento.

---

## Gotchas

- **G1 do plano (`TEMPLATES_ROOT` ja existe):** NAO duplicar a constante. Aqui usamos
  `TPL_DIR = path.join(import.meta.dir, '..', 'assets', 'templates', 'exec-plan')` — mesma
  base que `template-manifest.ts:90` calcula. Documentado no Comment Provenance do helper.
- **G2 do plano (PURO):** `fs.readFile` e I/O de arquivo estatico, NAO LLM. Step 91 segue
  PURO.
- **G6 do plano (async cascade):** `renderPlanIndex`/`renderPhase` agora retornam `Promise`.
  Unico caller eh `generatePopulatePlanV2` (ja async). Confirmar com `grep`:

  ```powershell
  Select-String -Path skills -Pattern 'renderPlanIndex|renderPhase' -Recurse | Where-Object { $_.Path -notmatch 'populate-plan-generator' }
  ```
  Esperado: zero matches. Se houver outro caller, atualizar tambem.
- **Local (typecheck strict):** `applyVars` espera `Record<string, string>` — se algum value
  for `undefined` (ex: `phase.instrucaoLLM` opcional no futuro), TS reclama. Manter assinatura
  estrita; usar `?? ''` se algum campo virar opcional.
- **Local (testes que checam contagens):** o test `does NOT include excluded files`
  (linha 44-54) introspecciona `phases` (estrutura, nao string). Continua valido sem
  mudancas. Igual para o teste de `relativeFolderPath`.
- **Local (`{{PHASES_TABLE}}` no meio da secao `## Execution Steps`):** o tpl em fase-01
  posiciona `{{PHASES_TABLE}}` imediatamente apos o header `## Execution Steps`. Apos
  `applyVars`, a tabela aparece como conteudo dessa secao. `console.warn` da Passo 5 NAO
  deve disparar nesse cenario porque `Execution Steps` esta na fonte canonica
  `EXEC_PLAN_SECTIONS_FULL` (regex matches `^## Execution Steps\s*$`).
- **Local (paralelismo Promise.all):** se um `readTpl` falhar (tpl ausente), `Promise.all`
  rejeita inteiro. Mensagem de erro do `fs.readFile` ja inclui o path — suficiente para
  debug. Sem necessidade de wrap try/catch nesta camada.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da refatoracao, rodar `bun test skills/init/lib/populate-plan-generator.test.ts`
      — esperado: 6 testes passam (estado atual).

  Apos comecar a refatoracao (sem ter ainda atualizado expectations da Passo 7), rodar de novo —
  esperado: pelo menos 1 falha em "PLAN.md index contains glossario + phase table" porque o
  tpl novo nao tem "## Glossario de Instrucoes LLM". Esse e o RED.

  Comando: `bun test skills/init/lib/populate-plan-generator.test.ts --grep "PLAN.md index"`

  Resultado esperado: `Expected "## Glossario de Instrucoes LLM", received "..." (sem essa substring)`.

- [ ] **GREEN:** atualizar expectations conforme Passo 7. Rodar de novo:
      `bun test skills/init/lib/populate-plan-generator.test.ts` — 6 testes passam.

### Checklist

- [ ] Imports adicionados no topo: `promises as fs` de `node:fs` e `EXEC_PLAN_SECTIONS_FULL`
      de `'../../lib/exec-plan-sections'`.
- [ ] `TPL_DIR`, `readTpl`, `applyVars` adicionados, com Comment Provenance datado 2026-05-19.
- [ ] `renderPhase` agora `async`, le `fase.md.tpl`, injeta 6 variaveis.
- [ ] `renderPlanIndex` agora `async`, le `PLAN.md.tpl`, injeta 3 variaveis, emite warning se
      secao canonica ausente.
- [ ] `generatePopulatePlanV2` faz `await renderPlanIndex(...)` e `await Promise.all(...)` para
      `phaseFiles`.
- [ ] String literal hardcoded de `## Glossario`, `## Fases`, `## Como executar` sumiu de
      `populate-plan-generator.ts` (`grep -n "Glossario\|Como executar" populate-plan-generator.ts`
      retorna 0 matches em codigo de producao; pode haver match em comentarios datados que
      documentam a mudanca).
- [ ] `bun test skills/init/lib/populate-plan-generator.test.ts` — 6 passed (5 originais +
      teste de "PLAN.md index" com expectations atualizadas).
- [ ] `bun test tests/e2e/populate-plan-parity.test.ts` — 2 passed (do Plano 01 fase-02).
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] `Select-String -Path skills -Pattern 'renderPlanIndex|renderPhase' -Recurse` mostra
      callers SOMENTE dentro de `populate-plan-generator.ts` (ou re-exports nao-existentes).

### Comandos verificaveis

```powershell
# Inspecionar mudancas
Select-String -Path skills/init/lib/populate-plan-generator.ts -Pattern 'readTpl|applyVars|TPL_DIR'

# Suite focada
bun test skills/init/lib/populate-plan-generator.test.ts
bun test tests/e2e/populate-plan-parity.test.ts

# Build / lint
bun run typecheck
bun run lint
```

---

## Criterio de Aceite

**Por maquina:**
- `Select-String -Path skills/init/lib/populate-plan-generator.ts -Pattern 'readTpl'` retorna >= 1.
- `Select-String -Path skills/init/lib/populate-plan-generator.ts -Pattern 'applyVars'` retorna >= 1.
- `Select-String -Path skills/init/lib/populate-plan-generator.ts -Pattern '^## Glossario'`
  retorna 0 matches (a string literal hardcoded sumiu — pode haver match em comentario).
- `bun test skills/init/lib/populate-plan-generator.test.ts` — 6 passed, 0 failed.
- `bun test tests/e2e/populate-plan-parity.test.ts` — 2 passed (estado Plano 01).
- `bun run typecheck` — exit 0.
- `bun run lint` — exit 0.

**Por humano:**
- Diff legivel: o markdown literal grandao de `renderPlanIndex` foi substituido por
  `applyVars(tpl, {...})` com 3 chaves.
- `renderPhase` virou 1 chamada `applyVars` com 6 chaves.
- Sem comentario obsoleto sobre "Glossario" ou "Como executar" em codigo de producao (so em
  comentarios datados que documentam a mudanca).

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
