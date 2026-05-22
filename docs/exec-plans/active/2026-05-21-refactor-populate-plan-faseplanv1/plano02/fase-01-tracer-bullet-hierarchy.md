# Fase 01: Tracer Bullet — `generatePopulatePlans` emite hierarquia

**Plano:** 02 — Orchestrator, Hierarchy, Goldens
**Sizing:** 2h
**Depende de:** Plano 01 completo (todas as 4 fases)
**Visual:** false

---

## O que esta fase entrega

Refatora `generatePopulatePlans` em `skills/init/lib/populate-plan-generator.ts` para emitir **1 pasta** `{date}-populate-harness/` com:
- `PRD.md` — explica o objetivo da populate-harness session (gerado a partir de template)
- `CONTEXT.md` — decisoes / background (referencia ADR-0022, lista os 16 docs)
- `PLAN.md` — overview com lista das 16 fases, dependencias, sizing
- `fase-NN-{slug}.md` (16 arquivos) — usa `renderFasePlan` com `FasePlanInput v1`

Adapter `DocInstruction → FasePlanInput` aplicado por entrada. `renderAndrePlan` antigo eh **removido**. Test de integracao com temp dir valida estrutura.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | Reescrita parcial: `generatePopulatePlans` emite hierarquia |
| `skills/init/lib/populate-plan-generator.test.ts` | Modify | Teste de integracao com temp dir, valida arvore |
| `skills/init/assets/snippets/populate-plan-template.md` | Delete | Snippet substituido por geracao programatica — marcado obsoleto desde 2026-05-19 |
| `skills/init/lib/populate-harness-prd-template.ts` | Create | Funcao `renderPopulateHarnessPRD(): string` |
| `skills/init/lib/populate-harness-context-template.ts` | Create | Funcao `renderPopulateHarnessContext(): string` |
| `skills/init/lib/populate-harness-plan-overview.ts` | Create | Funcao `renderPopulateHarnessPlanOverview(plans: GeneratedPlan[]): string` |

---

## Implementacao

### Passo 1: Adapter `DocInstruction → FasePlanInput`

Funcao pura, isolada para teste:

```typescript
// skills/init/lib/populate-plan-generator.ts (trecho)
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — adapter DocInstruction → FasePlanInput v1.

import { POPULATE_INSTRUCTIONS_BY_DOC, buildWavesForDoc, docToSlug, type DocInstruction } from './populate-instructions-table'
import { renderFasePlan, type FasePlanInput, type Wave } from './render-fase-plan'

function toFasePlanInput(
  docPath: string,
  instr: DocInstruction,
  stackPrimary: NonNullable<DetectedStack['primary']>,
): FasePlanInput {
  const wavesFromTable = buildWavesForDoc(docPath, stackPrimary)
  const wave1 = wavesFromTable[0]! // garantido pela tabela

  // Wave 2 deriva de sectionsToWrite (mantem semantica antiga)
  const wave2Items = instr.sectionsToWrite.map(s => `Write the H2 section: ${s}`)
  const waves: ReadonlyArray<Wave> = [
    wave1,
    { name: 'Wave 2 — Write sections', items: wave2Items },
  ]

  return {
    docPath,
    schemaVersion: 1,
    goal: instr.goal,
    scope: { in: instr.scopeIn, out: instr.scopeOut },
    assumptions: instr.assumptions,
    risks: instr.risks,
    waves,
    reviewChecklist: instr.reviewChecklist,
    compoundOpportunity: instr.compoundOpportunity,
    exitCriteria: instr.exitCriteria,

    guidanceFile: instr.guidanceFile,
    detectionSignals: instr.detectionSignals,
    mustCover: instr.mustCover,
    linkTargets: instr.linkTargets,
    stackVariants: instr.stackVariants,
    validationCommand: instr.validationCommand,
    dependsOn: instr.dependsOn,
  }
}
```

### Passo 2: Reescrever `generatePopulatePlans` para emitir hierarquia

