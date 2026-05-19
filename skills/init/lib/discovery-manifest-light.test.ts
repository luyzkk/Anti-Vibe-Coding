import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { discoveryManifestLight } from './discovery-manifest-light'

const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'discovery-manifest-light')

describe('discoveryManifestLight', () => {
  it('returns empty entries on greenfield project', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'empty'))
    expect(result.entries).toHaveLength(0)
  })

  it('lists all markdown files with path + size + first100Lines', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    expect(result.entries.length).toBeGreaterThanOrEqual(5)
    for (const entry of result.entries) {
      expect(entry.path.endsWith('.md')).toBe(true)
      expect(entry.size).toBeGreaterThan(0)
      expect(entry.first100Lines.length).toBeGreaterThan(0)
    }
  })

  it('truncates first100Lines at line 100 for large docs', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    const large = result.entries.find(e => e.path.includes('large'))
    if (!large) return // fixture opcional
    const lineCount = large.first100Lines.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(101) // 100 lines + possible trailing empty
  })

  it('excludes node_modules, dist, _legacy', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    const excluded = result.entries.filter(e =>
      e.path.startsWith('node_modules/') ||
      e.path.startsWith('dist/') ||
      e.path.startsWith('_legacy/'),
    )
    expect(excluded).toHaveLength(0)
  })

  it('returns posix paths even on Windows', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    for (const entry of result.entries) {
      expect(entry.path).not.toContain('\\')
    }
  })

  it('returns entries sorted alphabetically by path', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    const paths = result.entries.map(e => e.path)
    const sorted = [...paths].sort((a, b) => a.localeCompare(b))
    expect(paths).toEqual(sorted)
  })

  it('result includes cwd and scannedAt fields', async () => {
    const cwd = path.join(FIXTURES, 'with-docs')
    const result = await discoveryManifestLight(cwd)
    expect(result.cwd).toBe(cwd)
    expect(typeof result.scannedAt).toBe('string')
    expect(result.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
