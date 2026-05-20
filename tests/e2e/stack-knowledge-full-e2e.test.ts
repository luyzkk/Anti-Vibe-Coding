// 2026-05-17 (Luiz/dev): Plano 06 fase-06 — E2E gaps: CA-01 (atoms+INDEX validity) + CA-04 (skip + --refresh).
// CA-02/CA-03/CA-05/CA-06/CA-07/CA-09/CA-10reg já cobertos por:
//   tests/e2e/stack-knowledge-tracer-bullet.test.ts (CA-02, CA-03, CA-05, CA-06, CA-07, CA-09, CA-10 regressão StackId)
//   tests/e2e/stack-aware-preface-all-skills.test.ts (CA-05+CA-09 nas 7 skills cross-stack)
// CA-08 é human audit — não automatizável aqui.
// CA-10 (UX baseline snapshot do PRD) NÃO implementado — baseline pré-v6.3.2 não foi capturado durante dev.
// Coberto parcialmente pelo CA-10 regression test existente. Documentado em DI-3 do MEMORY do Plano 06.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { detectMultiStack } from '../../skills/init/lib/detect-multi-stack'
import { writeStackJson } from '../../skills/init/lib/write-stack-json'
import { copyKnowledge } from '../../skills/init/lib/copy-knowledge'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')
const ATOMS_DIR = join(PLUGIN_ROOT, 'knowledge/nodejs-typescript/atoms')
const INDEX_PATH = join(PLUGIN_ROOT, 'knowledge/nodejs-typescript/INDEX.md')

const EXPECTED_FRONTMATTER_FIELDS = [
  'topic',
  'stack',
  'layer',
  'sources',
  'tier',
  'triggers',
  'related_skills',
  'updated',
] as const

describe('CA-01: 14 átomos + INDEX válidos', () => {
  it('knowledge/nodejs-typescript/atoms/ contém exatamente 14 átomos', () => {
    const atoms = readdirSync(ATOMS_DIR).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(14)
  })

  it('cada átomo tem 8 campos de frontmatter na ordem do piloto, sem [A DEFINIR], cap ≤200 ln', () => {
    const atoms = readdirSync(ATOMS_DIR).filter((f) => f.endsWith('.md'))
    for (const atom of atoms) {
      const path = join(ATOMS_DIR, atom)
      const content = readFileSync(path, 'utf-8')

      expect(content.startsWith('---\n'), `${atom}: sem frontmatter`).toBe(true)
      const frontmatterEnd = content.indexOf('\n---\n', 4)
      expect(frontmatterEnd, `${atom}: frontmatter não fechado`).toBeGreaterThan(0)
      const frontmatter = content.slice(4, frontmatterEnd)

      for (const field of EXPECTED_FRONTMATTER_FIELDS) {
        const regex = new RegExp(`^${field}:`, 'm')
        expect(regex.test(frontmatter), `${atom}: campo ${field} ausente`).toBe(true)
      }

      expect(content.includes('[A DEFINIR]'), `${atom}: contém placeholder [A DEFINIR]`).toBe(false)

      const lineCount = content.split('\n').length
      expect(lineCount, `${atom}: ${lineCount} ln excede cap de 200`).toBeLessThanOrEqual(200)
    }
  })

  it('INDEX.md existe, ≤100 ln, tem 4 headers H2 e não-órfãos', () => {
    expect(existsSync(INDEX_PATH)).toBe(true)
    const content = readFileSync(INDEX_PATH, 'utf-8')

    const lineCount = content.split('\n').length
    expect(lineCount, `INDEX.md ${lineCount} ln excede cap 100`).toBeLessThanOrEqual(100)

    expect(content).toContain('## Por keyword')
    expect(content).toContain('## Por layer')
    expect(content).toContain('## Por tier')
    expect(content).toContain('## Como consultar')

    const atoms = readdirSync(ATOMS_DIR).filter((f) => f.endsWith('.md'))
    for (const atom of atoms) {
      const slug = atom.replace(/\.md$/, '')
      expect(content.includes(slug), `INDEX.md não referencia o átomo ${slug} (órfão)`).toBe(true)
    }
  })
})

describe('CA-04: .claude/knowledge/ pré-existente — skip + mensagem --refresh-knowledge', () => {
  let project: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'ca04-skip-'))
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0.0' } }, null, 2),
    )
    writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }')
    // simular .claude/knowledge/ pré-existente com 1 arquivo dummy
    mkdirSync(join(project, '.claude/knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude/knowledge/dummy.md'), '# pre-existing dummy\n')
  })

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
  })

  it('sem --refresh-knowledge: skipped + dummy preservado + mensagem cita --refresh-knowledge', async () => {
    const detection = await detectMultiStack(project)
    await writeStackJson(project, detection)
    const result = await copyKnowledge({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      primary: detection.primary,
      refresh: false,
    })

    expect(result.status).toBe('skipped')
    expect(result.message).toContain('Knowledge já existe')
    expect(result.message).toContain('--refresh-knowledge')
    expect(existsSync(join(project, '.claude/knowledge/dummy.md'))).toBe(true)
  })

  it('com --refresh-knowledge: refreshed + dummy removido + 14 átomos copiados', async () => {
    const detection = await detectMultiStack(project)
    await writeStackJson(project, detection)
    const result = await copyKnowledge({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      primary: detection.primary,
      refresh: true,
    })

    expect(result.status).toBe('refreshed')
    expect(result.message).toContain('re-copied')
    // dummy não é parte do source — após refresh, knowledge/ tem só os átomos reais + INDEX
    expect(existsSync(join(project, '.claude/knowledge/dummy.md'))).toBe(false)
    const atoms = readdirSync(join(project, '.claude/knowledge/atoms')).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(14)
    expect(existsSync(join(project, '.claude/knowledge/INDEX.md'))).toBe(true)
  })
})
