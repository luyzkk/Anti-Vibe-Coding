// skills/init/lib/run-init-abort.test.ts
// 2026-05-17 (Luiz/dev): Plano 03 fase-01 — golden regression tests para AbortError catch.
// Prova que o dispatcher (Plano 01 fase-02) ja captura AbortError com os 3 codigos canonicos
// (code=1 needs-migration, code=2 ambiguity, code=1 migrate.2 conflict) e interrompe o loop.
// PRD D4, R1, G1, G5 do plano 03.
import { describe, test, expect } from 'bun:test'
import { runInit } from './run-init'
import { AbortError } from './steps/abort-error'
import type { Step } from './steps/types'

function makeAbortingStep(payload: { code: number; reason: string }): Step {
  return {
    id: 'gate-fake',
    async run() { throw new AbortError(payload) },
  }
}

const downstream: Step = {
  id: 'downstream',
  async run() { throw new Error('downstream must not run after AbortError') },
}

describe('runInit — AbortError flow (Plano 03 fase-01)', () => {
  test('gate code=1 (needs migration) — wording byte-identico ao SKILL.md linha 31-32', async () => {
    // 2026-05-17 (Luiz/dev): reason copiada VERBATIM de skills/init/SKILL.md linhas 31-32.
    // PRD R1, G1 do plano. Em-dash (U+2014), 2 linhas concatenadas com \n.
    const reason = [
      'Detected v5.x artifacts: planning-dir',
      'Run `/init migrate` (or `--dry-run` to preview).',
    ].join('\n')
    const logs: string[] = []
    const result = await runInit([], {
      registry: [makeAbortingStep({ code: 1, reason }), downstream],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result).toEqual({ kind: 'aborted', code: 1, reason })
    // 2026-05-17 (Luiz/dev): reason deve aparecer NO LOG (o dispatcher emite antes de retornar).
    expect(logs.join('\n')).toContain('Detected v5.x artifacts: planning-dir')
    expect(logs.join('\n')).toContain('Run `/init migrate` (or `--dry-run` to preview).')
  })

  test('gate code=2 (ambiguity) — wording byte-identico ao SKILL.md linha 27-28', async () => {
    // 2026-05-17 (Luiz/dev): reason copiada VERBATIM de skills/init/SKILL.md linhas 27-28.
    // PRD R1, G1, G5 (code=2 = ambiguity).
    const reason = [
      'Project has both v5 artifacts AND docs/exec-plans/ \u2014 partial migration?',
      'Run `/init migrate --resume` or remove residuals manually.',
    ].join('\n')
    const logs: string[] = []
    const result = await runInit([], {
      registry: [makeAbortingStep({ code: 2, reason }), downstream],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result).toEqual({ kind: 'aborted', code: 2, reason })
    expect(logs.join('\n')).toContain('partial migration?')
  })

  test('gate code=1 (migrate.2 conflict) — wording byte-identico ao SKILL.md linhas 143-150', async () => {
    // 2026-05-17 (Luiz/dev): reason de 6 linhas copiada VERBATIM de skills/init/SKILL.md.
    // PRD R1, G1. Esta eh a reason que fase-03 deste plano vai produzir DE VERDADE.
    const reason = [
      'Migration: partial',
      '  entries: 12',
      '  written: 10',
      '  skipped: 0',
      '  CONFLICTS: docs/exec-plans/active/2026-05-12-foo/PLAN.md, docs/product-specs/bar.md',
      '  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.',
    ].join('\n')
    const logs: string[] = []
    const result = await runInit([], {
      registry: [makeAbortingStep({ code: 1, reason }), downstream],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result.kind).toBe('aborted')
    if (result.kind === 'aborted') {
      expect(result.code).toBe(1)
      // 2026-05-17 (Luiz/dev): reason completa preservada (6 linhas).
      expect(result.reason.split('\n')).toHaveLength(6)
      expect(result.reason.split('\n')[4]).toMatch(/^  CONFLICTS: /)
    }
  })

  test('downstream step NAO executa apos AbortError (loop interrompido)', async () => {
    let downstreamCalled = false
    const probe: Step = {
      id: 'probe', async run() { downstreamCalled = true; return { mutated: false, summary: '' } },
    }
    await runInit([], {
      registry: [makeAbortingStep({ code: 1, reason: 'stop' }), probe],
      cwd: '/tmp',
      log: () => {},
    })
    expect(downstreamCalled).toBe(false)
  })
})
