<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 04: Step 7 REAL + DR-2 abort + registry wire

**Plano:** 04 — Step 7 generate-populate-plans (CORE)
**Sizing:** 1.5h
**Depende de:** fase-03 (`generatePopulatePlans`, `GenerateResult`, `GenerateOpts`)
**Visual:** false

---

## O que esta fase entrega

Substitui o stub do Plano 01 fase-04 (`generatePopulatePlansStep`) por implementacao real
em `skills/init/lib/steps/07-generate-populate-plans.ts`. O step:
(1) le `ctx.stack` do StepContext,
(2) **aborta com `AbortError` code=20** se `ctx.stack` ausente ou `ctx.stack.primary === null` (**DR-2** — override do RF-11),
(3) invoca `generatePopulatePlans({ cwd: ctx.cwd, stack: ctx.stack })`,
(4) emite no `summary` multilinha as 4 metricas NFR Observabilidade (`plansGenerated`, `stackPrimary`, `legacyArtifactsFound`, `docsSkipped`),
(5) retorna `mutated: true`.

Em paralelo, `registry.ts` tem o import atualizado de stub para real.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/07-generate-populate-plans.ts` | Rewrite | DELETAR stub do Plano 01 fase-04; criar Step real (~50 linhas) invocando `generatePopulatePlans` + DR-2 abort + summary 4 metricas |
| `skills/init/lib/steps/07-generate-populate-plans.test.ts` | Create | Testes unit: (1) abort code=20 quando `ctx.stack` ausente; (2) abort code=20 quando `ctx.stack.primary === null`; (3) sucesso Node-TS: 16 plans + summary com 4 metricas; (4) sucesso Rails; (5) `mutated: true`; (6) wording exato da mensagem de abort (DI-Plano04-fase04-abort-message) |
| `skills/init/lib/registry.ts` | Modify | Substituir `import { generatePopulatePlansStep } from './steps/07-generate-populate-plans'` — sai stub, entra real. Sem mudanca de ordem (Step 7 ja na posicao certa do Plano 01 fase-04) |
| `skills/init/lib/registry.test.ts` | Modify | Atualizar teste de smoke do registry: Step 7 com id `'generate-populate-plans'` na posicao 7 (sem mudancas estruturais — apenas confirmar que o import real nao quebra o smoke test) |

---

## Implementacao

### Passo 1: Sobrescrever stub do Plano 01 fase-04 com Step real

```typescript
// skills/init/lib/steps/07-generate-populate-plans.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-04 — substitui stub do Plano 01 fase-04.
// Step 7 do pipeline v7 (DV-1 + DV-3 deram +2 steps, este e o "Step 5" do PRD).
//
// Contratos:
//   - input: ctx.stack populado pelo Step 2 (Plano 01 fase-02). DV-4: opcional no Plano 01,
//     obrigatorio aqui — DR-2 aborta se ausente.
//   - output: 16 PLAN.md em docs/exec-plans/active/{date}-populate-{slug}/PLAN.md.
//   - abort: AbortError code=20 com mensagem DI-Plano04-fase04-abort-message se stack=null.
//
// G5 do Plano 04 README: DR-2 override do RF-11. RF-11 dizia "copy-knowledge pula gracioso"
// — Step 7 e diferente: sem stack, Waves nao tem como ser path-resolved. Aborta hard.

import type { Step } from './types'
import { AbortError } from './abort-error'
import { generatePopulatePlans } from '../populate-plan-generator'

export const STEP_ID = 'generate-populate-plans' as const
export const ABORT_CODE_NO_STACK = 20 as const

/**
 * Mensagem literal do abort DR-2. Wording-stable — teste de fase-04 valida bytes exatos.
 * Mudar = mudar teste de proposito.
 */
export const ABORT_MESSAGE_NO_STACK =
  'Stack not detected — run /anti-vibe-coding:detect-architecture before /init.\n' +
  'Detected primary: null.\n' +
  'Waves in 16 populate plans cannot be path-resolved without stack.'

