// skills/init/lib/steps/07-generate-populate-plans.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — stub test. Comportamento real testado em Plano 04 (CORE).
import { describe, test, expect } from 'bun:test'
import { generatePopulatePlansStep } from './07-generate-populate-plans'

describe('generatePopulatePlansStep (stub)', () => {
  test('retorna mutated=false e summary com "stub"', async () => {
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const report = await generatePopulatePlansStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('stub')
  })

  test('id e generate-populate-plans', () => {
    expect(generatePopulatePlansStep.id).toBe('generate-populate-plans')
  })
})
