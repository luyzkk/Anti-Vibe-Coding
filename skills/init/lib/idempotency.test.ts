import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { shouldSkipFile, regenerateDiscovery, checkIdempotency } from './idempotency'
import type { AntiVibeManifest } from './manifest-writer'

function makeManifest(files: Record<string, string> = {}): AntiVibeManifest {
  return {
    pluginVersion: '6.1.0',
    initMode: 'migration',
    installedAt: new Date().toISOString(),
    files,
  }
}

function sha256(content: string): string {
  return createHash('sha256').update(Buffer.from(content)).digest('hex')
}

describe('shouldSkipFile', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'idempotency-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('returns skip:false when file is not in manifest', async () => {
    const manifest = makeManifest({})
    const absPath = path.join(tmpDir, 'discovery/inventory.json')
    const result = await shouldSkipFile('discovery/inventory.json', absPath, manifest)
    expect(result.skip).toBe(false)
  })

  it('returns plan-preserved for any path under docs/exec-plans/active/', async () => {
    const manifest = makeManifest({})
    const relPath = 'docs/exec-plans/active/2026-05-14-design-migration.md'
    const result = await shouldSkipFile(relPath, path.join(tmpDir, relPath), manifest)
    expect(result.skip).toBe(true)
    if (result.skip) expect(result.reason).toBe('plan-preserved')
  })

  it('returns plan-preserved for paths in subdirectories of active/', async () => {
    const manifest = makeManifest({})
    const relPath = 'docs/exec-plans/active/2026-05-14-foo/README.md'
    const result = await shouldSkipFile(relPath, path.join(tmpDir, relPath), manifest)
    expect(result.skip).toBe(true)
    if (result.skip) expect(result.reason).toBe('plan-preserved')
  })

  it('returns checksum-mismatch when file was edited by human', async () => {
    const relPath = 'discovery/inventory.json'
    const absPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, '{"original": true}')
    const originalChecksum = sha256('{"original": true}')

    const manifest = makeManifest({ [relPath]: originalChecksum })

    await fs.writeFile(absPath, '{"edited": true}')

    const result = await shouldSkipFile(relPath, absPath, manifest)
    expect(result.skip).toBe(true)
    if (result.skip) expect(result.reason).toBe('checksum-mismatch')
  })

  it('returns skip:false when checksum matches (file unchanged)', async () => {
    const relPath = 'discovery/inventory.json'
    const absPath = path.join(tmpDir, relPath)
    const content = '{"unchanged": true}'
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, content)
    const checksum = sha256(content)

    const manifest = makeManifest({ [relPath]: checksum })
    const result = await shouldSkipFile(relPath, absPath, manifest)
    expect(result.skip).toBe(false)
  })

  it('normalizes backslash separators for manifest lookup', async () => {
    const relPath = 'discovery/inventory.json'
    const winRelPath = 'discovery\\inventory.json'
    const absPath = path.join(tmpDir, relPath)
    const content = '{"data": 1}'
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, content)

    const manifest = makeManifest({ [relPath]: sha256(content) })
    const result = await shouldSkipFile(winRelPath, absPath, manifest)
    expect(result.skip).toBe(false)
  })
})

describe('regenerateDiscovery', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'regen-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('removes inventory.json and semantic-inventory.json', async () => {
    const discoveryDir = path.join(tmpDir, 'discovery')
    await fs.mkdir(discoveryDir, { recursive: true })
    await fs.writeFile(path.join(discoveryDir, 'inventory.json'), '{}')
    await fs.writeFile(path.join(discoveryDir, 'semantic-inventory.json'), '{}')

    await regenerateDiscovery(tmpDir)

    await expect(fs.access(path.join(discoveryDir, 'inventory.json'))).rejects.toThrow()
    await expect(fs.access(path.join(discoveryDir, 'semantic-inventory.json'))).rejects.toThrow()
  })

  it('does not throw when discovery files are already absent', async () => {
    await expect(regenerateDiscovery(tmpDir)).resolves.toBeUndefined()
  })
})

describe('checkIdempotency', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'check-idempotency-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('returns empty warnings and skipPaths when nothing was edited', async () => {
    const relPath = 'discovery/inventory.json'
    const content = '{"data": 1}'
    const absPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, content)

    const manifest = makeManifest({ [relPath]: sha256(content) })
    const result = await checkIdempotency(tmpDir, manifest, [relPath])

    expect(result.warnings).toHaveLength(0)
    expect(result.skipPaths.size).toBe(0)
  })

  it('emits warning and adds to skipPaths when file was edited', async () => {
    const relPath = 'discovery/inventory.json'
    const absPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    await fs.writeFile(absPath, '{"edited": true}')

    const manifest = makeManifest({ [relPath]: sha256('{"original": true}') })
    const result = await checkIdempotency(tmpDir, manifest, [relPath])

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.reason).toBe('checksum-mismatch')
    expect(result.warnings[0]?.message).toContain('foi editado')
    expect(result.skipPaths.has(relPath)).toBe(true)
  })

  it('emits plan-preserved warning for active/ paths', async () => {
    const relPath = 'docs/exec-plans/active/2026-05-14-design.md'
    const manifest = makeManifest({})
    const result = await checkIdempotency(tmpDir, manifest, [relPath])

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.reason).toBe('plan-preserved')
    expect(result.warnings[0]?.message).toContain('preservando')
    expect(result.skipPaths.has(relPath)).toBe(true)
  })
})
