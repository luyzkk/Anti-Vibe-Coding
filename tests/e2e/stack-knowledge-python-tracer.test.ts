// 2026-08-30 (Luiz/dev): E2E tracer Python — Plano01 fase-04.
// Prova CA-02 (init primary=python copia INDEX + piloto SEM AbortError — mata o bug
//   copy-knowledge.ts:81 com matrix mapeada e pasta ausente),
//      CA-11 (requirements-only detecta e copia),
//      regressao Node (projeto TS puro segue intacto).
// Alinhado com D10 + Premissa 1 do PRD stack-knowledge-python, RF6.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runStackKnowledgeInit } from '../../skills/init/lib/run-stack-knowledge-init'
import { validateAtomFrontmatter } from '../../skills/init/lib/atoms-frontmatter-validator'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')
const FASTAPI_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-fastapi-fixture')
const REQUIREMENTS_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-requirements-fixture')

describe('stack-knowledge Python tracer bullet (Plano 01 fase-04)', () => {
  let project: string

  beforeEach(() => { project = mkdtempSync(join(tmpdir(), 'tracer-python-')) })
  afterEach(() => { rmSync(project, { recursive: true, force: true }) })

  it('CA-02: fixture FastAPI -> primary=python, INDEX + piloto copiados, SEM AbortError', async () => {
    // G6: copiar fixture -> tmpdir; init grava .claude/ no target e a fixture fica imutavel
    cpSync(FASTAPI_FIXTURE, project, { recursive: true })

    // A resolucao sem throw E a prova anti-AbortError (copy-knowledge.ts:81 lancava aqui)
    const result = await runStackKnowledgeInit({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      logger: () => {},
    })

    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    // G5: atomCount dinamico >= 1 — NAO hardcodear 18 (e2e full do Plano 04 valida 18/18)
    expect(result.copyResult.atomCount).toBeGreaterThanOrEqual(1)

    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'))).toBe(true)

    const atom = readFileSync(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'), 'utf-8')
    expect(atom).toContain('stack: python')
    expect(atom).toContain("python_versions: ['>=3.11']")

    // CA-04 lado negativo (forward-compat com fase-05): >=3.12 nunca gera warning de versao
    expect(result.warnings).toBeUndefined()
  })

  it('CA-11: requirements-only -> python detectado, knowledge copiado, sem warning de versao', async () => {
    cpSync(REQUIREMENTS_FIXTURE, project, { recursive: true })

    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(result.warnings).toBeUndefined()
  })

  it('regressao Node: projeto TS puro continua entregando Node knowledge, nada de python', async () => {
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'fixture-node', devDependencies: { typescript: '^5.0.0' } }, null, 2),
    )
    writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }')

    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    expect(result.stackPrimary).toBe('nodejs-typescript')
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'))).toBe(false)
  })

  it('regression: piloto copiado passa validateAtomFrontmatter (loop fase-02 -> fase-03 fechado)', async () => {
    cpSync(FASTAPI_FIXTURE, project, { recursive: true })
    await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    const validation = validateAtomFrontmatter(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'))
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
  })
})
