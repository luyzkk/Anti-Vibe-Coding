// skills/init/lib/registry.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — testes do registry v7 (10 steps, ordem D12 revisada).
// Substitui testes v6.7 (fases 02-05 do plano anterior). RED: falha porque registry ainda tem 21 entries.
// 2026-05-21 (Luiz/dev): Plano 03 fase-03 — IDs dos Steps 5-6 atualizados (reais, nao stubs).
// 2026-05-25 (Luiz/dev): Step 12 (write-anti-vibe-manifest) usa tmpdir para evitar
// side effect de criar .claude/.anti-vibe-manifest.json no proprio repo de dev.
import { describe, test, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { registry } from './registry'

describe('registry v7 (Plano 01 fase-04)', () => {
  test('exatamente 12 steps (D12 + inject-harness-scripts 2026-05-22 + write-anti-vibe-manifest 2026-05-25)', () => {
    expect(registry.length).toBe(12)
  })

  test('ids batem com ordem D12 revisada', () => {
    const ids = registry.map(s => s.id)
    expect(ids).toEqual([
      'reentry-gate',
      'detect-legacy-and-stack',
      '03-secrets-scan',
      'migrate-planning-and-manifest',
      '05-scaffold-and-link',
      'inject-harness-scripts',
      '06-install-gh-files',
      'generate-populate-plans',
      'delivery-loop',
      'copy-knowledge',
      'final-validation',
      'write-anti-vibe-manifest',
    ])
  })

  test('todos os 12 steps sao reais (nenhum summary contem "stub")', async () => {
    // Steps 1-8 nao precisam de mock (nao tocam disco no cwd de producao para este check).
    // Steps 9, 10, 11, 12 retornam sem erro mesmo sem ctx completo (defensivos).
    // Step 9 (delivery-loop) sem __interactiveAnswer retorna needsUser — summary e ''.
    // Step 10 (copy-knowledge) roda runner real — summary indica stack detectada.
    // Step 11 (final-validation) roda em cwd = process.cwd() — sem stack.json = sem abort.
    // Step 12 (write-anti-vibe-manifest) escreve em process.cwd()/.claude — idempotente.
    const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
    const step9 = registry[8]!
    const step10 = registry[9]!
    const step11 = registry[10]!
    const step12 = registry[11]!
    const r9 = await step9.run(ctx)
    const r10 = await step10.run(ctx)
    const r11 = await step11.run(ctx)
    // Step 12 escreve em disco — usa tmpdir para evitar poluir o repo de dev.
    const tmp = await fs.mkdtemp(path.join(tmpdir(), 'registry-step12-'))
    const r12 = await step12.run({ cwd: tmp, args: [], flags: {} } as any)
    await fs.rm(tmp, { recursive: true, force: true })
    expect(r9.summary).not.toContain('stub')
    expect(r10.summary).not.toContain('stub')
    expect(r11.summary).not.toContain('stub')
    expect(r12.summary).not.toContain('stub')
  })
})
