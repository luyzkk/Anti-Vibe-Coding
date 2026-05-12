// 2026-05-12 (Luiz/dev): CA-47/D33 — verifica que as 6 skills emitem completion signal
// Abordagem: skills com funcao TS invocavel → captura stdout via spy; skills markdown-only → verifica SKILL.md
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { makeTempV6, cleanup } from './helpers/v6-fixture-setup'
import { extractCompletionSignal } from '../skills/lib/completion-signal'
import * as lessonsLearned from '../skills/lessons-learned'
import * as decisionRegistry from '../skills/decision-registry'
import * as planFeature from '../skills/plan-feature'
import * as quickPlan from '../skills/quick-plan'
import * as executePlan from '../skills/execute-plan'
import * as iterate from '../skills/iterate'
import { promises as fs } from 'node:fs'
import path from 'node:path'

let projectRoot: string
beforeEach(async () => { projectRoot = await makeTempV6() })
afterEach(async () => { await cleanup(projectRoot) })

// Helper: captura console.log durante execucao de fn
// BUG-01: spyOn(process.stdout, 'write') nao intercepta console.log no Bun
// Solucao: spyOn(console, 'log') que funciona corretamente
async function captureConsoleLog(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = []
  const spy = spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    chunks.push(args.map(String).join(' '))
  })
  try {
    await fn()
  } finally {
    spy.mockRestore()
  }
  return chunks.join('\n')
}

describe('completion signal emission (CA-47)', () => {
  // === lessons-learned ===
  it('lessons-learned emits valid completion signal on add()', async () => {
    const output = await captureConsoleLog(async () => {
      await lessonsLearned.add('test lesson for signal', projectRoot)
    })
    const signal = extractCompletionSignal(output)
    expect(signal).not.toBeNull()
    expect(signal?.skill).toBe('lessons-learned')
    expect(signal?.status).toBe('complete')
    expect(signal?.outputs.length).toBeGreaterThan(0)
    expect(signal?.next_suggested).toBeNull()
  })

  // === decision-registry ===
  it('decision-registry emits valid completion signal on add()', async () => {
    const output = await captureConsoleLog(async () => {
      await decisionRegistry.add('use monorepo', projectRoot)
    })
    const signal = extractCompletionSignal(output)
    expect(signal).not.toBeNull()
    expect(signal?.skill).toBe('decision-registry')
    expect(signal?.status).toBe('complete')
    expect(signal?.outputs.length).toBeGreaterThan(0)
    expect(signal?.next_suggested).toBeNull()
  })

  // === plan-feature ===
  it('plan-feature emits valid completion signal on create()', async () => {
    const output = await captureConsoleLog(async () => {
      await planFeature.create('my feature', projectRoot)
    })
    const signal = extractCompletionSignal(output)
    expect(signal).not.toBeNull()
    expect(signal?.skill).toBe('plan-feature')
    expect(signal?.status).toBe('complete')
    expect(signal?.outputs.length).toBeGreaterThan(0)
    expect(signal?.next_suggested).toBe('/execute-plan')
  })

  // === quick-plan ===
  it('quick-plan emits valid completion signal on quickPlan()', async () => {
    const output = await captureConsoleLog(async () => {
      await quickPlan.quickPlan('small task', projectRoot)
    })
    const signal = extractCompletionSignal(output)
    expect(signal).not.toBeNull()
    expect(signal?.skill).toBe('quick-plan')
    expect(signal?.status).toBe('complete')
    expect(signal?.outputs.length).toBeGreaterThan(0)
    expect(signal?.next_suggested).toBe('/execute-plan')
  })

  // === execute-plan ===
  it('execute-plan emits valid completion signal when plan moves to completed', async () => {
    const p = await planFeature.create('to-complete', projectRoot)
    let body = await fs.readFile(p.filePath, 'utf-8')
    body = body.replace(
      /(## Exit Criteria\n\n)<!-- preencher -->/,
      '$1- [x] done'
    )
    await fs.writeFile(p.filePath, body, 'utf-8')

    const output = await captureConsoleLog(async () => {
      await executePlan.onPlanPotentiallyComplete(projectRoot, p.filePath)
    })
    const signal = extractCompletionSignal(output)
    expect(signal).not.toBeNull()
    expect(signal?.skill).toBe('execute-plan')
    expect(signal?.status).toBe('complete')
    expect(signal?.next_suggested).toBe('/iterate')
  })

  // === iterate ===
  it('iterate emits valid completion signal on iterate()', async () => {
    const mockPrompt = async (_planTitle: string) => ({
      choice: 'no_capture_needed' as const,
      noCaptureReason: 'test',
    })
    const output = await captureConsoleLog(async () => {
      await iterate.iterate(mockPrompt, projectRoot)
    })
    const signal = extractCompletionSignal(output)
    expect(signal).not.toBeNull()
    expect(signal?.skill).toBe('iterate')
    expect(signal?.status).toBe('complete')
  })

  // === SKILL.md checks ===
  it('all 6 SKILL.md files contain Completion Signal (D33) section', async () => {
    const skillsDir = path.resolve(import.meta.dir, '..', 'skills')
    const skills = ['lessons-learned', 'decision-registry', 'plan-feature', 'quick-plan', 'execute-plan', 'iterate']
    for (const skill of skills) {
      const skillMd = path.join(skillsDir, skill, 'SKILL.md')
      const content = await fs.readFile(skillMd, 'utf-8')
      expect(content).toContain('Completion Signal (D33)')
    }
  })
})
