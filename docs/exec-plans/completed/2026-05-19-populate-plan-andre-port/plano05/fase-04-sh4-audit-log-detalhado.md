<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 04: Estender audit log do Step 91 (SH-4)

**Plano:** 05 — Gate completo + Should Haves + compound + goldens
**Sizing:** 1h
**Depende de:** Nenhuma (independente das outras fases do Plano 05 — arquivos disjuntos)
**Visual:** false

---

## O que esta fase entrega

Estender o audit log emitido pelo Step 91 (`91-generate-populate-plan.ts:69-83`) com 3 metricas novas:

- `docsCoveredByStack`: count de docs canonicos com pelo menos 1 path real (`exists: true`) no `stackPaths`.
- `docsWithoutCodeEvidence`: count de docs canonicos sem nenhum path real (todos `exists: false` ou lista vazia).
- `phasesCreatedVsExpected`: dupla `{ created: number; minExpected: number }` — atual `plan.phases.length` vs minimo CA-01 (12).

Cobre SH-4 do PRD. Observabilidade primeiro, scaling depois (licao do Plano 05 fase-03).

Helper `computeAuditCoverage(stackPaths, plan)` isola a logica de count — testavel em isolamento, sem precisar instanciar todo o Step 91. 2 testes novos em `91-generate-populate-plan.test.ts` validam as 3 metricas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-coverage.ts` | Create | Novo arquivo. Exporta `computeAuditCoverage(stackPaths, plan)` que retorna `{ docsCoveredByStack: number; docsWithoutCodeEvidence: number; phasesCreatedVsExpected: { created, minExpected } }`. Inputs sao readonly types ja existentes (`StackAwareInputPaths` + `PopulatePlanOutputV2`). |
| `skills/init/lib/populate-plan-coverage.test.ts` | Create | Unit tests. 6 it's: vazio, todas cobertas, todas sem evidencia, mistura, phasesCreatedVsExpected sem regressao, integration com fixture Next.js+Supabase. |
| `skills/init/lib/steps/91-generate-populate-plan.ts` | Modify | Linhas 69-83 (`writer?.append(...)`). Adicionar `computeAuditCoverage(stackPaths, plan)` resultado em `output_struct`. Importar do `../populate-plan-coverage`. |
| `skills/init/lib/steps/91-generate-populate-plan.test.ts` | Modify | Adicionar 2 it's: (a) "audit log emite docsCoveredByStack >= 6 em Next.js+Supabase fixture (SH-4)"; (b) "audit log emite phasesCreatedVsExpected.minExpected = 12 (CA-01)". |

Estado esperado apos esta fase: rodar Step 91 com mock de `AuditLogWriter` injetado em `ctx.flags['__auditLog']` faz writer receber `output_struct` contendo as 3 metricas novas alem das 5 existentes (`planFolder`, `phaseCount`, `filesWritten`, `warnings`, `stackPrimary`, `discoveryEntries`).

---

## Implementacao

### Passo 1: Reler estado atual do audit log

```powershell
Get-Content skills/init/lib/steps/91-generate-populate-plan.ts | Select-String -Pattern "output_struct" -Context 0,15
```

Esperado: bloco de linhas 69-83 com `output_struct: { planFolder, phaseCount, filesWritten, warnings, stackPrimary, discoveryEntries }` (6 campos hoje). Sem este bloco, **parar** — feature anterior precisa estar mergeada.

```powershell
Get-Content skills/init/lib/audit-log.ts | Select-String -Pattern "append" -Context 0,10
```

Esperado: `AuditLogWriter.append({ subagent_id, input_paths, output_struct, duration_ms, retry_count })`. `output_struct` e `Record<string, unknown>` — aceita campos adicionais. Sem mudanca de tipo necessaria.

### Passo 2: Criar `populate-plan-coverage.ts`

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-04 do PRD populate-plan-andre-port (SH-4).
// Helper isolado para contagens de cobertura — Step 91 consome no audit log.
// G7 do README plano 05: tratar Map vazio como "uncovered todos" (defensivo — sinaliza erro upstream).

import type { StackAwareInputPaths, CanonicalDoc } from './stack-aware-input-paths'
import type { PopulatePlanOutputV2 } from './populate-plan-generator'

/** Minimo esperado de fases por CA-01 do PRD populate-plan-andre-port. */
export const MIN_EXPECTED_PHASES = 12 as const

export type AuditCoverage = {
  /** Docs canonicos com >= 1 path real (`exists: true`). */
  readonly docsCoveredByStack: number
  /** Docs canonicos com 0 paths reais (todos `exists: false` ou lista vazia). */
  readonly docsWithoutCodeEvidence: number
  /** Comparativo: fases criadas vs minimo esperado. */
  readonly phasesCreatedVsExpected: {
    readonly created: number
    readonly minExpected: typeof MIN_EXPECTED_PHASES
  }
}

/**
 * Calcula 3 metricas de cobertura do plano populate gerado.
 *
 * - `docsCoveredByStack`: keys do `stackPaths` com pelo menos 1 path `exists: true`.
 * - `docsWithoutCodeEvidence`: keys do `stackPaths` com lista vazia OU todos `exists: false`.
 * - `phasesCreatedVsExpected`: `plan.phases.length` vs `MIN_EXPECTED_PHASES`.
 *
 * Map vazio (`stackPaths.size === 0`) e tratado como erro upstream — retorna ambas contagens 0.
 * Em runtime, stack `null` ou greenfield resultam em Map com keys do `GENERIC_CANDIDATES` (>=1 key).
 */
export function computeAuditCoverage(
  stackPaths: StackAwareInputPaths,
  plan: PopulatePlanOutputV2,
): AuditCoverage {
  let covered = 0
  let uncovered = 0
  for (const [, paths] of stackPaths) {
    if (paths.length === 0) {
      uncovered++
      continue
    }
    const hasReal = paths.some(p => p.exists)
    if (hasReal) covered++
    else uncovered++
  }
  return {
    docsCoveredByStack: covered,
    docsWithoutCodeEvidence: uncovered,
    phasesCreatedVsExpected: {
      created: plan.phases.length,
      minExpected: MIN_EXPECTED_PHASES,
    },
  }
}
```