```typescript
// skills/init/lib/populate-plan-generator.ts (continuacao)
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — output hierarquico (1 pasta, 16 fases).

import { renderPopulateHarnessPRD } from './populate-harness-prd-template'
import { renderPopulateHarnessContext } from './populate-harness-context-template'
import { renderPopulateHarnessPlanOverview } from './populate-harness-plan-overview'

export type GeneratedFasePlan = {
  readonly dst: string                  // ex: 'docs/SECURITY.md'
  readonly slug: string                 // ex: 'docs-security-md'
  readonly faseNumber: number           // 1..16
  readonly relPath: string              // ex: 'docs/exec-plans/active/2026-05-21-populate-harness/fase-01-docs-security-md.md'
  readonly content: string
}

export type GenerateResultV2 = {
  readonly folderPath: string                                   // pasta unica criada
  readonly prdPath: string
  readonly contextPath: string
  readonly planPath: string
  readonly fasePlans: ReadonlyArray<GeneratedFasePlan>
  readonly stackPrimary: NonNullable<DetectedStack['primary']>
  readonly legacyArtifactsFound: number
  readonly docsSkipped: ReadonlyArray<string>
}

export async function generatePopulatePlans(opts: GenerateOpts): Promise<GenerateResultV2> {
  const now = (opts.clock ?? (() => new Date()))()
  const dateSlug = now.toISOString().slice(0, 10)

  const manifest = await readManifestGraceful(opts.cwd)
  const legacyArtifactsFound = manifest?.legacy.filter(e => e.found).length ?? 0

  const stackPrimary = opts.stack.primary
  if (stackPrimary === null) {
    // Step 7 ja aborta antes — esta guarda eh defensiva
    throw new Error('stack.primary is null; Step 7 should have aborted earlier')
  }

  const folderName = `${dateSlug}-populate-harness`
  const folderRel = path.posix.join('docs', 'exec-plans', 'active', folderName)
  const folderAbs = path.join(opts.cwd, 'docs', 'exec-plans', 'active', folderName)

  await fs.mkdir(folderAbs, { recursive: true })

  // 1. PRD + CONTEXT (fixos por sessao)
  const prdContent = renderPopulateHarnessPRD({ dateSlug, stackPrimary, legacyArtifactsFound })
  const contextContent = renderPopulateHarnessContext({ dateSlug, stackPrimary, totalDocs: POPULATE_INSTRUCTIONS_BY_DOC.size })

  await fs.writeFile(path.join(folderAbs, 'PRD.md'), prdContent, 'utf-8')
  await fs.writeFile(path.join(folderAbs, 'CONTEXT.md'), contextContent, 'utf-8')

  // 2. 16 fases (1 por doc)
  const fasePlans: GeneratedFasePlan[] = []
  let i = 0
  for (const [dst, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
    i++
    const slug = docToSlug(dst)
    const faseNumber = i
    const faseFile = `fase-${String(faseNumber).padStart(2, '0')}-${slug}.md`
    const input = toFasePlanInput(dst, instr, stackPrimary)
    const content = renderFasePlan(input)
    const relPath = path.posix.join(folderRel, faseFile)
    const absPath = path.join(folderAbs, faseFile)
    await fs.writeFile(absPath, content, 'utf-8')
    fasePlans.push({ dst, slug, faseNumber, relPath, content })
  }

  // 3. PLAN.md (overview com lista das 16 fases, gerado apos as fases existirem)
  const planContent = renderPopulateHarnessPlanOverview(fasePlans, { dateSlug, stackPrimary })
  const planAbs = path.join(folderAbs, 'PLAN.md')
  await fs.writeFile(planAbs, planContent, 'utf-8')

  return {
    folderPath: folderRel,
    prdPath: path.posix.join(folderRel, 'PRD.md'),
    contextPath: path.posix.join(folderRel, 'CONTEXT.md'),
    planPath: path.posix.join(folderRel, 'PLAN.md'),
    fasePlans,
    stackPrimary,
    legacyArtifactsFound,
    docsSkipped: [],
  }
}
```

