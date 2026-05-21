// skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — stub test. Comportamento real testado em Plano 02.
import { describe, test, expect } from 'bun:test'
import { migratePlanningAndManifestStep } from './04-migrate-planning-and-manifest'

describe('migratePlanningAndManifestStep (stub)', () => {
  test('retorna mutated=false e summary com "stub"', async () => {
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const report = await migratePlanningAndManifestStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('stub')
  })

  test('id e migrate-planning-and-manifest', () => {
    expect(migratePlanningAndManifestStep.id).toBe('migrate-planning-and-manifest')
  })
})
