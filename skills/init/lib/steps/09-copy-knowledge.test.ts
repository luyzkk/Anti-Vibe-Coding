// skills/init/lib/steps/09-copy-knowledge.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — stub test. Comportamento real testado em Plano 05.
import { describe, test, expect } from 'bun:test'
import { copyKnowledgeStep } from './09-copy-knowledge'

describe('copyKnowledgeStep (stub)', () => {
  test('retorna mutated=false e summary com "stub"', async () => {
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const report = await copyKnowledgeStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('stub')
  })

  test('id e copy-knowledge', () => {
    expect(copyKnowledgeStep.id).toBe('copy-knowledge')
  })
})
