// skills/init/lib/steps/03-secrets-scan.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — stub test. Comportamento real testado em Plano 02.
// Cobre apenas contrato minimo do stub: retorna mutated=false e summary contem "stub".
import { describe, test, expect } from 'bun:test'
import { secretsScanStep } from './03-secrets-scan'

describe('secretsScanStep (stub)', () => {
  test('retorna mutated=false e summary com "stub"', async () => {
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const report = await secretsScanStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('stub')
  })

  test('id e secrets-scan', () => {
    expect(secretsScanStep.id).toBe('secrets-scan')
  })
})
