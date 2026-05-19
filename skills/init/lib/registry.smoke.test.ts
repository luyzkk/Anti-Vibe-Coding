// 2026-05-19 (Luiz/dev): Smoke test Tracer Bullet — Plano 01 fase-01.
// Verifica MH-01 / CA-07: Step 91 (generate-populate-plan) precede Step 90 (final-validation).
// Garantia minima de Bug C: PLAN.md e gerado ANTES do validator poder abortar.
import { describe, expect, test } from 'bun:test'
import { registry } from './registry'

describe('registry smoke (Tracer Bullet Plano 01 fase-01)', () => {
  test('PLAN.md generator runs before final validator (MH-01, CA-07)', () => {
    const ids = registry.map(s => s.id)
    const populateIdx = ids.indexOf('91-generate-populate-plan')
    const finalIdx = ids.indexOf('final-validation')
    expect(populateIdx).toBeGreaterThanOrEqual(0)
    expect(finalIdx).toBeGreaterThan(populateIdx)
  })

  test('final-validation is the last step (warning-mode container)', () => {
    expect(registry.at(-1)?.id).toBe('final-validation')
  })
})
