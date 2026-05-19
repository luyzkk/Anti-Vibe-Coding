// 2026-05-19 (Luiz/dev): Plano 01 fase-05 — testes do registry atualizados para refletir
// remocao de Steps 07/08/09-propose-merge/11 e rename do Step 10 (Plano 01 fases 02-04).
// Cobre parte de CA-10 do PRD init-llm-driven-harness-population.
import { describe, expect, test } from 'bun:test'
import { registry } from './registry'
import { backupPreMutationStep } from './steps/10-backup-pre-mutation'

describe('registry', () => {
  test('all step ids are unique', () => {
    const ids = registry.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // 2026-05-19 (Luiz/dev): MH-01 / CA-07 do PRD novo — Bug C.
  test('final-validation is the last step', () => {
    expect(registry.at(-1)?.id).toBe('final-validation')
  })

  test('91-generate-populate-plan comes BEFORE final-validation', () => {
    const ids = registry.map(s => s.id)
    const finalIdx = ids.indexOf('final-validation')
    const populateIdx = ids.indexOf('91-generate-populate-plan')
    expect(populateIdx).toBeGreaterThanOrEqual(0)
    expect(finalIdx).toBeGreaterThan(populateIdx)
  })

  // 2026-05-19 (Luiz/dev): MH-04 do PRD novo — Steps heuristicos removidos.
  test.each([
    '07-discover-existing-docs',
    '08-classify-blocks-hybrid',
    '09-propose-merge-batch',
    '11-move-docs-with-stub',
  ])('removed step %s is NOT present in registry', (removedId) => {
    const ids = registry.map(s => s.id)
    expect(ids).not.toContain(removedId)
  })

  // 2026-05-19 (Luiz/dev): MH-05 / D3 CONTEXT — Step 10 renomeado preservando linhagem git.
  test('10-backup-pre-mutation is present (renamed from apply-merge-destructive)', () => {
    expect(registry).toContain(backupPreMutationStep)
    const ids = registry.map(s => s.id)
    expect(ids).toContain('10-backup-pre-mutation')
    expect(ids).not.toContain('10-apply-merge-destructive')
  })

  // 2026-05-19 (Luiz/dev): backup deve rodar ANTES do scaffold mutativo (decisao DI-N MEMORY.md).
  // Nota: scaffold step id e 'scaffold-full-tree' (sem prefixo numerico no id).
  test('10-backup-pre-mutation comes before scaffold-full-tree', () => {
    const ids = registry.map(s => s.id)
    const backupIdx = ids.indexOf('10-backup-pre-mutation')
    const scaffoldIdx = ids.indexOf('scaffold-full-tree')
    expect(backupIdx).toBeGreaterThanOrEqual(0)
    expect(scaffoldIdx).toBeGreaterThanOrEqual(0)
    expect(backupIdx).toBeLessThan(scaffoldIdx)
  })
})
