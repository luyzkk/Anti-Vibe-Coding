// skills/init/lib/steps/07-generate-populate-plans.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-04 — testes unit do Step 7 real.
// RED: falha contra stub do Plano 01 fase-04 (retorna {mutated:false, summary:'stub'}).
// GREEN: passa apos substituir stub por implementacao real.
// 2026-05-21 (Luiz/dev): Plano 02 fase-02 — testes reescritos para hierarquia (1 pasta, 16 fases).

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

// DI-Plano04-fase02-stackid-node-ts: StackId real e 'node-ts' (nao 'nodejs-typescript').
const NODE_STACK: DetectedStack = { primary: 'node-ts', confidence: 'high', stacks: [] } as unknown as DetectedStack
const RAILS_STACK: DetectedStack = { primary: 'rails', confidence: 'high', stacks: [] } as unknown as DetectedStack

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

  describe('greenfield gate (stack=null ou ausente)', () => {
    // 2026-05-28 (Luiz/dev): bug fix /init greenfield. Hard abort substituido por
    // contrato needsUser (PRD D3/CH-01). Testes legados que asseravam abort imediato
    // foram reescritos para refletir o novo fluxo: 1a invocacao retorna needsUser;
    // resposta 's' pula gracioso; resposta 'a' mantem AbortError historico.
    // ABORT_MESSAGE_NO_STACK e ABORT_CODE_NO_STACK preservados byte-identical.

    test('returns needsUser on first invocation when ctx.stack is undefined', async () => {
      const ctx = mkCtx(tmpDir) // no stack
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.needsUser).toBeDefined()
      expect(report.needsUser?.options).toEqual(['s', 'a'])
      expect(report.needsUser?.prompt).toContain(ABORT_MESSAGE_NO_STACK)
      expect(report.needsUser?.prompt).toContain('(s)kip')
      expect(report.needsUser?.prompt).toContain('(a)bort')
      expect(report.mutated).toBe(false)
    })

    test('returns needsUser on first invocation when ctx.stack.primary is null', async () => {
      const ctx = mkCtx(tmpDir, {
        stack: { primary: null, secondary: [], signalSource: 'no signal', anchorFiles: [] },
      })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.needsUser).toBeDefined()
      expect(report.mutated).toBe(false)
    })

    test('returns graceful skip when user answers "s"', async () => {
      const ctx = mkCtx(tmpDir, {
        flags: { __interactiveAnswer: 's' },
      })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.needsUser).toBeUndefined()
      expect(report.mutated).toBe(false)
      expect(report.summary).toContain('skipped')
      expect(report.summary).toContain('stack not detected')
    })

    test('throws AbortError code=20 when user answers "a"', async () => {
      const ctx = mkCtx(tmpDir, {
        flags: { __interactiveAnswer: 'a' },
      })
      try {
        await generatePopulatePlansStep.run(ctx)
        throw new Error('expected abort')
      } catch (err) {
        expect(err).toBeInstanceOf(AbortError)
        expect((err as AbortError).code).toBe(20)
        expect((err as AbortError).reason).toBe(ABORT_MESSAGE_NO_STACK)
      }
    })

    test('CI override: --skip-populate-plan flag skips without prompt', async () => {
      const ctx = mkCtx(tmpDir, {
        flags: { 'skip-populate-plan': true },
      })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.needsUser).toBeUndefined()
      expect(report.mutated).toBe(false)
      expect(report.summary).toContain('skipped')
    })

    test('answer case-insensitive: "S" treated as skip, "A" as abort', async () => {
      const ctxSkip = mkCtx(tmpDir, { flags: { __interactiveAnswer: 'S' } })
      const reportSkip = await generatePopulatePlansStep.run(ctxSkip)
      expect(reportSkip.mutated).toBe(false)
      expect(reportSkip.summary).toContain('skipped')

      const ctxAbort = mkCtx(tmpDir, { flags: { __interactiveAnswer: 'A' } })
      await expect(generatePopulatePlansStep.run(ctxAbort)).rejects.toBeInstanceOf(AbortError)
    })

    test('abort reason still matches DR-2 wording byte-identical', () => {
      expect(ABORT_MESSAGE_NO_STACK).toContain('detect-architecture')
      expect(ABORT_MESSAGE_NO_STACK).toContain('Detected primary: null')
      expect(ABORT_MESSAGE_NO_STACK).toContain('populate-harness fases')
    })

    test('ABORT_CODE_NO_STACK constant equals 20', () => {
      expect(ABORT_CODE_NO_STACK).toBe(20)
    })
  })

  describe('success path — node-ts stack', () => {
    test('returns mutated=true', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.mutated).toBe(true)
    })

    test('summary reflects single folder output (NOT 16 separate plans)', async () => {
      // 2026-05-21 (Luiz/dev): Plano 02 fase-02 — GT-Plano02-fase01-step07-regression-expected.
      // Hierarquia nova: 1 pasta com 16 fases dentro (nao 16 pastas separadas).
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.mutated).toBe(true)
      expect(report.summary).toContain('1 folder generated')
      expect(report.summary).toContain('16 fases')
      expect(report.summary).toContain('node-ts stack')
      expect(report.summary).toContain('docs/exec-plans/active/')
      expect(report.summary).toContain('populate-harness')
    })

    test('summary contains "node-ts stack"', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.summary).toContain('node-ts stack')
    })

    test('summary has 4 lines with correct order (NFR Observabilidade)', async () => {
      // 2026-05-21 (Luiz/dev): Plano 02 fase-02 — nova ordem: init-07, Folder, Legacy, Docs skipped.
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      const lines = report.summary.split('\n')
      expect(lines.length).toBe(4)
      expect(lines[0]).toMatch(/^init-07:/)
      expect(lines[1]).toMatch(/^Folder:/)
      expect(lines[2]).toMatch(/^Legacy artifacts found: \d+$/)
      expect(lines[3]).toMatch(/^Docs skipped:/)
    })

    test('writes 1 folder with 16 fase files to docs/exec-plans/active/', async () => {
      // 2026-05-21 (Luiz/dev): Plano 02 fase-02 — hierarquia: 1 pasta, nao 16 pastas separadas.
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      await generatePopulatePlansStep.run(ctx)
      const dir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
      const entries = await fs.readdir(dir)
      const populateDirs = entries.filter(e => e.includes('-populate-harness'))
      expect(populateDirs.length).toBe(1)
      const faseFiles = await fs.readdir(path.join(dir, populateDirs[0]!))
      const fasePlanFiles = faseFiles.filter(f => f.startsWith('fase-'))
      expect(fasePlanFiles.length).toBe(16)
    })

    test('ABORT_MESSAGE_NO_STACK no longer references "16 populate plans" (old wording)', () => {
      // 2026-05-21 (Luiz/dev): Plano 02 fase-02 — G1 trava: previne reintroducao do wording antigo.
      expect(ABORT_MESSAGE_NO_STACK).not.toContain('16 populate plans')
      expect(ABORT_MESSAGE_NO_STACK).toContain('populate-harness fases')
    })
  })

  describe('success path — rails stack', () => {
    test('summary mentions rails', async () => {
      const ctx = mkCtx(tmpDir, { stack: RAILS_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.summary).toContain('rails stack')
    })
  })

  describe('success path — legacy manifest present', () => {
    test('legacyArtifactsFound reflected in summary when manifest present with 1 artifact', async () => {
      const manifestDir = path.join(tmpDir, '.claude')
      await fs.mkdir(manifestDir, { recursive: true })
      await fs.writeFile(
        path.join(manifestDir, 'legacy-manifest.json'),
        JSON.stringify({
          schemaVersion: '1.0',
          detectedAt: '2026-05-21T10:00:00Z',
          stack: { primary: 'node-ts', confidence: 'high' },
          legacy: [
            { type: 'planning', found: true, sourcePath: '.claude/plans/', action: 'moved' },
          ],
        }),
      )
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.summary).toContain('Legacy artifacts found: 1')
    })
  })
})
