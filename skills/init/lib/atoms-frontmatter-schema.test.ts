// 2026-05-18 (Luiz/dev): RF4 + CA-10 — schema aceita rails_versions opcional sem invalidar Node atoms.
// Alinhado com D13 (versionamento Rails no frontmatter) + D18 (formato array semver-style) do CONTEXT.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateAtomFrontmatter } from './atoms-frontmatter-validator'

const SEMVER_RANGE = /^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/

describe('atom frontmatter schema — rails_versions optional', () => {
  let fixture: string
  beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'atom-schema-')) })
  afterEach(() => { rmSync(fixture, { recursive: true, force: true }) })

  it('CA-10: Node atom sem rails_versions continua válido (retrocompat)', () => {
    const nodeAtom = [
      '---',
      'topic: type-system-idioms',
      'stack: nodejs-typescript',
      'layer: both',
      'sources:',
      '  - research: f8f4e50c (claude-code/knowledge/Nodejs/x.md)',
      'tier: 1',
      'triggers: [type, generic]',
      'related_skills: [/design-patterns]',
      'updated: 2026-05-16',
      '---',
      '# Type System Idioms',
    ].join('\n')
    writeFileSync(join(fixture, 'node-atom.md'), nodeAtom)
    const result = validateAtomFrontmatter(join(fixture, 'node-atom.md'))
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('Rails atom com rails_versions: [">=7.1"] é válido', () => {
    const railsAtom = [
      '---',
      'topic: rails-conventions-and-magic',
      'stack: rails',
      'layer: both',
      'sources:',
      '  - skill: rails-stack-conventions (claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md)',
      'tier: 1',
      'triggers: [CoC, DRY, Zeitwerk, ActiveSupport]',
      'related_skills: [/architecture, /design-patterns]',
      'updated: 2026-05-18',
      "rails_versions: ['>=7.1']",
      '---',
      '# Rails Conventions',
    ].join('\n')
    writeFileSync(join(fixture, 'rails-atom.md'), railsAtom)
    const result = validateAtomFrontmatter(join(fixture, 'rails-atom.md'))
    expect(result.valid).toBe(true)
  })

  it('Rails atom com rails_versions como string (formato errado D18) é inválido', () => {
    const badAtom = [
      '---',
      'topic: x',
      'stack: rails',
      'layer: both',
      'sources: []',
      'tier: 1',
      'triggers: []',
      'related_skills: []',
      'updated: 2026-05-18',
      "rails_versions: '>=7.1'", // string, não array — REJEITAR
      '---',
    ].join('\n')
    writeFileSync(join(fixture, 'bad-string.md'), badAtom)
    const result = validateAtomFrontmatter(join(fixture, 'bad-string.md'))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('rails_versions'))).toBe(true)
  })

  it('Rails atom com rails_versions vazio é inválido', () => {
    const badAtom = [
      '---',
      'topic: x',
      'stack: rails',
      'layer: both',
      'sources: []',
      'tier: 1',
      'triggers: []',
      'related_skills: []',
      'updated: 2026-05-18',
      'rails_versions: []', // array vazio — REJEITAR (se tem o campo, precisa ter conteúdo)
      '---',
    ].join('\n')
    writeFileSync(join(fixture, 'bad-empty.md'), badAtom)
    const result = validateAtomFrontmatter(join(fixture, 'bad-empty.md'))
    expect(result.valid).toBe(false)
    // 2026-08-18 (Luiz/dev): assercao do MOTIVO, nao so do veredito. Este fixture tinha o typo
    // `triggers: [],` e o teste passava por YAML malformado, sem nunca exercitar o array vazio.
    expect(result.errors.some(e => e.includes('must not be empty'))).toBe(true)
  })

  it('Rails atom com range malformado é inválido (CA-10 robustez)', () => {
    const badAtom = [
      '---',
      'topic: x', 'stack: rails', 'layer: both', 'sources: []',
      'tier: 1', 'triggers: []', 'related_skills: []', 'updated: 2026-05-18',
      "rails_versions: ['rails-7-and-newer']", // texto livre, não bate SEMVER_RANGE
      '---',
    ].join('\n')
    writeFileSync(join(fixture, 'bad-format.md'), badAtom)
    const result = validateAtomFrontmatter(join(fixture, 'bad-format.md'))
    expect(result.valid).toBe(false)
  })
})

