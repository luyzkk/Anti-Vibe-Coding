// 2026-05-19 (Luiz/dev): Plano 04 fase-02 — backup pre-6.5.0 antes de mutacao (MH-07, CA-03).
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { backupPre650Step } from './00_3-backup-pre-6_5_0'

async function makeTmpWithDocs(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-pre650-'))
  await fs.mkdir(path.join(dir, 'docs', 'sub'), { recursive: true })
  await fs.writeFile(path.join(dir, 'docs', 'STATE.md'), '# state')
  await fs.writeFile(path.join(dir, 'docs', 'sub', 'a.md'), 'a')
  return dir
}

describe('backupPre650Step', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await makeTmpWithDocs()
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('skips when reentry mode is greenfield', async () => {
    const flags = { __reentryMode: 'greenfield' as const }
    const report = await backupPre650Step.run({ cwd, args: [], flags })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skipped')
  })

  it('copies docs/ to docs/_legacy/pre-6.5.0/ when reentry mode is re-populate', async () => {
    const flags = { __reentryMode: 're-populate' as const }
    const report = await backupPre650Step.run({ cwd, args: [], flags })
    expect(report.mutated).toBe(true)
    const backedUp = await fs.readFile(path.join(cwd, 'docs/_legacy/pre-6.5.0/STATE.md'), 'utf-8')
    expect(backedUp).toBe('# state')
  })

  it('suffixes destination with timestamp when previous backup exists', async () => {
    await fs.mkdir(path.join(cwd, 'docs/_legacy/pre-6.5.0'), { recursive: true })
    await fs.writeFile(path.join(cwd, 'docs/_legacy/pre-6.5.0/keep.md'), 'keep')

    const flags = { __reentryMode: 're-populate' as const }
    const report = await backupPre650Step.run({ cwd, args: [], flags })
    expect(report.summary).toMatch(/pre-6\.5\.0-\d{4}-\d{2}-\d{2}T/)

    const original = await fs.readFile(path.join(cwd, 'docs/_legacy/pre-6.5.0/keep.md'), 'utf-8')
    expect(original).toBe('keep')
  })

  it('dry-run lists paths without writing', async () => {
    const flags = { __reentryMode: 're-populate' as const, 'dry-run': true }
    const report = await backupPre650Step.run({ cwd, args: ['--dry-run'], flags })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('dry-run')
    const exists = await fs
      .access(path.join(cwd, 'docs/_legacy/pre-6.5.0'))
      .then(() => true)
      .catch(() => false)
    expect(exists).toBe(false)
  })

  it('does not recurse into its own destination (no infinite copy)', async () => {
    const flags = { __reentryMode: 're-populate' as const }
    await backupPre650Step.run({ cwd, args: [], flags })
    const nested = await fs
      .access(path.join(cwd, 'docs/_legacy/pre-6.5.0/_legacy'))
      .then(() => true)
      .catch(() => false)
    expect(nested).toBe(false)
  })
})
