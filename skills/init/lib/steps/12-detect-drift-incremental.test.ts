import { describe, it, expect } from 'bun:test'
import { detectDriftIncrementalStep } from './12-detect-drift-incremental'
import { registry } from '../registry'
import type { StepContext } from './types'

const mkCtx = (flags: Record<string, unknown> = {}, cwd = '/tmp/x'): StepContext => ({
  cwd, args: [], flags: flags as Record<string, boolean | string>,
})

describe('detectDriftIncrementalStep', () => {
  it('skips when mode is not already-initiated', async () => {
    const report = await detectDriftIncrementalStep.run(mkCtx({ '__initMode': 'greenfield' }))
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/skipped/)
  })

  it('skips when mode is undefined', async () => {
    const report = await detectDriftIncrementalStep.run(mkCtx())
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/skipped/)
  })

  it('has correct id', () => {
    expect(detectDriftIncrementalStep.id).toBe('12-detect-drift-incremental')
  })
})

describe('registry position', () => {
  it('detectDriftIncrementalStep is after moveDocsWithStubStep and before generatePopulatePlanStep', () => {
    const driftIdx = registry.findIndex((s) => s.id === '12-detect-drift-incremental')
    const moveIdx = registry.findIndex((s) => s.id === '11-move-docs-with-stub')
    const populateIdx = registry.findIndex((s) => s.id === '91-generate-populate-plan')
    expect(driftIdx).toBeGreaterThan(-1)
    expect(driftIdx).toBeGreaterThan(moveIdx)
    expect(driftIdx).toBeLessThan(populateIdx)
  })
})