### Passo 3: Criar testes unitarios em `populate-plan-coverage.test.ts`

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-04 do PRD populate-plan-andre-port (SH-4).

import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { computeAuditCoverage, MIN_EXPECTED_PHASES } from './populate-plan-coverage'
import type { StackAwareInputPaths, CanonicalDoc } from './stack-aware-input-paths'
import type { PopulatePlanOutputV2, PopulatePlanPhase } from './populate-plan-generator'
import { stackAwareInputPaths } from './stack-aware-input-paths'
import { generatePopulatePlanV2 } from './populate-plan-generator'

const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'stack-aware')

function mockPlan(phaseCount: number): PopulatePlanOutputV2 {
  const phases: PopulatePlanPhase[] = Array.from({ length: phaseCount }, (_, i) => ({
    fase: i + 1,
    docCanonico: `dummy-${i}.md`,
    inputsDocs: [],
    inputsCode: [],
    instrucaoLLM: '',
    criterioDone: '',
  }))
  return {
    planIndexMarkdown: '',
    phaseFiles: new Map(),
    relativeFolderPath: '',
    phases,
  }
}

describe('computeAuditCoverage', () => {
  it('Map vazio retorna 0/0', () => {
    const result = computeAuditCoverage(new Map(), mockPlan(0))
    expect(result.docsCoveredByStack).toBe(0)
    expect(result.docsWithoutCodeEvidence).toBe(0)
    expect(result.phasesCreatedVsExpected.created).toBe(0)
    expect(result.phasesCreatedVsExpected.minExpected).toBe(MIN_EXPECTED_PHASES)
  })

  it('todas as keys cobertas (exists: true em pelo menos 1 path)', () => {
    const stackPaths: StackAwareInputPaths = new Map<CanonicalDoc, ReadonlyArray<{path:string;exists:boolean}>>([
      ['ARCHITECTURE.md', [{ path: 'a.ts', exists: true }]],
      ['AGENTS.md', [{ path: 'b.ts', exists: true }, { path: 'c.ts', exists: false }]],
    ])
    const result = computeAuditCoverage(stackPaths, mockPlan(12))
    expect(result.docsCoveredByStack).toBe(2)
    expect(result.docsWithoutCodeEvidence).toBe(0)
  })

  it('todas as keys sem evidencia (exists: false ou lista vazia)', () => {
    const stackPaths: StackAwareInputPaths = new Map<CanonicalDoc, ReadonlyArray<{path:string;exists:boolean}>>([
      ['ARCHITECTURE.md', [{ path: 'a.ts', exists: false }]],
      ['AGENTS.md', []],
    ])
    const result = computeAuditCoverage(stackPaths, mockPlan(0))
    expect(result.docsCoveredByStack).toBe(0)
    expect(result.docsWithoutCodeEvidence).toBe(2)
  })

  it('mistura — 1 coberta + 1 sem evidencia', () => {
    const stackPaths: StackAwareInputPaths = new Map<CanonicalDoc, ReadonlyArray<{path:string;exists:boolean}>>([
      ['ARCHITECTURE.md', [{ path: 'a.ts', exists: true }]],
      ['AGENTS.md', [{ path: 'b.ts', exists: false }]],
    ])
    const result = computeAuditCoverage(stackPaths, mockPlan(2))
    expect(result.docsCoveredByStack).toBe(1)
    expect(result.docsWithoutCodeEvidence).toBe(1)
  })

  it('phasesCreatedVsExpected reflete plan.phases.length sem regressao', () => {
    const result = computeAuditCoverage(new Map(), mockPlan(15))
    expect(result.phasesCreatedVsExpected.created).toBe(15)
    expect(result.phasesCreatedVsExpected.minExpected).toBe(12)
  })

  it('integration: fixture Next.js+Supabase tem docsCoveredByStack >= 4', async () => {
    // 2026-05-19 (Luiz/dev): integration test — apos Plano 04 fase-01 (8 docs novos cobertos),
    // fixture nextjs-supabase tem >= 4 docs com paths reais (ARCHITECTURE, SECURITY, RELIABILITY +
    // outros que tocam src/app/page.tsx, package.json).
    const cwd = path.join(FIXTURES, 'nextjs-supabase')
    const stackPaths = await stackAwareInputPaths(cwd, 'nextjs')
    const plan = await generatePopulatePlanV2({
      cwd,
      projectName: 'fixture',
      manifest: [],
      stackPaths,
    })
    const result = computeAuditCoverage(stackPaths, plan)
    expect(result.docsCoveredByStack).toBeGreaterThanOrEqual(4)
    expect(result.phasesCreatedVsExpected.created).toBeGreaterThanOrEqual(12)
  })
})
```

### Passo 4: Integrar em `91-generate-populate-plan.ts`

Localizar linhas 69-83 e adicionar `computeAuditCoverage`:

```typescript
import { computeAuditCoverage } from '../populate-plan-coverage'

