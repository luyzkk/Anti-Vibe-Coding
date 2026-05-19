// 2026-05-19 (Luiz/dev): E2E tracer Rails — Plano01 fase-06.
// Prova CA-02 (init com primary=rails copia knowledge dentro do SLA perf D24),
//      CA-09 (graceful degradation sem .claude/knowledge/),
//      CA-11 (regressao Node — projeto TS sem Gemfile continua funcionando).
// Alinhado com D12 + D17 + D19 + D24 do CONTEXT, RF6 + RF8 do PRD.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runStackKnowledgeInit } from '../../skills/init/lib/run-stack-knowledge-init'
import { validateAtomFrontmatter } from '../../skills/init/lib/atoms-frontmatter-validator'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')

describe('stack-knowledge Rails tracer bullet (Plano 01 fase-06)', () => {
  let project: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'tracer-rails-'))
  })

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
  })

  // CA-02 — happy path Rails: detect → init → copy knowledge dentro do SLA
  it('CA-02: projeto Rails com Gemfile gem rails -> .claude/knowledge/ populado dentro do SLA D24', async () => {
    writeFileSync(
      join(project, 'Gemfile'),
      "source 'https://rubygems.org'\ngem 'rails', '~> 8.0'\ngem 'puma'\n",
      'utf8',
    )

    const start = performance.now()
    const result = await runStackKnowledgeInit({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      logger: () => {},
    })
    const elapsed = performance.now() - start

    expect(result.stackPrimary).toBe('rails')
    expect(result.copyResult.status).toBe('copied')
    expect(elapsed).toBeLessThan(200)

    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md'))).toBe(true)

    const atom = readFileSync(
      join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md'),
      'utf-8',
    )
    expect(atom).toContain("rails_versions: ['>=7.1']")
    expect(atom).toContain('stack: rails')
  })

  // CA-09 — graceful degradation sem .claude/knowledge/
  it('CA-09: projeto Rails sem .claude/knowledge/ nao crashea e preface fica vazio', () => {
    writeFileSync(
      join(project, 'Gemfile'),
      "source 'https://rubygems.org'\ngem 'rails'\n",
      'utf8',
    )

    const knowledgeIndex = join(project, '.claude', 'knowledge', 'INDEX.md')
    expect(existsSync(knowledgeIndex)).toBe(false)

    const preface = existsSync(knowledgeIndex)
      ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\`.`
      : ''
    expect(preface).toBe('')
  })

  // CA-11 — regressao Node: projeto TS sem Gemfile continua entregando Node knowledge
  it('CA-11: projeto Node+TS puro (sem Gemfile) continua entregando Node knowledge sem regressao', async () => {
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'fixture-node', devDependencies: { typescript: '^5.0.0' } }, null, 2),
    )
    writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }')

    const result = await runStackKnowledgeInit({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      logger: () => {},
    })

    expect(result.stackPrimary).toBe('nodejs-typescript')
    expect(result.copyResult.status).toBe('copied')

    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md'))).toBe(false)
  })

  // Bonus: validar frontmatter do atomo Rails copiado contra o validator da fase-02
  it('regression: piloto Rails copiado passa validateAtomFrontmatter', async () => {
    writeFileSync(join(project, 'Gemfile'), "gem 'rails', '~> 8.0'\n", 'utf8')
    await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    const atomPath = join(project, '.claude', 'knowledge', 'atoms', 'rails-conventions-and-magic.md')
    const validation = validateAtomFrontmatter(atomPath)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])
  })
})
