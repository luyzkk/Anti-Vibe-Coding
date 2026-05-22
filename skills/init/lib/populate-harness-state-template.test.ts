// skills/init/lib/populate-harness-state-template.test.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-05 — STATE.md template.

import { describe, test, expect } from 'bun:test'
import { renderPopulateHarnessState } from './populate-harness-state-template'

describe('renderPopulateHarnessState', () => {
  const sample = { dateSlug: '2026-05-21', stackPrimary: 'node-ts', totalFases: 16 }

  test('emits H1 State header', () => {
    const out = renderPopulateHarnessState(sample)
    expect(out).toContain('# State: Populate Harness')
  })

  test('starts with Phase: planned (fase ainda nao executou)', () => {
    const out = renderPopulateHarnessState(sample)
    expect(out).toContain('**Phase:** planned')
  })

  test('reflects total fases in progress table', () => {
    const out = renderPopulateHarnessState(sample)
    expect(out).toContain(`| 01 | Populate Harness | ${sample.totalFases} | 0/${sample.totalFases} | pending |`)
    expect(out).toContain(`Fases done: 0/${sample.totalFases} (0%)`)
  })

  test('includes stack info in log entry', () => {
    const out = renderPopulateHarnessState(sample)
    expect(out).toContain(`pasta gerada pelo init (Step 7) — stack ${sample.stackPrimary}`)
  })

  test('uses dateSlug for Last Updated', () => {
    const out = renderPopulateHarnessState(sample)
    expect(out).toContain(`**Last Updated:** ${sample.dateSlug}`)
  })
})
