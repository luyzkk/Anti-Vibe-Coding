// skills/init/lib/steps/00_1-reuse-discovery.test.ts
// 2026-05-17 (Luiz/dev): 4 cenarios — sem flag, cache stale, alias --refresh, cache fresh.
// TDD: RED first. PRD MH-04, CA-04.
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { reuseDiscoveryStep } from './00_1-reuse-discovery'

const ctx = (cwd: string, args: readonly string[] = []) => ({
  cwd,
  args,
  flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('reuseDiscoveryStep', () => {
  let tmpDir: string
  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
  })

  test('no flag: returns empty no-op (does not set skipRemaining)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-noflag-'))
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, []))
    expect(r.mutated).toBe(false)
    expect(r.summary).toBe('')
    expect(r.skipRemaining).toBeFalsy()
  })

  test('--reuse-discovery with no cache: emits stale message and falls through', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-stale-'))
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, ['--reuse-discovery']))
    expect(r.summary).toMatch(/no previous init detected|stale/i)
    expect(r.skipRemaining).toBeFalsy()
  })

  test('--refresh is alias of --reuse-discovery (DEC-2)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-alias-'))
    // 2026-05-17 (Luiz/dev): mesmo comportamento de --reuse-discovery. PRD MH-04.
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, ['--refresh']))
    expect(r.summary).toMatch(/no previous init detected|stale/i)
  })

  test('--reuse-discovery with FRESH cache: sets skipRemaining true', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-fresh-'))
    // 2026-05-17 (Luiz/dev): forja agents-log.json com timestamp recente (started_at na raiz do JSON).
    await mkdir(path.join(tmpDir, 'discovery'), { recursive: true })
    const now = new Date().toISOString()
    await writeFile(
      path.join(tmpDir, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'test', started_at: now, entries: [] }, null, 2),
    )
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, ['--reuse-discovery']))
    // 2026-05-17 (Luiz/dev): mesmo sem profile detectado, skipRemaining = true (G6 do plano).
    // discoverCapabilities/profile skip — audit ainda eh gravado. Summary contem o log de "cache fresh".
    expect(r.skipRemaining).toBe(true)
    expect(r.summary).toContain('[reuse-discovery] cache fresh — running Step 7 only')
  })
})
