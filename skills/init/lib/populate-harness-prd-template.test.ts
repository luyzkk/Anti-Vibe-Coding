// skills/init/lib/populate-harness-prd-template.test.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — testes do renderer de PRD do harness.

import { describe, test, expect } from 'bun:test'
import { renderPopulateHarnessPRD } from './populate-harness-prd-template'

describe('renderPopulateHarnessPRD', () => {
  test('includes frontmatter slug and date', () => {
    const out = renderPopulateHarnessPRD({ dateSlug: '2026-05-21', stackPrimary: 'node-ts', legacyArtifactsFound: 0 })
    expect(out).toContain('slug: populate-harness')
    expect(out).toContain('date: 2026-05-21')
  })

  test('includes stack and legacy count', () => {
    const out = renderPopulateHarnessPRD({ dateSlug: '2026-05-21', stackPrimary: 'rails', legacyArtifactsFound: 3 })
    expect(out).toContain('**Stack detected:** rails')
    expect(out).toContain('**Legacy artifacts found:** 3')
  })

  test('includes ADR-0022 reference', () => {
    const out = renderPopulateHarnessPRD({ dateSlug: '2026-05-21', stackPrimary: 'node-ts', legacyArtifactsFound: 0 })
    expect(out).toContain('ADR-0022')
  })
})
