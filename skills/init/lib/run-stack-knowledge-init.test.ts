import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runStackKnowledgeInit } from './run-stack-knowledge-init'
import { AbortError } from './steps/abort-error'

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

  // M2.6 — primary detectada + matrix ausente → AbortError bloqueante (SH-01, fase-05 cutover)
  // Antes da fase-05: copyKnowledge retornava no-source e patch nullificava primary em stack.json.
  // Apos fase-05: primary != null + matrix ausente lanca AbortError (nao retorna no-source).
  it('M2.6: primary detectado + matrix ausente → AbortError lançado (SH-01 cutover behavior)', async () => {
    // Setup: package.json com TypeScript → primary=nodejs-typescript, pluginRoot sem knowledge/
    writeFileSync(join(targetDir, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }))
    const emptyPluginRoot = mkdtempSync(join(tmpdir(), 'empty-plugin-'))

    try {
      await expect(
        runStackKnowledgeInit({
          targetDir,
          pluginRoot: emptyPluginRoot, // sem knowledge/ → AbortError (primary != null)
          logger: (line) => captured.push(line),
        }),
      ).rejects.toThrow(AbortError)
    } finally {
      rmSync(emptyPluginRoot, { recursive: true, force: true })
    }
  })

  // M2.4 — Go detection: informative message when go.mod found but no matrix
  it('M2.4: go.mod detected → emits informative message about matrix unavailability', async () => {
    writeFileSync(join(targetDir, 'go.mod'), 'module example.com/app\n')

    await runStackKnowledgeInit({
      targetDir,
      pluginRoot: PLUGIN_ROOT,
      logger: (line) => captured.push(line),
    })

    expect(captured.some(l => l.includes('go') && l.toLowerCase().includes('matrix'))).toBe(true)
  })

  // L1 — ISP ctx split: logger accepted as 2nd param ctx.logger
  it('L1: aceita logger via ctx 2º parâmetro (ISP split)', async () => {
    writeFileSync(join(targetDir, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }))
    writeFileSync(join(targetDir, 'tsconfig.json'), '{}')

    const ctxCaptured: string[] = []
    const result = await runStackKnowledgeInit(
      { targetDir, pluginRoot: PLUGIN_ROOT },
      { logger: (line) => ctxCaptured.push(line) },
    )

    expect(result.stackPrimary).toBe('nodejs-typescript')
    expect(ctxCaptured.some(l => l.includes('stack.json'))).toBe(true)
  })

  it('L1: backward-compat — logger em opts ainda funciona sem ctx', async () => {
    writeFileSync(join(targetDir, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }))

    const result = await runStackKnowledgeInit({
      targetDir,
      pluginRoot: PLUGIN_ROOT,
      logger: (line) => captured.push(line),
    })

    expect(result.stackPrimary).toBe('nodejs-typescript')
    expect(captured.some(l => l.includes('stack.json'))).toBe(true)
  })

  it('L1: ctx sem logger usa console.log (default silencioso)', async () => {
    const result = await runStackKnowledgeInit(
      { targetDir, pluginRoot: PLUGIN_ROOT },
      {},
    )
    // No error thrown — default logger (console.log) is used
    expect(result).toBeDefined()
  })
})