// ... apos `const writeResult = await writePopulatePlanFolder(...)`:

// 2026-05-19 (Luiz/dev): Plano 05 fase-04 do PRD populate-plan-andre-port (SH-4).
// 3 metricas adicionais no audit log para observabilidade da cobertura.
const coverage = computeAuditCoverage(stackPaths, plan)

const writer = ctx.flags['__auditLog'] as AuditLogWriter | undefined
await writer?.append({
  subagent_id: INIT_SUBAGENT_IDS.populatePlanGen,
  input_paths: [ctx.cwd],
  output_struct: {
    planFolder: plan.relativeFolderPath,
    phaseCount: plan.phases.length,
    filesWritten: writeResult.writtenFiles.length,
    warnings: writeResult.warnings.length,
    stackPrimary: stack.primary ?? 'none',
    discoveryEntries: discovery.entries.length,
    // 2026-05-19 (Luiz/dev): Plano 05 fase-04 — campos SH-4.
    docsCoveredByStack: coverage.docsCoveredByStack,
    docsWithoutCodeEvidence: coverage.docsWithoutCodeEvidence,
    phasesCreatedVsExpected: coverage.phasesCreatedVsExpected,
  },
  duration_ms: Math.round(performance.now() - startMs),
  retry_count: 0,
})
```

**Observacao:** `output_struct` continua sendo `Record<string, unknown>` no contrato do `AuditLogWriter` — nao precisa atualizar tipo dele. Aceita as 3 keys novas naturalmente.

### Passo 5: Adicionar 2 tests novos em `91-generate-populate-plan.test.ts`

Precisa de mock para `AuditLogWriter` — capturar appends. Padrao:

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-04 do PRD populate-plan-andre-port (SH-4).
// Helper local — captura appends do AuditLogWriter mockado.

type CapturedAppend = {
  subagent_id: string
  output_struct: Record<string, unknown>
}

function makeMockAuditWriter(captured: CapturedAppend[]) {
  return {
    async append(entry: CapturedAppend) {
      captured.push(entry)
    },
  }
}

it('audit log emite docsCoveredByStack >= 4 em Next.js+Supabase fixture (SH-4)', async () => {
  await copyRecursive(NEXTJS_SUPABASE_FIXTURE, tmpCwd)
  const captured: CapturedAppend[] = []
  const ctx: StepContext = {
    cwd: tmpCwd,
    args: [],
    // 2026-05-19 (Luiz/dev): flag __auditLog injetada pelo init dispatcher em runtime.
    // Mockamos aqui para inspecionar output_struct sem precisar abrir log do filesystem.
    flags: { __auditLog: makeMockAuditWriter(captured) as unknown as boolean },
  }
  const result = await generatePopulatePlanStep.run(ctx)
  expect(result.mutated).toBe(true)
  expect(captured.length).toBeGreaterThan(0)

  const struct = captured[0]!.output_struct
  expect(struct.docsCoveredByStack).toBeDefined()
  expect(struct.docsCoveredByStack).toBeGreaterThanOrEqual(4)
  expect(struct.docsWithoutCodeEvidence).toBeDefined()
})

it('audit log emite phasesCreatedVsExpected.minExpected = 12 (CA-01 + SH-4)', async () => {
  const captured: CapturedAppend[] = []
  const ctx: StepContext = {
    cwd: tmpCwd,
    args: [],
    flags: { __auditLog: makeMockAuditWriter(captured) as unknown as boolean },
  }
  await generatePopulatePlanStep.run(ctx)
  expect(captured.length).toBeGreaterThan(0)
  const struct = captured[0]!.output_struct
  const phasesExp = struct.phasesCreatedVsExpected as { created: number; minExpected: number }
  expect(phasesExp.minExpected).toBe(12)
  expect(phasesExp.created).toBeGreaterThanOrEqual(12)
})
```

