// skills/init/lib/populate-harness-context-template.test.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — testes do renderer de CONTEXT do harness.

import { describe, test, expect } from 'bun:test'
import { renderPopulateHarnessContext } from './populate-harness-context-template'

describe('renderPopulateHarnessContext', () => {
  test('includes frontmatter slug and date', () => {
    const out = renderPopulateHarnessContext({ dateSlug: '2026-05-21', stackPrimary: 'node-ts', totalDocs: 16 })
    expect(out).toContain('slug: populate-harness')
    expect(out).toContain('date: 2026-05-21')
  })

  test('includes stack primary in content', () => {
    const out = renderPopulateHarnessContext({ dateSlug: '2026-05-21', stackPrimary: 'rails', totalDocs: 16 })
    expect(out).toContain('rails')
  })

  test('includes total fases count', () => {
    const out = renderPopulateHarnessContext({ dateSlug: '2026-05-21', stackPrimary: 'node-ts', totalDocs: 16 })
    expect(out).toContain('Total de fases: 16')
  })
})
