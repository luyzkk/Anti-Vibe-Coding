// skills/init/lib/registry.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — testes do registry v7 (10 steps, ordem D12 revisada).
// Substitui testes v6.7 (fases 02-05 do plano anterior). RED: falha porque registry ainda tem 21 entries.
import { describe, test, expect } from 'bun:test'
import { registry } from './registry'

describe('registry v7 (Plano 01 fase-04)', () => {
  test('exatamente 10 steps (D12 revisada por DV-1 + DV-3)', () => {
    expect(registry.length).toBe(10)
  })

  test('ids batem com ordem D12 revisada', () => {
    const ids = registry.map(s => s.id)
    expect(ids).toEqual([
      'reentry-gate',
      'detect-legacy-and-stack',
      '03-secrets-scan',
      'migrate-planning-and-manifest',
      'scaffold-and-link',
      'install-gh-files',
      'generate-populate-plans',
      'delivery-loop',
      'copy-knowledge',
      'final-validation',
    ])
  })

  test('Steps 1-4 sao reais; Steps 5-10 sao stubs (summary contem "stub")', async () => {
    // Steps reais (indices 0-3): summary nao tem palavra "stub"
    // Stubs (indices 4-9): summary contem "stub"
    for (let i = 4; i < 10; i++) {
      const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
      const report = await registry[i]!.run(ctx)
      expect(report.summary).toContain('stub')
      expect(report.mutated).toBe(false)
    }
  })
})