### Passo 6: Rodar testes

```powershell
bun test skills/init/lib/populate-plan-coverage.test.ts
```

**Esperado:** 6 pass (5 unit + 1 integration).

```powershell
bun test skills/init/lib/steps/91-generate-populate-plan.test.ts
```

**Esperado:** N+2 pass (N pre-existentes + 2 novos SH-4).

```powershell
bun test
```

**Esperado:** suite completa verde.

### Passo 7: Typecheck e lint

```powershell
bun run typecheck
bun run lint
```

**Esperado:** ambos limpos.

### Passo 8: Registrar em MEMORY.md

- `DI-Plano05-fase04-helper-isolado`: criamos `populate-plan-coverage.ts` em vez de inline em `91-generate-populate-plan.ts`. Razao: helper testavel sem precisar instanciar Step 91 inteiro (mockar `AuditLogWriter` continua possivel mas isolacao e melhor).
- `DI-Plano05-fase04-empty-map-treated`: Map vazio retorna 0/0 em vez de throw. Documentar como erro upstream — runtime nunca produz Map vazio (sempre tem >= 1 key do `GENERIC_CANDIDATES`). G7 do README do Plano 05.
- `DI-Plano05-fase04-MIN_EXPECTED_PHASES-const`: constante exportada. Se PRD futuro mudar minimo de 12 → 15, mudar em 1 lugar. Step 91 ja tem assertion defensiva `< 10` linha 46 — manter (gate antigo mais permissivo) e gate novo `< 12` (gate novo mais estrito via observability).

---

## Gotchas