### Passo 3: Templates PRD / CONTEXT / PLAN overview

```typescript
// skills/init/lib/populate-harness-prd-template.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — PRD da pasta populate-harness.

export type PRDInput = {
  readonly dateSlug: string
  readonly stackPrimary: string
  readonly legacyArtifactsFound: number
}

export function renderPopulateHarnessPRD(input: PRDInput): string {
  return [
    '---',
    `slug: populate-harness`,
    `date: ${input.dateSlug}`,
    `status: ready`,
    '---',
    '',
    '# PRD: Populate Harness',
    '',
    '**Generated by:** /anti-vibe-coding:init (Step 7 — generate-populate-plans)',
    `**Stack detected:** ${input.stackPrimary}`,
    `**Legacy artifacts found:** ${input.legacyArtifactsFound}`,
    '',
    '## Problema',
    '',
    'O harness do Anti-Vibe Coding tem 16 documentos canonicos que precisam de',
    'conteudo real extraido deste repositorio. Sem essa etapa, os arquivos ficam',
    'como templates genericos e a LLM nao consegue dar conselho ancorado no projeto.',
    '',
    '## Outcome',
    '',
    'Os 16 docs canonicos populados com conteudo derivado do codigo real, validados',
    'por `bun run harness:validate`, com zero placeholders restantes.',
    '',
    '## Escopo',
    '',
    'Cada uma das 16 fases (`fase-NN-*.md`) trata de UM doc canonico. Sao paralelizaveis',
    'na Wave 1 (Discovery), mas a Wave 2 (Write sections) de cada fase respeita as',
    'dependencias declaradas em `dependsOn` da respectiva fase.',
    '',
    '## Referencia',
    '',
    '- ADR-0022 (`docs/design-docs/ADR-0022-faseplan-schema-andre-parity.md`)',
    '- Schema `FasePlanInput v1` em `skills/init/lib/render-fase-plan.ts`',
    '',
  ].join('\n')
}
```

```typescript
// skills/init/lib/populate-harness-context-template.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — CONTEXT da pasta populate-harness.

export type ContextInput = {
  readonly dateSlug: string
  readonly stackPrimary: string
  readonly totalDocs: number
}

export function renderPopulateHarnessContext(input: ContextInput): string {
  return [
    '---',
    `slug: populate-harness`,
    `date: ${input.dateSlug}`,
    `status: ready`,
    '---',
    '',
    '# Context: Populate Harness',
    '',
    '## Por que existe esta pasta',
    '',
    'O init scaffolda o harness com arquivos vazios/template. Esta sessao popula os',
    'documentos canonicos com conteudo derivado do codigo real do projeto.',
    '',
    '## Decisoes herdadas (ADR-0022)',
    '',
    '- Schema `FasePlanInput v1` adotado (10 H2 do Andre Prado + extensoes AVC)',
    '- Output hierarquico: PRD + CONTEXT + PLAN + 16 fase-NN-*.md (1 pasta)',
    '- Guidance interpretativa em `.md` per-doc em `skills/init/assets/populate-guidance/`',
    '- Final Report Contract hardcoded no renderer (NAO eh campo do input)',
    '',
    '## Stack',
    '',
    `Detected primary stack: **${input.stackPrimary}**.`,
    'Cada fase usa Wave 1 (Discovery) stack-aware. Wave 2 (Write sections) eh agnostica.',
    '',
    `## Total de fases: ${input.totalDocs}`,
    '',
    'Veja `PLAN.md` para o mapa completo das fases com dependencias e sizing.',
    '',
  ].join('\n')
}
```

```typescript
// skills/init/lib/populate-harness-plan-overview.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — PLAN overview da pasta populate-harness.

import type { GeneratedFasePlan } from './populate-plan-generator'

export type PlanOverviewInput = {
  readonly dateSlug: string
  readonly stackPrimary: string
}

