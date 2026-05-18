// skills/init/lib/steps/09_1-migrate-all-orchestrate.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { migrateAllOrchestrateStep } from './09_1-migrate-all-orchestrate'

const ctxFn = (cwd: string, args: readonly string[], flags: Readonly<Record<string, boolean | string>> = {}) => ({
  cwd, args, flags,
})

describe('migrateAllOrchestrateStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-noop-'))
    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode without --dry-run: NO-OP (DI-5-1 desta fase)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-real-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, ['migrate']))
    // 2026-05-17 (Luiz/dev): DI-5-1 — migrate.all eh no-op em real mode (migrate.1/2/3/4 fazem o trabalho).
    expect(r).toEqual({ mutated: false, summary: '' })
    // 2026-05-17 (Luiz/dev): zero side-effect — backup NAO criado pelo migrate-all em real mode.
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(false)
  })

  test('migrate mode + --dry-run: skipRemaining=true, summary contem report + "Re-run..." e ZERO mutacao', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-dryrun-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, ['migrate'], { 'dry-run': true }))

    expect(r.skipRemaining).toBe(true)
    expect(r.mutated).toBe(false)
    // 2026-05-17 (Luiz/dev): PRD CA-03 — dry-run zero side-effects.
    expect(existsSync(path.join(tmpDir, 'docs'))).toBe(false)
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(false)

    // 2026-05-17 (Luiz/dev): summary contem o report renderizado + sufixo byte-identico.
    expect(r.summary).toContain('--- Migration Dry Run ---')
    expect(r.summary.endsWith('\n\nRe-run without --dry-run to apply.')).toBe(true)
  })

  test('migrate mode + --dry-run em greenfield (sem .planning/): orchestrator nao quebra', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-green-'))
    // 2026-05-17 (Luiz/dev): sem .planning/, state.isLegacy=false.
    // orchestrateMigration deve retornar report com isLegacy=false e sem mutacao.
    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, ['migrate'], { 'dry-run': true }))
    expect(r.skipRemaining).toBe(true)
    expect(r.summary).toContain('Detected v5.x: no')
  })
})
