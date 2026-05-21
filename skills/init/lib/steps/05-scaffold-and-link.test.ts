// skills/init/lib/steps/05-scaffold-and-link.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — stub test. Comportamento real testado em Plano 03.
import { describe, test, expect } from 'bun:test'
import { scaffoldAndLinkStep } from './05-scaffold-and-link'

describe('scaffoldAndLinkStep (stub)', () => {
  test('retorna mutated=false e summary com "stub"', async () => {
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const report = await scaffoldAndLinkStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('stub')
  })

  test('id e scaffold-and-link', () => {
    expect(scaffoldAndLinkStep.id).toBe('scaffold-and-link')
  })
})
