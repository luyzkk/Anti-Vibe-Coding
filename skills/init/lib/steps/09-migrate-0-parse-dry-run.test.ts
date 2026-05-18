// skills/init/lib/steps/09-migrate-0-parse-dry-run.test.ts
import { describe, test, expect } from 'bun:test'
import { migrate0ParseDryRunStep } from './09-migrate-0-parse-dry-run'

const ctx = (args: readonly string[], flags: Readonly<Record<string, boolean | string>>) => ({
  cwd: '/tmp', args, flags,
})

describe('migrate0ParseDryRunStep', () => {
  test('no migrate mode: no-op', async () => {
    const r = await migrate0ParseDryRunStep.run(ctx([], {}))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode without --dry-run: no-op silencioso', async () => {
    const r = await migrate0ParseDryRunStep.run(ctx(['migrate'], {}))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode with --dry-run: emite log byte-identico', async () => {
    const r = await migrate0ParseDryRunStep.run(ctx(['migrate'], { 'dry-run': true }))
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 50 (PRD R1, G1).
    expect(r.summary).toBe('Dry-run mode: no files will be modified.')
    expect(r.mutated).toBe(false)
  })
})
