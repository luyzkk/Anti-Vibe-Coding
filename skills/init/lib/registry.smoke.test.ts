// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — atualizado para v7 registry (10 steps).
// Step 91 foi removido do pipeline v7. O generator agora eh Step 7 (generate-populate-plans).
// 2026-05-25 (Luiz/dev): write-anti-vibe-manifest adicionado como ultimo step (12 total).
// final-validation continua antes do manifest writer — se validation aborta, manifest nao e atualizado.
import { describe, expect, test } from 'bun:test'
import { registry } from './registry'

describe('registry smoke (v7 12-step pipeline)', () => {
  test('generate-populate-plans runs before final-validation (MH-01)', () => {
    const ids = registry.map(s => s.id)
    const populateIdx = ids.indexOf('generate-populate-plans')
    const finalIdx = ids.indexOf('final-validation')
    expect(populateIdx).toBeGreaterThanOrEqual(0)
    expect(finalIdx).toBeGreaterThan(populateIdx)
  })

  test('write-anti-vibe-manifest is the last step (runs after final-validation)', () => {
    expect(registry.at(-1)?.id).toBe('write-anti-vibe-manifest')
    const ids = registry.map(s => s.id)
    expect(ids.indexOf('write-anti-vibe-manifest')).toBeGreaterThan(ids.indexOf('final-validation'))
  })
})
