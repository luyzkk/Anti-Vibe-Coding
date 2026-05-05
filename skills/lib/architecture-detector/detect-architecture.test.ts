import { describe, expect, test } from 'bun:test'
import { detectArchitecture } from './detect-architecture'
import { TREE_CLEAN_ARCH, TREE_NEXTJS, TREE_UNKNOWN } from './__fixtures__/folder-trees'
import { FILES_CLEAN_ARCH, FILES_NEXTJS } from './__fixtures__/sample-files'

describe('detectArchitecture', () => {
  test('detects clean-architecture-ritual with confidence >= 80% (CA-01)', () => {
    const reader = (path: string) => FILES_CLEAN_ARCH[path] ?? ''
    const result = detectArchitecture(TREE_CLEAN_ARCH, reader)
    expect(result.profile).toBe('clean-architecture-ritual')
    expect(result.confidence).toBeGreaterThanOrEqual(80)
    expect(result.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('detects nextjs-app-router from canonical fixture', () => {
    const reader = (path: string) => FILES_NEXTJS[path] ?? ''
    const result = detectArchitecture(TREE_NEXTJS, reader)
    expect(result.profile).toBe('nextjs-app-router')
  })

  test('returns unknown-mixed with low confidence for ambiguous tree', () => {
    const result = detectArchitecture(TREE_UNKNOWN, () => '')
    expect(result.profile).toBe('unknown-mixed')
    expect(result.confidence).toBeLessThan(80)
  })

  test('combines folder + import signals into result.signals', () => {
    const reader = (path: string) => FILES_CLEAN_ARCH[path] ?? ''
    const result = detectArchitecture(TREE_CLEAN_ARCH, reader)
    expect(result.signals.folderSignals.length).toBeGreaterThan(0)
    expect(result.signals.importSignals.length).toBeGreaterThan(0)
  })

  test('detectedAt is ISO 8601 string', () => {
    const result = detectArchitecture(TREE_UNKNOWN, () => '')
    expect(() => new Date(result.detectedAt).toISOString()).not.toThrow()
  })
})
