// skills/init/lib/steps/types.test.ts
import { describe, test, expect } from 'bun:test'
import type { Step, StepContext, StepReport } from './types'
import type { LegacyState } from '../detect-v5-legacy'
import type { DetectedStack } from '../detect-stack'

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

  // 2026-05-21 (Luiz/dev): Plano 01 fase-02 — smoke test para novos campos opcionais (DV-4).
  // Confirma que StepContext aceita legacy? e stack? sem quebrar o shape existente.
  test('StepContext accepts optional legacy and stack fields (Plano 01 fase-02, DV-4)', () => {
    const legacy: LegacyState = {
      isLegacy: false,
      alreadyMigrated: false,
      artifacts: [],
      paths: {},
    }
    const stack: DetectedStack = {
      primary: 'node-ts',
      secondary: [],
      signalSource: 'package.json#devDependencies.typescript',
      anchorFiles: ['package.json'],
    }
    const ctx: StepContext = { cwd: '/tmp', args: [], flags: {}, legacy, stack }
    expect(ctx.legacy?.isLegacy).toBe(false)
    expect(ctx.stack?.primary).toBe('node-ts')
  })

  test('StepContext remains valid without legacy and stack (backwards compat)', () => {
    const ctx: StepContext = { cwd: '/tmp', args: [], flags: {} }
    expect(ctx.legacy).toBeUndefined()
    expect(ctx.stack).toBeUndefined()
  })
})
