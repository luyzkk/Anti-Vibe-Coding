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

// 2026-08-30 (Luiz/dev): RF8 integracao + RF10 confirmacao — CA-04 do PRD stack-knowledge-python
describe('warning legado python + telemetria (RF8/RF10)', () => {
  const PY_WARNING = '⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar.'
  let project: string

  const pyproject = (name: string, requires: string): string =>
    `[project]\nname = "${name}"\nversion = "0.1.0"\nrequires-python = "${requires}"\ndependencies = ["fastapi"]\n`

  beforeEach(() => { project = mkdtempSync(join(tmpdir(), 'rski-py-')) })
  afterEach(() => { rmSync(project, { recursive: true, force: true }) })

  it('CA-04: pyproject requires-python >=3.9 -> knowledge copiado E warning presente', async () => {
    writeFileSync(join(project, 'pyproject.toml'), pyproject('legacy', '>=3.9'))
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    expect(result.copyResult.status).toBe('copied') // warning NAO bloqueia a copia
    expect(result.warnings).toContain(PY_WARNING)
  })

  it('CA-04: requires-python >=3.12 -> sem warning', async () => {
    writeFileSync(join(project, 'pyproject.toml'), pyproject('modern', '>=3.12'))
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    expect(result.warnings).toBeUndefined()
  })

  it('RF10: knowledge_copied emitido com stack=python e atom_count real (sem mudanca de codigo)', async () => {
    writeFileSync(join(project, 'pyproject.toml'), pyproject('telemetry', '>=3.12'))
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    // writeTelemetryDomainEvent grava em {targetDir}/.claude/metrics/{YYYY-MM}.jsonl
    const monthlyFile = join(project, '.claude', 'metrics', new Date().toISOString().slice(0, 7) + '.jsonl')
    const lines = readFileSync(monthlyFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const copied = lines.find((e) => e.evento === 'knowledge_copied')
    expect(copied).toBeDefined()
    expect(copied.stack).toBe('python')
    // G5: dinamico contra copyResult — NAO hardcodear 18 (nem 1)
    expect(copied.atom_count).toBe(result.copyResult.atomCount)
    expect(copied.atom_count).toBeGreaterThanOrEqual(1)
  })
})

// 2026-08-31 (Luiz/dev): RF14/D8 integracao — nota Django/Flask no canal `notes`
describe('nota Django/Flask no init (RF14/D8)', () => {
  const NOTE = 'ℹ️ Padrões web dos átomos são FastAPI-native. Átomos de linguagem/tooling servem qualquer Python.'
  let project: string

  beforeEach(() => { project = mkdtempSync(join(tmpdir(), 'rski-rf14-')) })
  afterEach(() => { rmSync(project, { recursive: true, force: true }) })

  it('django no pyproject -> notes contem a nota, knowledge copiado normalmente', async () => {
    writeFileSync(join(project, 'pyproject.toml'),
      '[project]\nname = "legacy-django"\nversion = "0.1.0"\nrequires-python = ">=3.12"\ndependencies = ["django>=5.0"]\n')
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied') // nota nao bloqueia a copia
    expect(result.notes).toContain(NOTE)
  })

  it('fastapi-only -> notes undefined', async () => {
    writeFileSync(join(project, 'pyproject.toml'),
      '[project]\nname = "modern"\nversion = "0.1.0"\nrequires-python = ">=3.12"\ndependencies = ["fastapi>=0.110"]\n')
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    expect(result.notes).toBeUndefined()
  })

  it('requirements-only com flask -> nota presente (sem pyproject)', async () => {
    writeFileSync(join(project, 'requirements.txt'), 'flask>=3.0\ngunicorn\n')
    writeFileSync(join(project, 'main.py'), 'from flask import Flask\n')
    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(result.notes).toContain(NOTE)
  })

  it('a nota vai para o logger (output user-facing do /init)', async () => {
    writeFileSync(join(project, 'pyproject.toml'),
      '[project]\nname = "x"\nversion = "0.1.0"\ndependencies = ["flask>=3.0"]\n')
    const captured: string[] = []
    await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: (l) => captured.push(l) })
    expect(captured.some((l) => l.includes('FastAPI-native'))).toBe(true)
  })
})
