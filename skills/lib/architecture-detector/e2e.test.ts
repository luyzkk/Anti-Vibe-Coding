import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { readSrcTree } from './read-src-tree'
import { detectArchitecture } from './detect-architecture'
import { writeArchitectureProfile } from './write-architecture-profile'
import { buildFixture, type FixtureName } from './__fixtures__/projects/build-fixture'

const tmpDirs: string[] = []
afterEach(() => {
  while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true })
})

function runFullFlow(fixture: FixtureName) {
  const cwd = buildFixture(fixture)
  tmpDirs.push(cwd)
  const srcResult = readSrcTree(cwd)
  if (srcResult.kind !== 'ok') throw new Error(`expected ok, got ${srcResult.kind}`)
  const reader = (path: string) => { try { return readFileSync(join(cwd, path), 'utf-8') } catch { return '' } }
  const result = detectArchitecture(srcResult.tree, reader)
  writeArchitectureProfile(result, cwd)
  return { cwd, result }
}

describe('Architecture Detector E2E', () => {
  test('CA-01: clean-architecture-ritual fixture detects with confidence >= 80%', () => {
    const { cwd, result } = runFullFlow('clean-arch')
    expect(result.profile).toBe('clean-architecture-ritual')
    expect(result.confidence).toBeGreaterThanOrEqual(80)
    const manifest = JSON.parse(readFileSync(join(cwd, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.architectureProfile.profile).toBe('clean-architecture-ritual')
  })

  test('mvc-flat fixture detects mvc-flat profile', () => {
    const { result } = runFullFlow('mvc-flat')
    expect(result.profile).toBe('mvc-flat')
    expect(result.confidence).toBeGreaterThanOrEqual(70)
  })

  test('vertical-slice fixture detects vertical-slice profile', () => {
    const { result } = runFullFlow('vertical-slice')
    expect(result.profile).toBe('vertical-slice')
    expect(result.confidence).toBeGreaterThanOrEqual(70)
  })

  test('nextjs fixture detects nextjs-app-router profile (G1)', () => {
    const { result } = runFullFlow('nextjs')
    expect(result.profile).toBe('nextjs-app-router')
    expect(result.confidence).toBeGreaterThanOrEqual(70)
  })

  test('unknown fixture detects unknown-mixed with low confidence', () => {
    const { result } = runFullFlow('unknown')
    expect(result.profile).toBe('unknown-mixed')
    expect(result.confidence).toBeLessThan(80)
  })

  test('all 5 profiles produce manifest with valid schemaVersion', () => {
    for (const name of ['clean-arch', 'mvc-flat', 'vertical-slice', 'nextjs', 'unknown'] as FixtureName[]) {
      const { cwd } = runFullFlow(name)
      const manifest = JSON.parse(readFileSync(join(cwd, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
      expect(manifest.architectureProfile.schemaVersion).toBe(1)
    }
  })

  test('all 5 profiles produce architecture-profile.md', () => {
    for (const name of ['clean-arch', 'mvc-flat', 'vertical-slice', 'nextjs', 'unknown'] as FixtureName[]) {
      const { cwd } = runFullFlow(name)
      const md = readFileSync(join(cwd, '.claude/architecture-profile.md'), 'utf-8')
      expect(md.length).toBeGreaterThan(50)
    }
  })

  test('end-to-end flow completes in < 500ms per fixture (RNF performance)', () => {
    const start = performance.now()
    runFullFlow('nextjs')
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
  })
})
