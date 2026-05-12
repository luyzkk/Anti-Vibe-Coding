// 2026-05-11 (Luiz/dev): cobre RED da fase-01 + matriz de detection.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectV5Legacy } from './detect-v5-legacy'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'detect-v5')

async function reset(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(FIXTURE, { recursive: true })
}

describe('detectV5Legacy', () => {
  beforeEach(reset)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('returns isLegacy=false for empty directory', async () => {
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(false)
    expect(state.artifacts).toEqual([])
  })

  it('detects .planning/ with content', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), '# Foo\n', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(true)
    expect(state.artifacts).toContain('planning-dir')
  })

  it('does NOT count empty .planning/ as legacy', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(false)
  })

  it('detects lessons-learned.md alone', async () => {
    await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), '# Lessons\n', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(true)
    expect(state.artifacts).toEqual(['lessons-learned'])
  })

  it('detects all 4 artifacts when present', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning', 'x.md'), 'x', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), 'x', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'decisions.md'), 'x', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'senior-principles.md'), 'x', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.artifacts).toHaveLength(4)
    expect(state.isLegacy).toBe(true)
  })

  it('flags alreadyMigrated when docs/exec-plans/ exists', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning', 'x.md'), 'x', 'utf8')
    await fs.mkdir(path.join(FIXTURE, 'docs', 'exec-plans'), { recursive: true })
    const state = await detectV5Legacy(FIXTURE)
    expect(state.isLegacy).toBe(true)
    expect(state.alreadyMigrated).toBe(true)
  })

  it('returns absolute paths in state.paths', async () => {
    await fs.writeFile(path.join(FIXTURE, 'decisions.md'), 'x', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    expect(state.paths['decisions']).toContain('decisions.md')
    expect(path.isAbsolute(state.paths['decisions'] ?? '')).toBe(true)
  })
})
