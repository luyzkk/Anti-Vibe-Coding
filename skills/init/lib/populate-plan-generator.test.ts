// 2026-05-19 (Luiz/dev): Plano 03 fase-03 RED — testes para generatePopulatePlanV2.
// Plano 03 fase-05: v1 (generatePopulatePlan) removida — este e o unico arquivo de teste do modulo.
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

  // 2026-05-19 (Luiz/dev): Plano 01 fase-03 — flip do assert apos D5 do PRD populate-plan-andre-port.
  // D14 do PRD anterior excluia PRODUCT_SENSE e README. D5 do PRD novo reverte: so COMPOUND_ENGINEERING
  // fica de fora (meta-doc filosofico, sem codigo a referenciar). PRODUCT_SENSE e README voltam.
  it('exclui apenas docs filosoficos (D5 PRD — so COMPOUND_ENGINEERING)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    const docs = result.phases.map(p => p.docCanonico)
    // Excluido (meta-documentacao do processo — sem codigo a referenciar):
    expect(docs).not.toContain('docs/COMPOUND_ENGINEERING.md')
    // Reincluidos (D5 do PRD — Andre tem ambos ricos no harness):
    expect(docs).toContain('docs/PRODUCT_SENSE.md')
    expect(docs).toContain('README.md')
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
    // Double-cast: arrow fn incompatible com `typeof fetch` diretamente (TS2352).
    // `as unknown as typeof fetch` e a forma idiomatica para mocks de funcoes builtin.
    globalThis.fetch = (() => {
      called = true
      throw new Error('should not fetch')
    }) as unknown as typeof fetch
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
