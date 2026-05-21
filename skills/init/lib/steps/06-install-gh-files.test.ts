// skills/init/lib/steps/06-install-gh-files.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — stub test. Comportamento real testado em Plano 03.
import { describe, test, expect } from 'bun:test'
import { installGhFilesStep } from './06-install-gh-files'

describe('installGhFilesStep (stub)', () => {
  test('retorna mutated=false e summary com "stub"', async () => {
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const report = await installGhFilesStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('stub')
  })

  test('id e install-gh-files', () => {
    expect(installGhFilesStep.id).toBe('install-gh-files')
  })
})