export function renderPopulateHarnessPlanOverview(
  fasePlans: ReadonlyArray<GeneratedFasePlan>,
  input: PlanOverviewInput,
): string {
  const rows = fasePlans.map(f =>
    `| ${String(f.faseNumber).padStart(2, '0')} | [${f.dst}](./fase-${String(f.faseNumber).padStart(2, '0')}-${f.slug}.md) | populate |`
  ).join('\n')

  return [
    '---',
    `title: "Populate Harness — ${input.dateSlug}"`,
    `mode: full`,
    `status: active`,
    `created: ${input.dateSlug}`,
    '---',
    '',
    '# Exec Plan: Populate Harness',
    '',
    '**Stack:** ' + input.stackPrimary,
    `**Total fases:** ${fasePlans.length}`,
    '**Schema:** FasePlanInput v1 (ADR-0022)',
    '',
    '## Goal',
    '',
    'Popular os 16 documentos canonicos do harness com conteudo real do projeto.',
    '',
    '## Mapa de Fases',
    '',
    '| # | Doc-alvo | Acao |',
    '|---|----------|------|',
    rows,
    '',
    '## Como executar',
    '',
    'Cada `fase-NN-*.md` eh consumida pelo `/execute-plan`. Wave 1 (Discovery) eh',
    'paralelizavel. Wave 2 (Write sections) respeita `dependsOn` declarado em cada fase.',
    '',
    '## Validation Log',
    '',
    '<!-- preencher durante execucao -->',
    '',
    '## Compound Opportunity',
    '',
    '<!-- preencher ao /iterate -->',
    '',
    '## Lessons Captured',
    '',
    '<!-- preencher ao /iterate -->',
    '',
    '## Exit Criteria',
    '',
    '- [ ] `bun run harness:validate` passa para os 16 docs',
    '- [ ] Zero placeholders nos 16 docs canonicos',
    '- [ ] Cada doc tem links resolviveis (sem `TODO(<context needed>):` em produção)',
    '',
  ].join('\n')
}
```

### Passo 4: Teste de integracao com temp dir

```typescript
// skills/init/lib/populate-plan-generator.test.ts (substituir teste antigo)
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — teste integrado da hierarquia.

import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import { generatePopulatePlans } from './populate-plan-generator'

const FIXED_CLOCK = () => new Date('2026-05-21T12:00:00Z')

