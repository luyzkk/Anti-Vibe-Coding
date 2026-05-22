// skills/init/lib/populate-harness-plan-overview.test.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — testes do renderer de PLAN overview do harness.

import { describe, test, expect } from 'bun:test'
import { renderPopulateHarnessPlanOverview } from './populate-harness-plan-overview'
import type { GeneratedFasePlan } from './populate-plan-generator'

const FAKE_PLANS: GeneratedFasePlan[] = [
  { dst: 'docs/SECURITY.md', slug: 'docs-security-md', faseNumber: 1, relPath: 'docs/exec-plans/active/2026-05-21-populate-harness/fase-01-docs-security-md.md', content: '' },
  { dst: 'docs/FRONTEND.md', slug: 'docs-frontend-md', faseNumber: 2, relPath: 'docs/exec-plans/active/2026-05-21-populate-harness/fase-02-docs-frontend-md.md', content: '' },
]

describe('renderPopulateHarnessPlanOverview', () => {
  test('includes frontmatter with title and date', () => {
    const out = renderPopulateHarnessPlanOverview(FAKE_PLANS, { dateSlug: '2026-05-21', stackPrimary: 'node-ts' })
    expect(out).toContain('2026-05-21')
    expect(out).toContain('Populate Harness')
  })

  test('includes a row for each fase plan', () => {
    const out = renderPopulateHarnessPlanOverview(FAKE_PLANS, { dateSlug: '2026-05-21', stackPrimary: 'node-ts' })
    expect(out).toContain('docs/SECURITY.md')
    expect(out).toContain('docs/FRONTEND.md')
  })

  test('total fases count is correct', () => {
    const out = renderPopulateHarnessPlanOverview(FAKE_PLANS, { dateSlug: '2026-05-21', stackPrimary: 'node-ts' })
    expect(out).toContain('**Total fases:** 2')
  })
})
