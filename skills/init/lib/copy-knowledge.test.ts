// 2026-05-16 (Luiz/dev): RED phase — Plano 01 fase-03, CA-02 + CA-04 setup.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyKnowledge } from './copy-knowledge'

describe('copyKnowledge (monostack)', () => {
  let project: string
  let pluginRoot: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'init-proj-'))
    pluginRoot = mkdtempSync(join(tmpdir(), 'plugin-'))
    // simula matrix: docs/knowledge/nodejs-typescript/{INDEX.md, atoms/type-system-idioms.md}
    mkdirSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms'), { recursive: true })
    writeFileSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'INDEX.md'), '# fake INDEX')
    writeFileSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms', 'type-system-idioms.md'), '# fake atom')
  })

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
    rmSync(pluginRoot, { recursive: true, force: true })
  })

  it('copies INDEX + atoms when primary is nodejs-typescript and destination absent', async () => {
    const result = await copyKnowledge({ projectRoot: project, pluginRoot, primary: 'nodejs-typescript' })
    expect(result.status).toBe('copied')
    if (result.status === 'copied') {
      expect(result.atomCount).toBe(1)
    }
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
  })

  it('skips when .claude/knowledge already exists (CA-04 idempotent default)', async () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'sentinel.md'), 'existing')
    const result = await copyKnowledge({ projectRoot: project, pluginRoot, primary: 'nodejs-typescript' })
    expect(result.status).toBe('skipped')
    expect(readFileSync(join(project, '.claude', 'knowledge', 'sentinel.md'), 'utf8')).toBe('existing')
  })

  it('noops when primary is null (unknown stack)', async () => {
    const result = await copyKnowledge({ projectRoot: project, pluginRoot, primary: null })
    expect(result.status).toBe('noop')
    expect(existsSync(join(project, '.claude', 'knowledge'))).toBe(false)
  })
})
