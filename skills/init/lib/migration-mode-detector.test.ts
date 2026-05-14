// 2026-05-14 (Luiz/dev): TDD RED — migration-mode-detector fase-02.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectInitMode } from './migration-mode-detector'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'detect-init-mode')

async function reset(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(FIXTURE, { recursive: true })
}

describe('detectInitMode', () => {
  beforeEach(reset)
  afterEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
  })

  it('returns greenfield when no docs and no manifest and no legacy artifacts', async () => {
    const result = await detectInitMode(FIXTURE)
    expect(result.mode).toBe('greenfield')
    expect(result.signals).toHaveLength(0)
  })

  it('returns already-initiated when .claude/.anti-vibe-manifest.json exists', async () => {
    await fs.mkdir(path.join(FIXTURE, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(FIXTURE, '.claude', '.anti-vibe-manifest.json'),
      JSON.stringify({ version: '6.1.0' }),
      'utf8'
    )
    const result = await detectInitMode(FIXTURE)
    expect(result.mode).toBe('already-initiated')
    expect(result.signals.some(s => s.type === 'manifest-present')).toBe(true)
  })

  it('returns v5-legacy when .planning/ dir has content', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning', 'PLAN.md'), '# Plan\n', 'utf8')
    const result = await detectInitMode(FIXTURE)
    expect(result.mode).toBe('v5-legacy')
    expect(result.signals.some(s => s.type === 'v5-artifacts')).toBe(true)
  })

  it('returns migration when docs has 5+ non-harness md files and no manifest', async () => {
    const designDocsDir = path.join(FIXTURE, 'docs', 'design-docs')
    await fs.mkdir(designDocsDir, { recursive: true })
    for (let i = 1; i <= 5; i++) {
      await fs.writeFile(path.join(designDocsDir, `ADR-00${i}.md`), `# ADR ${i}\n`, 'utf8')
    }
    const result = await detectInitMode(FIXTURE)
    expect(result.mode).toBe('migration')
  })

  it('returns greenfield when docs has only harness scaffold READMEs', async () => {
    const harnessMarkers = [
      'docs/exec-plans/active/README.md',
      'docs/exec-plans/completed/README.md',
      'docs/compound/README.md',
      'docs/review-checklists/README.md',
      'docs/smoke-flows/README.md',
      'docs/references/README.md',
    ]
    for (const rel of harnessMarkers) {
      const full = path.join(FIXTURE, rel)
      await fs.mkdir(path.dirname(full), { recursive: true })
      await fs.writeFile(full, '# Scaffold\n', 'utf8')
    }
    const result = await detectInitMode(FIXTURE)
    expect(result.mode).toBe('greenfield')
  })

  it('includes signal describing which docs triggered migration detection', async () => {
    const designDocsDir = path.join(FIXTURE, 'docs', 'design-docs')
    await fs.mkdir(designDocsDir, { recursive: true })
    for (let i = 1; i <= 5; i++) {
      await fs.writeFile(path.join(designDocsDir, `ADR-00${i}.md`), `# ADR ${i}\n`, 'utf8')
    }
    const result = await detectInitMode(FIXTURE)
    const populatedSignal = result.signals.find(s => s.type === 'populated-docs')
    expect(populatedSignal).toBeDefined()
    expect(populatedSignal?.count).toBeGreaterThanOrEqual(5)
  })
})
