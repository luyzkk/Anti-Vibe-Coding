import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { writeManifest, readManifest, computeChecksum, buildMigrationPlanCatalog, autoFlipIfComplete } from './manifest-writer'
import type { AntiVibeManifest } from './manifest-writer'

describe('manifest-writer', () => {
  it('module exists and exports writeManifest and readManifest', () => {
    expect(typeof writeManifest).toBe('function')
    expect(typeof readManifest).toBe('function')
  })

  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(tmpdir(), 'manifest-writer-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('readManifest returns null when manifest does not exist', async () => {
    const result = await readManifest(tmpDir)
    expect(result).toBeNull()
  })

  it('writeManifest + readManifest round-trip preserves manifest', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration',
      installedAt: '2026-05-14T00:00:00.000Z',
      files: { 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md': 'abc123' },
      migrationPlans: [
        { id: 'plan-a', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/active/plan-a-migration.md', status: 'active' },
      ],
    }

    await writeManifest(tmpDir, manifest)
    const read = await readManifest(tmpDir)
    expect(read).toEqual(manifest)
  })

  it('writeManifest creates .claude/ dir if it does not exist', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'fresh',
      installedAt: '2026-05-14T00:00:00.000Z',
      files: {},
    }
    await writeManifest(tmpDir, manifest)
    const exists = await fs.stat(path.join(tmpDir, '.claude/.anti-vibe-manifest.json')).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('computeChecksum returns empty string for non-existent file', async () => {
    const result = await computeChecksum(path.join(tmpDir, 'does-not-exist.json'))
    expect(result).toBe('')
  })

  it('computeChecksum returns hex string for existing file', async () => {
    const filePath = path.join(tmpDir, 'test.txt')
    await fs.writeFile(filePath, 'hello world', 'utf-8')
    const result = await computeChecksum(filePath)
    expect(result).toMatch(/^[a-f0-9]{64}$/)
  })

  it('buildMigrationPlanCatalog returns empty array when no -migration.md files exist', async () => {
    await fs.mkdir(path.join(tmpDir, 'docs/exec-plans/active'), { recursive: true })
    await fs.mkdir(path.join(tmpDir, 'docs/exec-plans/completed'), { recursive: true })
    const result = await buildMigrationPlanCatalog(tmpDir)
    expect(result).toEqual([])
  })

  it('buildMigrationPlanCatalog scans both active and completed dirs', async () => {
    await fs.mkdir(path.join(tmpDir, 'docs/exec-plans/active'), { recursive: true })
    await fs.mkdir(path.join(tmpDir, 'docs/exec-plans/completed'), { recursive: true })

    await fs.writeFile(
      path.join(tmpDir, 'docs/exec-plans/active/2026-05-14-design-md-migration.md'),
      '<!-- migration-slot: docs/DESIGN.md -->\n# Plan\n',
      'utf-8',
    )
    await fs.writeFile(
      path.join(tmpDir, 'docs/exec-plans/completed/2026-05-13-agents-md-migration.md'),
      '<!-- migration-slot: AGENTS.md -->\n# Plan\n',
      'utf-8',
    )
    // This file should NOT be picked up (no -migration.md suffix)
    await fs.writeFile(
      path.join(tmpDir, 'docs/exec-plans/active/README.md'),
      '# readme',
      'utf-8',
    )

    const result = await buildMigrationPlanCatalog(tmpDir)
    expect(result).toHaveLength(2)
    const active = result.find((e) => e.status === 'active')
    const completed = result.find((e) => e.status === 'completed')
    expect(active?.slot).toBe('docs/DESIGN.md')
    expect(active?.id).toBe('2026-05-14-design-md-migration')
    expect(completed?.slot).toBe('AGENTS.md')
  })

  it('buildMigrationPlanCatalog infers slot=unknown when plan has no recognizable slot', async () => {
    await fs.mkdir(path.join(tmpDir, 'docs/exec-plans/active'), { recursive: true })
    await fs.writeFile(
      path.join(tmpDir, 'docs/exec-plans/active/2026-05-14-foo-migration.md'),
      '# No slot here\n',
      'utf-8',
    )
    const result = await buildMigrationPlanCatalog(tmpDir)
    expect(result[0]?.slot).toBe('unknown')
  })
})

describe('autoFlipIfComplete', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(tmpdir(), `manifest-test-${randomUUID()}`)
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('returns flipped: true and updates initMode when all plans are completed', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration',
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [
        { id: 'plan-a', slot: 'AGENTS.md', path: 'docs/exec-plans/completed/plan-a.md', status: 'completed' },
        { id: 'plan-b', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/completed/plan-b.md', status: 'completed' },
      ],
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(true)
    expect(result.updatedManifest.initMode).toBe('completed')

    const onDisk = await readManifest(tmpDir)
    expect(onDisk?.initMode).toBe('completed')
  })

  it('returns flipped: false when at least one plan is still active', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration',
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [
        { id: 'plan-a', slot: 'AGENTS.md', path: 'docs/exec-plans/active/plan-a.md', status: 'active' },
        { id: 'plan-b', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/completed/plan-b.md', status: 'completed' },
      ],
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(false)
    expect(result.updatedManifest.initMode).toBe('migration')
  })

  it('returns flipped: false when initMode is not migration', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'fresh',
      installedAt: new Date().toISOString(),
      files: {},
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(false)
    expect(result.updatedManifest.initMode).toBe('fresh')
  })

  it('returns flipped: false when migrationPlans is empty (nothing to complete)', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration',
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [],
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(false)
  })
})
