// skills/init/lib/steps/types.test.ts
import { describe, test, expect } from 'bun:test'
import type { Step, StepContext, StepReport } from './types'

describe('Step contract', () => {
  test('accepts a minimal implementation', async () => {
    // 2026-05-17 (Luiz/dev): mock minimo — fixa o shape esperado por Planos 02/03.
    const noop: Step = {
      id: 'test-noop',
      async run(_ctx: StepContext): Promise<StepReport> {
        return { mutated: false, summary: 'noop' }
      },
    }
    const result = await noop.run({ cwd: '/tmp', args: [], flags: {} })
    expect(result).toEqual({ mutated: false, summary: 'noop' })
  })

  test('id is a stable string identifier', () => {
    const s: Step = { id: 'detect-legacy', run: async () => ({ mutated: false, summary: '' }) }
    expect(typeof s.id).toBe('string')
    expect(s.id.length).toBeGreaterThan(0)
  })
})
