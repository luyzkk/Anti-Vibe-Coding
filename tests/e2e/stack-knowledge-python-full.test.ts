// 2026-08-31 (Luiz/dev): suite E2E final Python — Plano 04 fase-07, RF9 do PRD stack-knowledge-python.
// Cobre CA-01/02/04/05/06/07/11 + RF14/RF15 pos-copia. CA-03 e unit (validador, Plano 01 fase-02);
// CA-08 e audit humano (fase-06); CA-09 e a suite global; CA-10 grep no verifier (fase-05).
// G22: aqui 18 e HARDCODED de proposito — fotografia final da matrix (o tracer usa >=1).

import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtempSync, cpSync, rmSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { detectMultiStack } from '../../skills/init/lib/detect-multi-stack'
import { runStackKnowledgeInit } from '../../skills/init/lib/run-stack-knowledge-init'
import { validateAtomFrontmatter } from '../../skills/init/lib/atoms-frontmatter-validator'
import { parseTopKeywords, TOP_N_KEYWORDS } from '../../skills/init/lib/format-knowledge-preview'
import { getStackKnowledgePreface } from '../../skills/security/lib/stack-aware-preface'

const pluginRoot = join(import.meta.dir, '..', '..')
const PYTHON_MATRIX = join(pluginRoot, 'knowledge/python')
const FASTAPI_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-fastapi-fixture')
const REQUIREMENTS_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-requirements-fixture')

const VERSION_WARNING =
  '⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar.'
const FRAMEWORK_NOTE =
  'ℹ️ Padrões web dos átomos são FastAPI-native. Átomos de linguagem/tooling servem qualquer Python.'

describe('Stack Knowledge Python — E2E full (RF9)', () => {
  let target = ''
  afterEach(() => {
    if (target) rmSync(target, { recursive: true, force: true })
    target = ''
  })

  // G6: init grava .claude/ no alvo — a fixture e sempre copiada, nunca usada in-place.
  const setup = (fixture: string): string => {
    const dest = mkdtempSync(join(tmpdir(), 'avc-py-full-'))
    cpSync(fixture, dest, { recursive: true })
    return dest
  }

  test('CA-01: matrix python com 18 átomos + INDEX <=100 linhas, H1 na linha 1', () => {
    const index = readFileSync(join(PYTHON_MATRIX, 'INDEX.md'), 'utf8')
    expect(index.split('\n').length).toBeLessThanOrEqual(100)
    // G18: getStackKnowledgePreface exige startsWith('# ') — habilita o CA-05 abaixo.
    expect(index.startsWith('# ')).toBe(true)
    const atoms = readdirSync(join(PYTHON_MATRIX, 'atoms')).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(18)
  })

  test('CA-02: /init na fixture FastAPI copia INDEX + 18 átomos SEM AbortError', async () => {
    target = setup(FASTAPI_FIXTURE)
    // A resolucao sem throw E a assercao: era aqui que copy-knowledge.ts:81 abortava o init.
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    expect(existsSync(join(target, '.claude/knowledge/INDEX.md'))).toBe(true)
    const atoms = readdirSync(join(target, '.claude/knowledge/atoms')).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(18)
  })

  test('RF9: 18/18 átomos da matrix passam validateAtomFrontmatter (sem exceções)', () => {
    const atomsDir = join(PYTHON_MATRIX, 'atoms')
    const failures: string[] = []
    for (const file of readdirSync(atomsDir).filter((f) => f.endsWith('.md'))) {
      const v = validateAtomFrontmatter(join(atomsDir, file))
      if (!v.valid) failures.push(`${file}: ${v.errors.join(', ')}`)
    }
    expect(failures).toEqual([])
  })

  test('RF5/CA-08: nenhum átomo continua marcado para audit humano', () => {
    const atomsDir = join(PYTHON_MATRIX, 'atoms')
    const stillFlagged = readdirSync(atomsDir)
      .filter((f) => f.endsWith('.md'))
      .filter((f) => readFileSync(join(atomsDir, f), 'utf8').includes('flagged_for_human_audit'))
    expect(stillFlagged).toEqual([])
  })

  test('RF15: keywords do INDEX copiado são parseáveis (top-8)', async () => {
    target = setup(FASTAPI_FIXTURE)
    await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    const keywords = await parseTopKeywords(join(target, '.claude/knowledge/INDEX.md'))
    expect(keywords.length).toBe(TOP_N_KEYWORDS)
    expect(keywords.every((k) => k.length > 0)).toBe(true)
  })

  test('CA-05: preface cita o INDEX copiado (sem overwrite-hack — G18 pagou)', async () => {
    target = setup(FASTAPI_FIXTURE)
    await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    const preface = getStackKnowledgePreface(target)
    expect(preface).not.toBe('')
    expect(preface).toContain('.claude/knowledge/INDEX.md')
  })

  test('CA-06: sem .claude/knowledge → preface vazio (graceful)', () => {
    target = setup(FASTAPI_FIXTURE)
    expect(getStackKnowledgePreface(target)).toBe('')
  })

  test('CA-04: requires-python >=3.9 → copiado + warning', async () => {
    target = setup(FASTAPI_FIXTURE)
    writeFileSync(
      join(target, 'pyproject.toml'),
      '[project]\nname = "legacy"\nversion = "0.1.0"\nrequires-python = ">=3.9"\ndependencies = ["fastapi"]\n',
    )
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.copyResult.status).toBe('copied') // warning nao bloqueia a copia
    expect(result.warnings).toContain(VERSION_WARNING)
  })

  test('CA-04 (lado negativo): fixture com >=3.12 → sem warning de versão', async () => {
    target = setup(FASTAPI_FIXTURE)
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.warnings).toBeUndefined()
  })

  test('RF14: django nas deps → nota FastAPI-native; fixture FastAPI → sem nota', async () => {
    target = setup(FASTAPI_FIXTURE)
    writeFileSync(
      join(target, 'pyproject.toml'),
      '[project]\nname = "djangoish"\nversion = "0.1.0"\nrequires-python = ">=3.12"\ndependencies = ["django>=5.0"]\n',
    )
    const withDjango = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(withDjango.notes).toContain(FRAMEWORK_NOTE)
    rmSync(target, { recursive: true, force: true })

    target = setup(FASTAPI_FIXTURE)
    const fastapiOnly = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(fastapiOnly.notes).toBeUndefined()
  })

  test('CA-07: monorepo Python+Node (maioria .py) → primary=python, só matrix python', async () => {
    target = setup(FASTAPI_FIXTURE) // ja traz pyproject + app/main.py
    writeFileSync(
      join(target, 'package.json'),
      JSON.stringify({ name: 'mono', devDependencies: { typescript: '^5.0.0' } }),
    )
    writeFileSync(join(target, 'index.ts'), 'export const x = 1')
    writeFileSync(join(target, 'extra.py'), 'X = 1') // garante maioria .py
    const multi = await detectMultiStack(target)
    expect(multi.primary).toBe('python')

    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(existsSync(join(target, '.claude/knowledge/atoms/async-and-concurrency.md'))).toBe(true)
    // atomo exclusivo da matrix Node — nao pode vazar para um projeto python
    expect(existsSync(join(target, '.claude/knowledge/atoms/type-system-idioms.md'))).toBe(false)
  })

  test('CA-11: requirements-only → detectado, copiado, sem warning de versão', async () => {
    target = setup(REQUIREMENTS_FIXTURE)
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    expect(result.warnings).toBeUndefined()
  })
})
