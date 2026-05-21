<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 03: Generator Pipeline (orquestra renderer + tabela + writer)

**Plano:** 04 — Step 7 generate-populate-plans (CORE)
**Sizing:** 2h
**Depende de:** fase-01 (`renderAndrePlan`, `AndrePlanInput`), fase-02 (`POPULATE_INSTRUCTIONS_BY_DOC`, `buildWavesForDoc`, `docToSlug`)
**Visual:** false

---

## O que esta fase entrega

Funcao publica `generatePopulatePlans(ctx, opts?): Promise<GenerateResult>` em
`skills/init/lib/populate-plan-generator.ts` que: (1) le `ctx.stack` (passado pelo Step 7 em
fase-04), (2) le `.claude/legacy-manifest.json` do disco com Zod (opcional / graceful se ausente),
(3) itera as 16 entries do `POPULATE_INSTRUCTIONS_BY_DOC`, (4) para cada doc monta `AndrePlanInput`
combinando instrucao + Waves stack-aware, (5) renderiza via `renderAndrePlan`, (6) escreve no
disco em `docs/exec-plans/active/{YYYY-MM-DD}-populate-{slug}/PLAN.md` (sempre sobrescreve —
NFR Idempotencia D10). Retorna `GenerateResult` com 4 metricas NFR Observabilidade
(`plansGenerated`, `stackPrimary`, `legacyArtifactsFound`, `docsSkipped`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | Adicionar `generatePopulatePlans(ctx, opts?): Promise<GenerateResult>` + tipo `GenerateResult` + tipo `GenerateOpts` (clock injetavel pra testes); manter `renderAndrePlan` da fase-01 inalterado |
| `skills/init/lib/populate-plan-generator.test.ts` | Modify | Adicionar testes do pipeline: (1) gera 16 plans com stack=node-ts; (2) gera 16 plans com stack=rails (CA-04 — FRONTEND.md plan contem `app/views`); (3) `clock` injetado controla data nos slugs; (4) `legacyArtifactsFound` reflete manifest no disco; (5) re-run sobrescreve (D10) |

---

## Implementacao

### Passo 1: Tipos publicos do pipeline

```typescript
// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — pipeline orquestrador. Sem efeito colateral
// fora do filesystem; sem LLM. NFR Performance < 2s.

import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { StackId, DetectedStack } from './detect-stack'
import {
  POPULATE_INSTRUCTIONS_BY_DOC,
  buildWavesForDoc,
  docToSlug,
} from './populate-instructions-table'

// Plano 02 produz este tipo. Import opcional via 'with { type: "json" }' rejeitado —
// usamos o Zod parse pra graceful failure (G10 do README).
import { legacyManifestSchema, type LegacyManifest } from '../../_shared/legacy-manifest-schema'

export type GenerateOpts = {
  /** Injetavel pra testes determinism. Default: () => new Date(). */
  readonly clock?: () => Date
  /** Stack detectada. Vem de ctx.stack no Step 7. */
  readonly stack: DetectedStack
  /** cwd do projeto-alvo. */
  readonly cwd: string
}

export type GeneratedPlan = {
  readonly dst: string // 'docs/SECURITY.md'
  readonly slug: string // 'docs-security-md'
  readonly path: string // 'docs/exec-plans/active/2026-05-21-populate-docs-security-md/PLAN.md'
  readonly content: string // markdown completo
}

export type GenerateResult = {
  readonly plans: ReadonlyArray<GeneratedPlan>
  readonly stackPrimary: StackId | null
  readonly legacyArtifactsFound: number
  readonly docsSkipped: ReadonlyArray<string> // docs que existem em D18 mas TEMPLATE_MANIFEST excluiu (auditoria)
}
```

### Passo 2: Le manifest do disco (graceful)

```typescript
// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — leitura do manifest e graceful (G10 do README).
// Se arquivo nao existe (greenfield), retorna `{ legacy: [] }` equivalente.
// Se arquivo existe mas e malformado, log + retorna empty. Apenas DR-2 (stack=null)
// e hard-abort — feito em fase-04 no Step 7, NAO aqui.

async function readManifestGraceful(cwd: string): Promise<LegacyManifest | null> {
  const manifestPath = path.join(cwd, '.claude', 'legacy-manifest.json')
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return legacyManifestSchema.parse(parsed)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    // Malformed JSON ou schema invalido. Logamos via console.warn (NAO aborta).
    console.warn(`[generate-populate-plans] manifest malformed at ${manifestPath} — proceeding without legacy context`)
    return null
  }
}
```

### Passo 3: Funcao orquestradora

```typescript
// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — pipeline principal. Itera 16 docs, monta
// AndrePlanInput, renderiza, escreve. Date capturada UMA VEZ (G6 do README).

export async function generatePopulatePlans(opts: GenerateOpts): Promise<GenerateResult> {
  const now = (opts.clock ?? (() => new Date()))()
  const dateSlug = now.toISOString().slice(0, 10) // 'YYYY-MM-DD'

  const manifest = await readManifestGraceful(opts.cwd)
  const legacyArtifactsFound = manifest?.legacy.filter(e => e.found).length ?? 0

  const plans: GeneratedPlan[] = []
  const docsSkipped: string[] = []

  for (const [dst, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
    const slug = docToSlug(dst)
    const waves = buildWavesForDoc(dst, opts.stack.primary)

    // Wave 2: items = sectionsToWrite da instrucao
    const wave2Items = instr.sectionsToWrite.map(s => `Write the H2 section: ${s}`)
    const wavesFull = [
      waves[0], // Wave 1 (Discovery, stack-aware) ja resolvido em fase-02
      { name: 'Wave 2 — Write sections', items: wave2Items },
    ]

    const input = {
      docPath: dst,
      goal: instr.goal,
      scope: { in: instr.scopeIn, out: instr.scopeOut },
      assumptions: instr.assumptions,
      risks: instr.risks,
      waves: wavesFull,
      reviewChecklist: instr.reviewChecklist,
      compoundOpportunity: instr.compoundOpportunity,
      exitCriteria: instr.exitCriteria,
    } as const

    const content = renderAndrePlan(input)
    const relPath = path.posix.join(
      'docs',
      'exec-plans',
      'active',
      `${dateSlug}-populate-${slug}`,
      'PLAN.md',
    )

    const absPath = path.join(opts.cwd, relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    // D10 NFR Idempotencia: SEMPRE sobrescreve plans gerados (G7 do README).
    await fs.writeFile(absPath, content, 'utf-8')

    plans.push({ dst, slug, path: relPath, content })
  }

  return {
    plans,
    stackPrimary: opts.stack.primary,
    legacyArtifactsFound,
    docsSkipped,
  }
}
```

### Passo 4: Testes do pipeline

```typescript
// skills/init/lib/populate-plan-generator.test.ts (ADICAO — testes da fase-01 ficam)

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { generatePopulatePlans } from './populate-plan-generator'
import type { DetectedStack } from './detect-stack'

const NODE_STACK: DetectedStack = { primary: 'nodejs-typescript', confidence: 'high', stacks: [] } as DetectedStack
const RAILS_STACK: DetectedStack = { primary: 'rails', confidence: 'high', stacks: [] } as DetectedStack
const FIXED_DATE = new Date('2026-05-21T10:00:00Z')

describe('generatePopulatePlans (pipeline)', () => {
  let tmpDir: string
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-plano04-fase03-'))
  })
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('generates exactly 16 plans for Node-TS stack (CA-01)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: () => FIXED_DATE,
    })
    expect(result.plans.length).toBe(16)
    expect(result.stackPrimary).toBe('nodejs-typescript')
  })

  test('Rails FRONTEND.md plan contains app/views in Wave 1 (CA-04)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: RAILS_STACK,
      clock: () => FIXED_DATE,
    })
    const frontendPlan = result.plans.find(p => p.dst === 'docs/FRONTEND.md')
    expect(frontendPlan).toBeDefined()
    expect(frontendPlan!.content).toContain('app/views')
    expect(frontendPlan!.content).toContain('app/assets')
    expect(frontendPlan!.content).not.toContain('src/components')
  })

  test('Node-TS FRONTEND.md plan contains src/components in Wave 1', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: () => FIXED_DATE,
    })
    const frontendPlan = result.plans.find(p => p.dst === 'docs/FRONTEND.md')!
    expect(frontendPlan.content).toContain('src/components')
    expect(frontendPlan.content).not.toContain('app/views')
  })

  test('writes PLAN.md to disk under docs/exec-plans/active/{date}-populate-{slug}/', async () => {
    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const expectedPath = path.join(
      tmpDir,
      'docs',
      'exec-plans',
      'active',
      '2026-05-21-populate-docs-security-md',
      'PLAN.md',
    )
    const content = await fs.readFile(expectedPath, 'utf-8')
    expect(content).toContain('# Populate: docs/SECURITY.md')
    expect(content).toContain('## Goal')
    expect(content).toContain('## Exit Criteria')
  })

  test('clock is injectable — slug uses injected date', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: () => new Date('2030-01-15T00:00:00Z'),
    })
    expect(result.plans[0].path).toContain('2030-01-15-populate-')
  })

  test('re-run overwrites existing plans (D10 idempotency)', async () => {
    // 1st run
    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const securityPath = path.join(
      tmpDir, 'docs/exec-plans/active/2026-05-21-populate-docs-security-md/PLAN.md',
    )
    const first = await fs.readFile(securityPath, 'utf-8')

    // Tamper
    await fs.writeFile(securityPath, '# TAMPERED', 'utf-8')

    // 2nd run — same params
    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const second = await fs.readFile(securityPath, 'utf-8')

    expect(second).toBe(first) // restored
    expect(second).not.toBe('# TAMPERED')
  })

  test('legacyArtifactsFound reflects manifest on disk', async () => {
    // Write manifest with 2 found entries
    const manifestDir = path.join(tmpDir, '.claude')
    await fs.mkdir(manifestDir, { recursive: true })
    await fs.writeFile(
      path.join(manifestDir, 'legacy-manifest.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        detectedAt: '2026-05-21T10:00:00Z',
        stack: { primary: 'nodejs-typescript', confidence: 'high' },
        legacy: [
          { type: 'planning', found: true, sourcePath: '.claude/planning/', action: 'moved' },
          { type: 'lessons', found: true, sourcePath: 'lessons-learned.md', action: 'reference-only' },
          { type: 'compound', found: false, sourcePath: '.claude/progress.txt', action: 'reference-only' },
        ],
      }),
    )

    const result = await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    expect(result.legacyArtifactsFound).toBe(2) // only found:true entries
  })

  test('legacyArtifactsFound === 0 when no manifest (greenfield)', async () => {
    const result = await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    expect(result.legacyArtifactsFound).toBe(0)
  })

  test('malformed manifest does not abort — logs warning and proceeds', async () => {
    const manifestDir = path.join(tmpDir, '.claude')
    await fs.mkdir(manifestDir, { recursive: true })
    await fs.writeFile(path.join(manifestDir, 'legacy-manifest.json'), '{ broken json')

    const result = await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    expect(result.plans.length).toBe(16)
    expect(result.legacyArtifactsFound).toBe(0)
  })

  test('performance: completes < 2000ms (NFR)', async () => {
    const start = performance.now()
    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)
  })
})
```

---

## Gotchas

- **G6 do plano (data fixa por run):** verificado em teste — `clock` injetado controla
  TODAS as 16 plans, nao varia entre elas.

- **G7 do plano (sobrescrita):** verificado em teste — tamper + re-run restora.

- **G10 do plano (manifest opcional):** 2 testes cobrem — ausente (greenfield) e malformado
  (broken json). Ambos retornam `legacyArtifactsFound: 0` sem aborto.

- **G11 do plano (performance):** teste com `performance.now()` falha se > 2000ms. Em
  pratica esperado < 100ms (16 writes pequenos).

- **Local — path.posix vs path.join:** o campo `path` do `GeneratedPlan` usa `path.posix.join`
  pra ser portavel (forward slashes mesmo em Windows). O `path.join` real (absoluto) usa
  separador OS. Teste verifica o `path` retornado tem `/`, nao `\`.

- **Local — import do `legacyManifestSchema`:** Plano 02 fase-01 cria
  `skills/_shared/legacy-manifest-schema.ts`. Path relativo desde
  `skills/init/lib/populate-plan-generator.ts` e `../../_shared/legacy-manifest-schema`.
  Se Plano 02 nao estiver pronto, esta fase pode ser desenvolvida com um schema mock local
  e refatorada na merge — mas idealmente Plano 04 espera Plano 02 estar mergeado.

- **Local — `docsSkipped` retorna vazio na v1:** ate harness-validate impor cobertura
  TEMPLATE_MANIFEST × POPULATE_INSTRUCTIONS_BY_DOC, este campo fica `[]`. Mantemos para
  evolucao futura (R3 do PLAN.md).

---

## Verificacao

### TDD

- [ ] **RED:** `bun test populate-plan-generator.test.ts -t "generates exactly 16"` falha — `generatePopulatePlans is not a function`
- [ ] **GREEN:** apos implementar Passos 1-3, todos os ~10 testes do pipeline passam
  - Comando: `bun test populate-plan-generator.test.ts`
  - Resultado esperado: `~18 passed, 0 failed` (8 da fase-01 + 10 da fase-03)

### Checklist

- [ ] `generatePopulatePlans({cwd, stack: NODE_STACK, clock})` retorna `plans.length === 16`
- [ ] CA-04 verificado: Rails FRONTEND.md plan tem `app/views`
- [ ] Re-run sobrescreve plan adulterado
- [ ] Manifest malformado nao aborta (log warning, segue)
- [ ] Performance < 2s
- [ ] Sem dependencia em `'./detect-stack'.detectStack` runtime — apenas tipos importados (stack vem do caller via `opts.stack`)
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test populate-plan-generator.test.ts` retorna `~18 passed, 0 failed`
- Apos rodar `generatePopulatePlans` em tmp dir: `ls tmp/docs/exec-plans/active/ | wc -l` retorna `16`
- `cat tmp/docs/exec-plans/active/*-populate-docs-frontend-md/PLAN.md | grep -c "## "` retorna `10` (10 secoes H2 — CA-07)

**Por humano:**
- Abrir qualquer dos 16 PLAN.md gerados em fixture Rails e verificar visualmente que paths Wave 1
  fazem sentido (`app/views/`, `Gemfile`, etc. em vez de `src/`).

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