export const generatePopulatePlansStep: Step = {
  id: STEP_ID,
  async run(ctx) {
    // DR-2 (G5 do Plano 04 README): aborta se stack ausente ou primary=null.
    if (!ctx.stack || ctx.stack.primary === null) {
      throw new AbortError({
        code: ABORT_CODE_NO_STACK,
        reason: ABORT_MESSAGE_NO_STACK,
      })
    }

    const result = await generatePopulatePlans({
      cwd: ctx.cwd,
      stack: ctx.stack,
    })

    // NFR Observabilidade — 4 metricas no summary multilinha (DI-Plano04-fase04-summary-format).
    const summary = [
      `init-07: ${result.plans.length} plans generated (${result.stackPrimary ?? 'unknown'} stack)`,
      `Legacy artifacts found: ${result.legacyArtifactsFound}`,
      `Docs skipped: ${result.docsSkipped.length} (${result.docsSkipped.join(', ') || 'none excluded'})`,
      `Output: docs/exec-plans/active/*-populate-*/`,
    ].join('\n')

    return {
      mutated: true,
      summary,
    }
  },
}
```

> **Nota sobre o tipo `ctx.stack`:** Plano 01 fase-02 estende `StepContext` com
> `legacy?: LegacyDetectionResult` e `stack?: DetectedStack`. O `ctx.stack` deste step
> e do tipo `DetectedStack | undefined`. O guard `!ctx.stack || ctx.stack.primary === null`
> cobre os 3 casos invalidos (undefined, null primary, primary=undefined).

### Passo 2: Testes unit do Step

```typescript
// skills/init/lib/steps/07-generate-populate-plans.test.ts
import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  generatePopulatePlansStep,
  STEP_ID,
  ABORT_CODE_NO_STACK,
  ABORT_MESSAGE_NO_STACK,
} from './07-generate-populate-plans'
import { AbortError } from './abort-error'
import type { DetectedStack } from '../detect-stack'
import type { StepContext } from './types'

const NODE_STACK: DetectedStack = { primary: 'nodejs-typescript', confidence: 'high', stacks: [] } as DetectedStack
const RAILS_STACK: DetectedStack = { primary: 'rails', confidence: 'high', stacks: [] } as DetectedStack

function mkCtx(cwd: string, overrides: Partial<StepContext> = {}): StepContext {
  return { cwd, args: [], flags: {}, ...overrides } as StepContext
}

describe('generatePopulatePlansStep (Step 7)', () => {
  let tmpDir: string
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-plano04-step07-'))
  })
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('id is "generate-populate-plans"', () => {
    expect(generatePopulatePlansStep.id).toBe('generate-populate-plans')
    expect(STEP_ID).toBe('generate-populate-plans')
  })

  describe('DR-2 abort (stack=null)', () => {
    test('throws AbortError code=20 when ctx.stack is undefined', async () => {
      const ctx = mkCtx(tmpDir) // no stack
      await expect(generatePopulatePlansStep.run(ctx)).rejects.toMatchObject({
        name: 'AbortError',
        code: ABORT_CODE_NO_STACK,
      })
    })

    test('throws AbortError code=20 when ctx.stack.primary is null', async () => {
      const ctx = mkCtx(tmpDir, {
        stack: { primary: null, confidence: 'low', stacks: [] } as DetectedStack,
      } as Partial<StepContext>)
      try {
        await generatePopulatePlansStep.run(ctx)
        throw new Error('expected abort')
      } catch (err) {
        expect(err).toBeInstanceOf(AbortError)
        expect((err as AbortError).code).toBe(20)
      }
    })

    test('abort reason matches DI-Plano04-fase04-abort-message exactly', async () => {
      const ctx = mkCtx(tmpDir)
      try {
        await generatePopulatePlansStep.run(ctx)
        throw new Error('expected abort')
      } catch (err) {
        expect((err as AbortError).reason).toBe(ABORT_MESSAGE_NO_STACK)
        expect((err as AbortError).reason).toContain('detect-architecture')
        expect((err as AbortError).reason).toContain('Detected primary: null')
      }
    })
  })

  describe('success path', () => {
    test('Node-TS stack: returns mutated=true with 16 plans in summary', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK } as Partial<StepContext>)
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.mutated).toBe(true)
      expect(report.summary).toContain('16 plans generated')
      expect(report.summary).toContain('nodejs-typescript stack')
    })

    test('summary has 4 lines (NFR Observabilidade)', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK } as Partial<StepContext>)
      const report = await generatePopulatePlansStep.run(ctx)
      const lines = report.summary.split('\n')
      expect(lines.length).toBe(4)
      expect(lines[0]).toMatch(/^init-07:/)
      expect(lines[1]).toMatch(/^Legacy artifacts found: \d+$/)
      expect(lines[2]).toMatch(/^Docs skipped:/)
      expect(lines[3]).toMatch(/^Output:/)
    })

    test('Rails stack: summary mentions rails', async () => {
      const ctx = mkCtx(tmpDir, { stack: RAILS_STACK } as Partial<StepContext>)
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.summary).toContain('rails stack')
    })

    test('legacyArtifactsFound reflected in summary when manifest present', async () => {
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
          ],
        }),
      )
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK } as Partial<StepContext>)
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.summary).toContain('Legacy artifacts found: 1')
    })

    test('writes 16 PLAN.md files to docs/exec-plans/active/', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK } as Partial<StepContext>)
      await generatePopulatePlansStep.run(ctx)
      const dir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
      const entries = await fs.readdir(dir)
      const populateDirs = entries.filter(e => e.includes('-populate-'))
      expect(populateDirs.length).toBe(16)
    })
  })
})
```

### Passo 3: Atualizar `registry.ts` (stub → real)

O Plano 01 fase-04 ja registrou um stub no slot 7. Aqui apenas substituimos o import.
**Cuidado:** Plano 01 fase-04 pode ter usado um nome de variavel diferente para o stub.
Verificar antes via grep — provavel `generatePopulatePlansStubStep` ou similar.

```typescript
// skills/init/lib/registry.ts (diff ilustrativo — Plano 01 fase-04 e a fonte real)

