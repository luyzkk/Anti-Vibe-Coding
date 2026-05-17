import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runStackKnowledgeInit } from './run-stack-knowledge-init'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..', '..')

describe('runStackKnowledgeInit (Wave 5 D2)', () => {
  let targetDir: string
  let captured: string[]

  beforeEach(() => {
    targetDir = mkdtempSync(join(tmpdir(), 'rski-'))
    captured = []
  })
  afterEach(() => {
    rmSync(targetDir, { recursive: true, force: true })
  })

  it('orquestra detect + write-stack-json + copy + telemetry + preview em projeto Node+TS', async () => {
    writeFileSync(join(targetDir, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }))
    writeFileSync(join(targetDir, 'tsconfig.json'), '{}')

    const result = await runStackKnowledgeInit({
      targetDir,
      pluginRoot: PLUGIN_ROOT,
      logger: (line) => captured.push(line),
    })

    expect(result.stackPrimary).toBe('nodejs-typescript')
    expect(existsSync(join(targetDir, '.claude/stack.json'))).toBe(true)
    expect(existsSync(join(targetDir, '.claude/knowledge/INDEX.md'))).toBe(true)
    expect(readdirSync(join(targetDir, '.claude/knowledge/atoms')).filter(f => f.endsWith('.md')).length).toBe(14)
    expect(result.previewEmitted).toBe(true)
    expect(captured.some(l => l.includes('Knowledge cobre:'))).toBe(true)
  })

  it('previewEmitted=false quando INDEX ausente (no-source)', async () => {
    // projeto sem anchor → primary null → no-source
    const result = await runStackKnowledgeInit({
      targetDir,
      pluginRoot: PLUGIN_ROOT,
      logger: (line) => captured.push(line),
    })
    expect(result.previewEmitted).toBe(false)
    expect(captured.some(l => l.startsWith('Knowledge cobre:'))).toBe(false)
  })

  it('aceita flag --refresh-knowledge via args', async () => {
    writeFileSync(join(targetDir, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }))
    // 1a run
    await runStackKnowledgeInit({ targetDir, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    // 2a run com refresh
    const result = await runStackKnowledgeInit({
      targetDir,
      pluginRoot: PLUGIN_ROOT,
      args: '--refresh-knowledge',
      logger: (line) => captured.push(line),
    })
    expect(result.copyResult.status).toBe('refreshed')
  })
})