describe('generatePopulatePlans — hierarchy output (ADR-0022)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'populate-harness-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('creates ONE folder named {date}-populate-harness (not 16)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: { primary: 'node-ts', confidence: 'high', signals: [] },
      clock: FIXED_CLOCK,
    })

    expect(result.folderPath).toBe('docs/exec-plans/active/2026-05-21-populate-harness')
    const folderStat = await fs.stat(path.join(tmpDir, result.folderPath))
    expect(folderStat.isDirectory()).toBe(true)
  })

  test('folder contains PRD.md, CONTEXT.md, PLAN.md, and 16 fase-NN-*.md', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: { primary: 'node-ts', confidence: 'high', signals: [] },
      clock: FIXED_CLOCK,
    })

    const folderAbs = path.join(tmpDir, result.folderPath)
    const entries = await fs.readdir(folderAbs)

    expect(entries).toContain('PRD.md')
    expect(entries).toContain('CONTEXT.md')
    expect(entries).toContain('PLAN.md')

    const faseFiles = entries.filter(e => /^fase-\d{2}-.+\.md$/.test(e))
    expect(faseFiles.length).toBe(16)
  })

  test('each fase-NN-*.md uses FasePlanInput v1 (renders Final Report Contract)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: { primary: 'rails', confidence: 'high', signals: [] },
      clock: FIXED_CLOCK,
    })

    for (const fp of result.fasePlans) {
      const content = await fs.readFile(path.join(tmpDir, fp.relPath), 'utf-8')
      expect(content).toContain('## Final Report Contract')
      expect(content).toContain('## Goal')
      expect(content).toContain('## Execution Steps')
      expect(content).toContain('**Guidance file:**')
    }
  })

  test('regenerates idempotently (D10 NFR — sobrescreve)', async () => {
    await generatePopulatePlans({ cwd: tmpDir, stack: { primary: 'nextjs', confidence: 'high', signals: [] }, clock: FIXED_CLOCK })
    const second = await generatePopulatePlans({ cwd: tmpDir, stack: { primary: 'nextjs', confidence: 'high', signals: [] }, clock: FIXED_CLOCK })

    expect(second.fasePlans.length).toBe(16)
    // arquivos foram sobrescritos sem erro
  })

  test('completes in under 2s (NFR Performance)', async () => {
    const t0 = Date.now()
    await generatePopulatePlans({
      cwd: tmpDir,
      stack: { primary: 'node-ts', confidence: 'high', signals: [] },
      clock: FIXED_CLOCK,
    })
    const dt = Date.now() - t0
    expect(dt).toBeLessThan(2000)
  })
})
```

### Passo 5: Deletar o snippet obsoleto

```bash
rm skills/init/assets/snippets/populate-plan-template.md
```

Snippet ja estava marcado obsoleto desde 2026-05-19. Comentario apontava para `populate-plan-generator.ts` como substituto. Agora pode ir.

---

## Gotchas

- **G1 do plano:** `ABORT_MESSAGE_NO_STACK` em `07-generate-populate-plans.ts` ainda diz "16 populate plans". fase-02 atualiza wording.
- **G2 do plano:** `populate-plan-andre-parity.md` (golden) tambem precisa regenerar — coberto em fase-03.
- **Local:** `GenerateResult` antigo virou `GenerateResultV2` (campo `plans` → `fasePlans`, +`folderPath`/`prdPath`/`contextPath`/`planPath`). Step 7 le `result.fasePlans.length` (em vez de `result.plans.length`) — coberto em fase-02.
- **Local:** Test do clock injetado eh determinism — sem ele, gerar pasta com data de hoje impede snapshot tests futuros.
- **Local:** O snippet `populate-plan-template.md` em `assets/snippets/` ja era obsoleto desde 2026-05-19; deletar agora.
- **Local:** Final Report Contract de cada fase agora referencia o `validationCommand` literal — se valor em `populate-instructions-table.ts` mudar, mensagem do contrato muda. Decisao explicita (lazy interpolation).

---

## Verificacao

### TDD

- [ ] **RED:** rodar `bun test skills/init/lib/populate-plan-generator.test.ts` antes do refactor — falha (assertions sobre folderPath / 16 fase-NN-*.md nao batem com output atual de 16 PLAN.md soltos)
- [ ] **RED → GREEN:** apos refactor, `bun test` retorna `5 passed, 0 failed`
- [ ] **REFACTOR:** `bun run lint` e `bun run typecheck` limpos

### Checklist

- [ ] 1 pasta `{date}-populate-harness/` criada (NAO 16 pastas soltas)
- [ ] Pasta contem: PRD.md + CONTEXT.md + PLAN.md + 16 fase-NN-*.md
- [ ] Cada fase usa `renderFasePlan` (contem `## Final Report Contract`)
- [ ] Idempotencia preservada (sobrescreve sem erro em rerun)
- [ ] Performance < 2s no teste integrado
- [ ] `renderAndrePlan` antigo REMOVIDO de `populate-plan-generator.ts`
- [ ] `assets/snippets/populate-plan-template.md` DELETADO
- [ ] Step 7 ainda compila (signature de `GenerateResult` ajustada — fase-02 ajusta consumo)
- [ ] Testes passam: `bun test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-plan-generator.test.ts` retorna `5 passed, 0 failed`
- Em temp dir, `ls docs/exec-plans/active/2026-05-21-populate-harness/` lista exatamente 19 entradas (PRD, CONTEXT, PLAN, 16 fase-NN)
- Performance < 2s confirmado no test

**Por humano:**
- Diff visual de 1 `fase-NN-*.md` mostra as 10 H2 do Andre + Final Report Contract + blocos de extensoes (Guidance file / Detection signals / Must cover / etc)

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
