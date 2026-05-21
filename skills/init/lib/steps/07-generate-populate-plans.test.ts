// skills/init/lib/steps/07-generate-populate-plans.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-04 — testes unit do Step 7 real.
// RED: falha contra stub do Plano 01 fase-04 (retorna {mutated:false, summary:'stub'}).
// GREEN: passa apos substituir stub por implementacao real.

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

  describe('DR-2 abort (stack=null ou ausente)', () => {
    test('throws AbortError code=20 when ctx.stack is undefined', async () => {
      const ctx = mkCtx(tmpDir) // no stack
      await expect(generatePopulatePlansStep.run(ctx)).rejects.toMatchObject({
        name: 'AbortError',
        code: ABORT_CODE_NO_STACK,
      })
    })

    test('throws AbortError code=20 when ctx.stack.primary is null', async () => {
      const ctx = mkCtx(tmpDir, {
        stack: { primary: null, confidence: 'low', stacks: [] } as unknown as DetectedStack,
      })
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

    test('summary contains "16 plans generated"', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.summary).toContain('16 plans generated')
    })

    test('summary contains "node-ts stack"', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      expect(report.summary).toContain('node-ts stack')
    })

    test('summary has 4 lines (NFR Observabilidade)', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      const report = await generatePopulatePlansStep.run(ctx)
      const lines = report.summary.split('\n')
      expect(lines.length).toBe(4)
      expect(lines[0]).toMatch(/^init-07:/)
      expect(lines[1]).toMatch(/^Legacy artifacts found: \d+$/)
      expect(lines[2]).toMatch(/^Docs skipped:/)
      expect(lines[3]).toMatch(/^Output:/)
    })

    test('writes 16 PLAN.md files to docs/exec-plans/active/', async () => {
      const ctx = mkCtx(tmpDir, { stack: NODE_STACK })
      await generatePopulatePlansStep.run(ctx)
      const dir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
      const entries = await fs.readdir(dir)
      const populateDirs = entries.filter(e => e.includes('-populate-'))
      expect(populateDirs.length).toBe(16)
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
