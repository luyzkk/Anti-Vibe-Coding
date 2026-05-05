import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readSrcTree } from './read-src-tree'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'read-src-tree-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('readSrcTree', () => {
  test('returns ok with tree when src/ exists', () => {
    mkdirSync(join(tmpDir, 'src', 'domain'), { recursive: true })
    writeFileSync(join(tmpDir, 'src', 'domain', 'order.ts'), '')

    const result = readSrcTree(tmpDir)

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.tree.path).toBe('src')
      expect(result.tree.type).toBe('dir')
      expect(result.root).toContain('src')
    }
  })

  test('returns monorepo when packages/ exists at root (G3)', () => {
    mkdirSync(join(tmpDir, 'packages', 'core'), { recursive: true })

    const result = readSrcTree(tmpDir)

    expect(result.kind).toBe('monorepo')
    if (result.kind === 'monorepo') {
      expect(result.markerDir).toBe('packages')
    }
  })

  test('returns monorepo when apps/ exists at root (G3)', () => {
    mkdirSync(join(tmpDir, 'apps', 'web'), { recursive: true })

    const result = readSrcTree(tmpDir)

    expect(result.kind).toBe('monorepo')
    if (result.kind === 'monorepo') {
      expect(result.markerDir).toBe('apps')
    }
  })

  test('falls back to app/ when src/ absent (G6)', () => {
    mkdirSync(join(tmpDir, 'app', 'page.tsx').replace('page.tsx', ''), { recursive: true })
    writeFileSync(join(tmpDir, 'app', 'page.tsx'), '')

    const result = readSrcTree(tmpDir)

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.tree.path).toBe('app')
    }
  })

  test('falls back to lib/ when src/ and app/ absent (G6)', () => {
    mkdirSync(join(tmpDir, 'lib'), { recursive: true })
    writeFileSync(join(tmpDir, 'lib', 'utils.ts'), '')

    const result = readSrcTree(tmpDir)

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.tree.path).toBe('lib')
    }
  })

  test('returns no-src when no candidate directory found (G6)', () => {
    const result = readSrcTree(tmpDir)

    expect(result.kind).toBe('no-src')
    if (result.kind === 'no-src') {
      expect(result.cwd).toBe(tmpDir)
    }
  })

  test('excludes node_modules from tree walk', () => {
    mkdirSync(join(tmpDir, 'src', 'node_modules', 'lodash'), { recursive: true })
    mkdirSync(join(tmpDir, 'src', 'utils'), { recursive: true })
    writeFileSync(join(tmpDir, 'src', 'utils', 'format.ts'), '')

    const result = readSrcTree(tmpDir)

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      const childNames = result.tree.children?.map(c => c.path) ?? []
      expect(childNames).not.toContain('node_modules')
      expect(childNames).toContain('utils')
    }
  })
})