// ANTES (stub):
// import { generatePopulatePlansStep } from './steps/07-generate-populate-plans' // STUB

// DEPOIS (real):
import { generatePopulatePlansStep } from './steps/07-generate-populate-plans'

// Sem mudanca no array — Step 7 ja esta na posicao 7 (entre install-gh-files e delivery-loop):
export const registry: readonly Step[] = [
  // ... 1..6 ...
  generatePopulatePlansStep, // 2026-05-21 (Luiz/dev): Plano 04 fase-04 — REAL (substitui stub do Plano 01 fase-04).
  // ... 8..10 ...
]
```

### Passo 4: Verificar registry.test.ts ainda passa

```bash
bun test skills/init/lib/registry.test.ts
```

Se Plano 01 fase-04 escreveu o teste corretamente, o id `'generate-populate-plans'` ja esta
asserted na posicao 7 — wire de stub para real nao deve quebrar nada.

---

## Gotchas

- **G5 do plano (DR-2 wording-stable):** o teste `abort reason matches ... exactly` valida
  string literal. Se a mensagem precisar mudar (typo, etc), atualizar tanto a constante
  `ABORT_MESSAGE_NO_STACK` quanto o teste no mesmo PR.

- **G12 do plano (test.skip nao aplica):** este plano cria testes NOVOS. Plano 01 fase-05 ja
  removeu testes obsoletos do registry — aqui apenas adicionamos testes do step real.

- **Local — code=20 e novo:** codes 10 (reentry-gate, Plano 01) e 11 (detect-legacy outro)
  ja usados. Code 20 reservado para "stack-required-but-absent". Documentar em comentario
  do `abort-error.ts` se necessario (opcional — fase-04 nao toca esse arquivo).

- **Local — `ctx.stack` opcional ate Plano 05:** DV-4 mantem `StepContext.stack?` como
  opcional ate Plano 05 endurecer. O guard `!ctx.stack || ctx.stack.primary === null` cobre
  ambos os casos.

- **Local — `runInit([])` precisa do Step 2 ter rodado:** em e2e (fase-05), Step 7 esta no
  pipeline apos Step 2 (detect-legacy-and-stack). Em unit tests aqui, mockamos `ctx.stack`
  diretamente — nao chamamos `runInit`. fase-05 cobre o caminho integrado.

- **Local — import path para `generatePopulatePlans`:** desde `steps/07-generate-populate-plans.ts`
  e `../populate-plan-generator` (sobe 1 nivel pra `lib/`).

---

## Verificacao

### TDD

- [ ] **RED:** `bun test 07-generate-populate-plans.test.ts -t "throws AbortError code=20"` falha
  porque step ainda nao tem guard (stub do Plano 01 fase-04 retornava `{mutated: false, summary: 'stub'}`
  sem checar stack)
- [ ] **GREEN:** apos implementar Passo 1, todos os ~9 testes passam
  - Comando: `bun test 07-generate-populate-plans.test.ts`
  - Resultado esperado: `9 passed, 0 failed`

### Checklist

- [ ] `bun test 07-generate-populate-plans.test.ts` retorna 0 falhas
- [ ] `bun test registry.test.ts` continua verde apos wire (Plano 01 fase-04 quebra protege)
- [ ] `bun test populate-plan-generator.test.ts` continua verde (fase-01 + fase-03)
- [ ] `bun test populate-instructions-table.test.ts` continua verde (fase-02)
- [ ] `grep -rn "ABORT_CODE_NO_STACK\|code: 20" skills/init/lib/steps/07-*.ts` retorna 2+ matches (constante + uso)
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test 07-generate-populate-plans.test.ts` retorna `9 passed, 0 failed`
- `bun test registry.test.ts` retorna 0 falhas
- `bun test populate-plan-generator.test.ts populate-instructions-table.test.ts` retorna 0 falhas
- Verificacao do registry: `bun -e "import('./skills/init/lib/registry.ts').then(m => console.log(m.registry[6].id))"` imprime `generate-populate-plans` (posicao 7 = index 6, zero-based)

**Por humano:**
- Inspecao do `summary` retornado em fixture Node: 4 linhas, formato claro, paths corretos.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
