// skills/init/lib/steps/01-reentry-gate.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-03 — TDD RED/GREEN para DR-1 + DV-3.
// Gate de re-entrada: aborta se .claude/legacy-manifest.json ja existe no cwd.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { reentryGateStep } from './01-reentry-gate'
import { AbortError } from './abort-error'

describe('reentryGateStep (DR-1 / DV-3)', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'init-v7-gate-'))
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  test('manifest existente: aborta com code=10', async () => {
    await mkdir(path.join(cwd, '.claude'), { recursive: true })
    await writeFile(
      path.join(cwd, '.claude', 'legacy-manifest.json'),
      JSON.stringify({ schemaVersion: '1.0', legacy: [] }),
    )
    const ctx = { cwd, args: [], flags: {} } as never
    let thrown: unknown = null
    try {
      await reentryGateStep.run(ctx)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(AbortError)
    expect((thrown as AbortError).code).toBe(10)
    expect((thrown as AbortError).reason).toContain('already initialized')
    expect((thrown as AbortError).reason).toContain('/init:refresh')
  })

  test('manifest ausente: prossegue (mutated=false)', async () => {
    const ctx = { cwd, args: [], flags: {} } as never
    const report = await reentryGateStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('no prior manifest')
  })

  test('path do manifest eh diretorio (defensive): NAO aborta', async () => {
    await mkdir(path.join(cwd, '.claude', 'legacy-manifest.json'), { recursive: true })
    const ctx = { cwd, args: [], flags: {} } as never
    const report = await reentryGateStep.run(ctx)
    expect(report.mutated).toBe(false)
  })
})
