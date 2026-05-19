// 2026-05-19 (Luiz/dev): Plano 03 fase-03 RED — testes para generatePopulatePlanV2.
// Arquivo separado para nao perturbar os 6 testes v1 em populate-plan-generator.test.ts.
// Clock injetado para determinismo (regra CLAUDE.md global).

import { describe, it, expect } from 'bun:test'
import { generatePopulatePlanV2 } from './populate-plan-generator'

const FIXED_DATE = new Date('2026-05-19T10:00:00.000Z')

describe('generatePopulatePlanV2', () => {
  it('emits one phase per populatable canonical doc (>= 10 — G1 + CA-01)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    expect(result.phases.length).toBeGreaterThanOrEqual(10)
  })

  it('each phase file contains 4 mandatory blocks (MH-02)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    for (const content of result.phaseFiles.values()) {
      expect(content).toContain('### Inputs (docs candidatos)')
      expect(content).toContain('### Inputs (codigo)')
      expect(content).toContain('### Instrucao LLM')
      expect(content).toContain('### Criterio de done')
    }
  })

  it('PLAN.md index contains glossario + phase table', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    expect(result.planIndexMarkdown).toContain('## Glossario de Instrucoes LLM')
    expect(result.planIndexMarkdown).toContain('| Fase | Doc canonico | Arquivo | Status |')
  })

  it('does NOT include excluded files (D14 PRD — filosoficos)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    const docs = result.phases.map(p => p.docCanonico)
    expect(docs).not.toContain('docs/COMPOUND_ENGINEERING.md')
    expect(docs).not.toContain('docs/PRODUCT_SENSE.md')
    expect(docs).not.toContain('README.md')
  })

  it('relativeFolderPath uses path-safe date (no colons)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    expect(result.relativeFolderPath).not.toContain(':')
    expect(result.relativeFolderPath).toMatch(/docs\/exec-plans\/active\/.+-populate-harness$/)
  })

  it('NEVER calls fetch / network (G3 — pure render)', async () => {
    const originalFetch = globalThis.fetch
    let called = false
    globalThis.fetch = (() => {
      called = true
      throw new Error('should not fetch')
    }) as typeof fetch
    try {
      await generatePopulatePlanV2({
        cwd: '/tmp/fake',
        projectName: 'test-project',
        clock: () => FIXED_DATE,
      })
    } finally {
      globalThis.fetch = originalFetch
    }
    expect(called).toBe(false)
  })
})