describe('atom frontmatter schema — fixture combinada Node + Rails', () => {
  it('CA-10: valida 14 átomos Node existentes + 2 átomos Rails dummy juntos (100% pass)', () => {
    // 2026-05-18 (Luiz/dev): regression combinada — schema estendido NÃO quebra átomos Node existentes
    const nodeAtomsDir = join(import.meta.dir, '..', '..', '..', 'knowledge/nodejs-typescript/atoms')
    const railsFixtureDir = join(import.meta.dir, '__fixtures__', 'rails-atoms-dummy')

    const nodeAtoms = require('node:fs').readdirSync(nodeAtomsDir).filter((f: string) => f.endsWith('.md'))
    const railsAtoms = require('node:fs').readdirSync(railsFixtureDir).filter((f: string) => f.endsWith('.md'))

    expect(nodeAtoms.length).toBe(14)
    expect(railsAtoms.length).toBe(2)

    for (const f of nodeAtoms) {
      const r = validateAtomFrontmatter(join(nodeAtomsDir, f))
      expect(r.valid, `Node atom ${f} falhou: ${r.errors.join(', ')}`).toBe(true)
    }
    for (const f of railsAtoms) {
      const r = validateAtomFrontmatter(join(railsFixtureDir, f))
      expect(r.valid, `Rails dummy ${f} falhou: ${r.errors.join(', ')}`).toBe(true)
    }
  })
})

// 2026-08-18 (Luiz/dev): TODO.md #6 — CRLF. validateAtomFrontmatter le o arquivo com readFileSync
// e passa direto para extractFrontmatter, sem normalizar \r\n. Atom salvo no Windows sem
// .editorconfig era rejeitado com "missing frontmatter block" estando visualmente correto.
// Ref: docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md
describe('atom frontmatter — CRLF (Windows line endings)', () => {
  let fixture: string
  beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'atom-crlf-')) })
  afterEach(() => { rmSync(fixture, { recursive: true, force: true }) })

  const ATOM_LINES = [
    '---',
    'topic: type-system-idioms',
    'stack: nodejs-typescript',
    'layer: both',
    'sources:',
    '  - research: f8f4e50c (claude-code/knowledge/Nodejs/x.md)',
    'tier: 1',
    'triggers: [type, generic]',
    'related_skills: [/design-patterns]',
    'updated: 2026-05-16',
    '---',
    '# Type System Idioms',
  ]

  it('accepts an atom saved with CRLF', () => {
    writeFileSync(join(fixture, 'crlf-atom.md'), ATOM_LINES.join('\r\n'))
    const result = validateAtomFrontmatter(join(fixture, 'crlf-atom.md'))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('validates rails_versions of a CRLF atom', () => {
    const railsAtom = [...ATOM_LINES]
    railsAtom.splice(railsAtom.length - 2, 0, 'rails_versions: [">=7.1"]')
    writeFileSync(join(fixture, 'crlf-rails-atom.md'), railsAtom.join('\r\n'))
    const result = validateAtomFrontmatter(join(fixture, 'crlf-rails-atom.md'))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })
})

