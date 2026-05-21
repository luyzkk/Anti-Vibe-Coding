// skills/init/lib/registry.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — testes do registry v7 (10 steps, ordem D12 revisada).
// Substitui testes v6.7 (fases 02-05 do plano anterior). RED: falha porque registry ainda tem 21 entries.
// 2026-05-21 (Luiz/dev): Plano 03 fase-03 — IDs dos Steps 5-6 atualizados (reais, nao stubs).
import { describe, test, expect } from 'bun:test'
import { registry } from './registry'

describe('registry v7 (Plano 01 fase-04)', () => {
  test('exatamente 10 steps (D12 revisada por DV-1 + DV-3)', () => {
    expect(registry.length).toBe(10)
  })

  test('ids batem com ordem D12 revisada', () => {
    const ids = registry.map(s => s.id)
    expect(ids).toEqual([
      'reentry-gate',
      'detect-legacy-and-stack',
      '03-secrets-scan',
      'migrate-planning-and-manifest',
      '05-scaffold-and-link',
      '06-install-gh-files',
      'generate-populate-plans',
      'delivery-loop',
      'copy-knowledge',
      'final-validation',
    ])
  })

  test('todos os 10 steps sao reais (nenhum summary contem "stub")', async () => {
    // 2026-05-21 (Luiz/dev): Plano 05 fase-05 — Steps 9-10 agora reais; loop de stubs removido.
    // Steps 1-7 nao precisam de mock (nao tocam disco no cwd de producao para este check).
    // Steps 8, 9, 10 retornam sem erro mesmo sem ctx completo (defensivos).
    // Step 8 (delivery-loop) sem __interactiveAnswer retorna needsUser — summary e ''.
    // Step 9 (copy-knowledge) roda runner real — summary indica stack detectada.
    // Step 10 (final-validation) roda em cwd = process.cwd() — sem stack.json = sem abort.
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const step8 = registry[7]!
    const step9 = registry[8]!
    const step10 = registry[9]!
    const r8 = await step8.run(ctx)
    const r9 = await step9.run(ctx)
    const r10 = await step10.run(ctx)
    expect(r8.summary).not.toContain('stub')
    expect(r9.summary).not.toContain('stub')
    expect(r10.summary).not.toContain('stub')
  })
})
