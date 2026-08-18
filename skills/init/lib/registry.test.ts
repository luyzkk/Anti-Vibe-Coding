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
    // Steps 9-12 retornam sem erro mesmo sem ctx completo (defensivos).
    // Step 9 (delivery-loop) sem __interactiveAnswer retorna needsUser — summary e ''.
    // Step 10 (copy-knowledge) roda runner real — em tmpdir vazio nao ha stack, summary diz isso.
    // Step 11 (final-validation) le o stack.json que o Step 10 acabou de escrever no mesmo tmpdir.
    // Step 12 (write-anti-vibe-manifest) escreve .claude/.anti-vibe-manifest.json — idempotente.
    //
    // 2026-08-18 (Luiz/dev): TODO.md — os Steps 9-11 rodavam com `cwd: process.cwd()`, o repo vivo,
    // e isso os deixava flaky (~1 em 6 runs da suite completa; 5/5 verde isolado). O Step 10 escreve
    // `.claude/stack.json` no cwd que recebe: rodando na raiz, gravava `primary: nodejs-typescript`
    // no repo de dev. O Step 11 le esse mesmo arquivo e **lanca AbortError** quando ha stack detectada
    // sem `.claude/knowledge/INDEX.md` — entao o veredito do teste dependia de outro teste nao estar
    // mexendo em `.claude/knowledge/` naquele instante. O teste era poluidor e vitima ao mesmo tempo.
    //
    // A poluicao era invisivel: `.claude/stack.json` esta no .gitignore (L40), entao o side effect
    // nunca aparecia no `git status`. Mesmo tratamento que o Step 12 ja recebeu em 2026-05-25 —
    // agora estendido aos quatro, num tmpdir compartilhado que espelha a ordem real do pipeline.
    const tmp = await fs.mkdtemp(path.join(tmpdir(), 'registry-steps-'))
    try {
      const ctx = { cwd: tmp, args: [], flags: {} }
      const step9 = registry[8]!
      const step10 = registry[9]!
      const step11 = registry[10]!
      const step12 = registry[11]!
      const r9 = await step9.run(ctx)
      const r10 = await step10.run(ctx)
      const r11 = await step11.run(ctx)
      const r12 = await step12.run(ctx)
      expect(r9.summary).not.toContain('stub')
      expect(r10.summary).not.toContain('stub')
      expect(r11.summary).not.toContain('stub')
      expect(r12.summary).not.toContain('stub')
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})