// 2026-08-18 (Luiz/dev): TODO.md #3 — migracao do parser hand-rolled (regex por campo +
// split manual de array inline) para js-yaml/CORE_SCHEMA, mesmo caminho que o
// scripts/compound-check.ts tomou em 2026-05-13. Fixa o que muda e o que nao muda.
describe('atom frontmatter — parser YAML (TODO #3)', () => {
  let fixture: string
  beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'atom-yaml-')) })
  afterEach(() => { rmSync(fixture, { recursive: true, force: true }) })

  const BASE = [
    'topic: x',
    'stack: rails',
    'layer: both',
    'sources: []',
    'tier: 1',
    'triggers: []',
    'related_skills: []',
    'updated: 2026-05-18',
  ]

  function writeAtom(name: string, extra: string[] = []): string {
    writeFileSync(join(fixture, name), ['---', ...BASE, ...extra, '---', '# Body'].join('\n'))
    return join(fixture, name)
  }

  it('YAML malformado vira erro de validacao, nao excecao', () => {
    writeFileSync(join(fixture, 'broken.md'), ['---', 'topic: [', '---'].join('\n'))
    let result: ReturnType<typeof validateAtomFrontmatter> | null = null
    expect(() => { result = validateAtomFrontmatter(join(fixture, 'broken.md')) }).not.toThrow()
    expect(result!.valid).toBe(false)
    expect(result!.errors.join(' ')).toMatch(/YAML/i)
  })

  it('rails_versions em bloco e aceito (era rejeitado pelo parser antigo, que so via array inline)', () => {
    const p = writeAtom('block.md', ['rails_versions:', '  - ">=7.1"'])
    const result = validateAtomFrontmatter(p)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('rails_versions com item nao-string e invalido', () => {
    const p = writeAtom('numeric.md', ['rails_versions: [7.1]'])
    expect(validateAtomFrontmatter(p).valid).toBe(false)
  })

  it('frontmatter que nao e um mapa e invalido', () => {
    writeFileSync(join(fixture, 'seq.md'), ['---', '- a', '- b', '---'].join('\n'))
    const result = validateAtomFrontmatter(join(fixture, 'seq.md'))
    expect(result.valid).toBe(false)
  })

  it('campo presente com valor vazio continua contando como presente', () => {
    // Contrato do parser antigo: hasField so olhava `^campo:`, sem inspecionar o valor.
    const p = writeAtom('empty-value.md', [])
    expect(validateAtomFrontmatter(p).valid).toBe(true)
  })
})

// 2026-08-30 (Luiz/dev): python_versions opcional, mesmo contrato de rails_versions —
// D9/RF3 + CA-03 do PRD stack-knowledge-python. RED escrito antes da implementação.
describe('atom frontmatter schema — python_versions optional', () => {
  let fixture: string
  beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'atom-py-schema-')) })
  afterEach(() => { rmSync(fixture, { recursive: true, force: true }) })

  const PY_BASE = [
    'topic: async-and-concurrency',
    'stack: python',
    'layer: backend',
    'sources:',
    '  - Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md',
    'tier: 1',
    'triggers: [asyncio, TaskGroup, GIL]',
    'related_skills: [/system-design]',
    'updated: 2026-08-30',
  ]

  function writePyAtom(name: string, extra: string[] = []): string {
    writeFileSync(join(fixture, name), ['---', ...PY_BASE, ...extra, '---', '# Body'].join('\n'))
    return join(fixture, name)
  }

  it("aceita python_versions: ['>=3.11'] (array semver-style, D9)", () => {
    const result = validateAtomFrontmatter(writePyAtom('ok-311.md', ["python_versions: ['>=3.11']"]))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("aceita python_versions: ['>=3.13'] (padrões 3.13-only: TypeIs, free-threading)", () => {
    expect(validateAtomFrontmatter(writePyAtom('ok-313.md', ["python_versions: ['>=3.13']"])).valid).toBe(true)
  })

  it('átomo python SEM python_versions continua válido (campo é opcional)', () => {
    expect(validateAtomFrontmatter(writePyAtom('no-field.md')).valid).toBe(true)
  })

  it('rejeita python_versions como string (CA-03: erro claro, não veredito seco)', () => {
    const result = validateAtomFrontmatter(writePyAtom('bad-string.md', ["python_versions: '>=3.11'"]))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('python_versions') && e.includes('array'))).toBe(true)
  })

  it('rejeita python_versions array vazio', () => {
    const result = validateAtomFrontmatter(writePyAtom('bad-empty.md', ['python_versions: []']))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must not be empty'))).toBe(true)
  })

  it('rejeita range texto-livre e item não-string', () => {
    expect(validateAtomFrontmatter(writePyAtom('bad-free.md', ["python_versions: ['python-3-and-newer']"])).valid).toBe(false)
    expect(validateAtomFrontmatter(writePyAtom('bad-num.md', ['python_versions: [3.11]'])).valid).toBe(false)
  })

  it('valida python_versions em átomo salvo com CRLF (compound 2026-05-19)', () => {
    const lines = ['---', ...PY_BASE, "python_versions: ['>=3.11']", '---', '# Body']
    writeFileSync(join(fixture, 'crlf.md'), lines.join('\r\n'))
    const result = validateAtomFrontmatter(join(fixture, 'crlf.md'))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })
})
