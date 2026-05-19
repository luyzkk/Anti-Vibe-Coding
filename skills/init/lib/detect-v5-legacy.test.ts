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

  // 2026-05-18 (Luiz/dev): Quick Plan init v6.4.x bug 1 — projetos v5 reais vivem em .claude/.
  describe('.claude/ scanning (bug 1)', () => {
    it('detects .claude/decisions.md, senior-principles.md, architecture-profile.md, PROJECT_MAP.md', async () => {
      await fs.mkdir(path.join(FIXTURE, '.claude'), { recursive: true })
      await fs.writeFile(path.join(FIXTURE, '.claude', 'decisions.md'), 'x', 'utf8')
      await fs.writeFile(path.join(FIXTURE, '.claude', 'senior-principles.md'), 'x', 'utf8')
      await fs.writeFile(path.join(FIXTURE, '.claude', 'architecture-profile.md'), 'x', 'utf8')
      await fs.writeFile(path.join(FIXTURE, '.claude', 'PROJECT_MAP.md'), 'x', 'utf8')

      const state = await detectV5Legacy(FIXTURE)
      expect(state.isLegacy).toBe(true)
      expect(state.artifacts).toContain('claude-decisions')
      expect(state.artifacts).toContain('claude-senior-principles')
      expect(state.artifacts).toContain('claude-architecture-profile')
      expect(state.artifacts).toContain('claude-project-map')
    })

    it('detects .claude/plans, tasks, knowledge, rules, prompts dirs when populated', async () => {
      for (const d of ['plans', 'tasks', 'knowledge', 'rules', 'prompts']) {
        await fs.mkdir(path.join(FIXTURE, '.claude', d), { recursive: true })
        await fs.writeFile(path.join(FIXTURE, '.claude', d, 'item.md'), 'x', 'utf8')
      }
      const state = await detectV5Legacy(FIXTURE)
      expect(state.artifacts).toEqual(
        expect.arrayContaining([
          'claude-plans-dir',
          'claude-tasks-dir',
          'claude-knowledge-dir',
          'claude-rules-dir',
          'claude-prompts-dir',
        ]),
      )
    })

    it('does NOT count empty .claude/plans/ as legacy', async () => {
      await fs.mkdir(path.join(FIXTURE, '.claude', 'plans'), { recursive: true })
      const state = await detectV5Legacy(FIXTURE)
      expect(state.isLegacy).toBe(false)
    })

    it('detects .claude/.anti-vibe-manifest.json.backup-v5.* as smoking gun', async () => {
      await fs.mkdir(path.join(FIXTURE, '.claude'), { recursive: true })
      await fs.writeFile(
        path.join(FIXTURE, '.claude', '.anti-vibe-manifest.json.backup-v5.2-20251010'),
        '{}',
        'utf8',
      )
      const state = await detectV5Legacy(FIXTURE)
      expect(state.isLegacy).toBe(true)
      expect(state.artifacts).toContain('claude-manifest-v5-backup')
    })

    it('detects .claude/.anti-vibe-manifest.json with pluginVersion 5.x', async () => {
      await fs.mkdir(path.join(FIXTURE, '.claude'), { recursive: true })
      await fs.writeFile(
        path.join(FIXTURE, '.claude', '.anti-vibe-manifest.json'),
        JSON.stringify({ pluginVersion: '5.2.1' }),
        'utf8',
      )
      const state = await detectV5Legacy(FIXTURE)
      expect(state.isLegacy).toBe(true)
      expect(state.artifacts).toContain('claude-manifest-v5')
    })

    it('does NOT flag .claude/.anti-vibe-manifest.json with pluginVersion 6.x', async () => {
      await fs.mkdir(path.join(FIXTURE, '.claude'), { recursive: true })
      await fs.writeFile(
        path.join(FIXTURE, '.claude', '.anti-vibe-manifest.json'),
        JSON.stringify({ pluginVersion: '6.3.2' }),
        'utf8',
      )
      const state = await detectV5Legacy(FIXTURE)
      expect(state.artifacts).not.toContain('claude-manifest-v5')
    })
  })
})