- **G7 do plano (Map vazio):** decisao defensiva. Comentario JSDoc do helper sinaliza claramente. Se em runtime aparecer caso real de Map vazio, e bug upstream — investigar antes de mudar helper.
- **G-mock-audit-writer-cast:** o `makeMockAuditWriter` retorna objeto com `.append()`. `ctx.flags['__auditLog']` espera `AuditLogWriter | undefined` no codigo de producao mas `boolean | string` no tipo `StepContext.flags`. Cast `as unknown as boolean` no test escapa o type-check — limitacao conhecida do `StepContext.flags` (campo polimorfico). Refator para tipo mais preciso fica para iteracao futura.
- **G-step-91-existing-defensive-check:** linha 46-53 ja tem `if (plan.phases.length < 10)` que retorna `mutated: false` sem rodar audit log. Esse caminho NAO emite as 3 metricas novas (return early antes do `writer?.append`). Decisao: nao alterar — em caminho de falha, audit log basico (`return { mutated: false, summary }`) e suficiente. Caso erro: Step 91 ja sinaliza pelo summary. Documentar em DI.
- **G-output-struct-record:** `AuditLogEntry.output_struct` e `Record<string, unknown>` no `audit-log.ts` (verificado linha 50+). Aceita keys arbitrarias. Sem necessidade de extender tipo do `AuditLogEntry`.
- **G-test-ordering-step91:** os 2 tests novos em `91-generate-populate-plan.test.ts` rodam apos `beforeEach` que cria `tmpCwd`. Sem precisar de fixture extra alem dos ja existentes (NEXTJS_SUPABASE_FIXTURE).

---

## Verificacao

### TDD

- [ ] **RED:** ANTES do Passo 2 (helper nao existe ainda), rodar `bun test skills/init/lib/populate-plan-coverage.test.ts` — fails (modulo nao encontrado).
- [ ] **GREEN:** apos Passos 2-4, todos os tests pass.
- [ ] **REFACTOR:** se o `for` loop com `if/else` ficar denso, considerar `Array.from(stackPaths.values()).reduce(...)`. Mas G7 favorece for explicito legivel — manter.

### Checklist

- [ ] `skills/init/lib/populate-plan-coverage.ts` criado com `computeAuditCoverage` exportado.
- [ ] `populate-plan-coverage.test.ts` criado com 6 it's verde.
- [ ] Constante `MIN_EXPECTED_PHASES = 12` exportada.
- [ ] `91-generate-populate-plan.ts` importa de `../populate-plan-coverage` e usa `computeAuditCoverage`.
- [ ] `output_struct` no `writer?.append` tem 3 campos novos: `docsCoveredByStack`, `docsWithoutCodeEvidence`, `phasesCreatedVsExpected`.
- [ ] 2 tests novos em `91-generate-populate-plan.test.ts` verdes.
- [ ] `bun test` (suite completa) verde, zero regressao.
- [ ] `bun run typecheck` e `bun run lint` limpos.
- [ ] MEMORY.md atualizada (3 DIs).

### Comandos verificaveis

```powershell
# Helper criado
Test-Path skills/init/lib/populate-plan-coverage.ts
# Esperado: True

# Tests unitarios + integration
bun test skills/init/lib/populate-plan-coverage.test.ts
# Esperado: 6 pass

# Tests do Step 91
bun test skills/init/lib/steps/91-generate-populate-plan.test.ts
# Esperado: N+2 pass

# Suite completa
bun test

# Typecheck + Lint
bun run typecheck
bun run lint
```

---

## Criterio de Aceite

**Por maquina:**
- `Test-Path skills/init/lib/populate-plan-coverage.ts` retorna `True`.
- `bun test skills/init/lib/populate-plan-coverage.test.ts` — exit 0, 6 pass.
- `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts` — exit 0, N+2 pass.
- `bun run typecheck` exit 0.
- `bun run lint` exit 0.

**Por humano:**
- Diff em `91-generate-populate-plan.ts`: 1 import novo + 1 chamada `computeAuditCoverage(...)` + 3 keys novas no `output_struct`.
- Helper `populate-plan-coverage.ts` < 60 linhas, com JSDoc explicando contrato Map vazio.
- Tests cobrem 5 cenarios isolados + 1 integration com fixture real.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
