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
      'triggers: [],',
      'related_skills: []',
      'updated: 2026-05-18',
      'rails_versions: []', // array vazio — REJEITAR (se tem o campo, precisa ter conteúdo)
      '---',
    ].join('\n')
    writeFileSync(join(fixture, 'bad-empty.md'), badAtom)
    const result = validateAtomFrontmatter(join(fixture, 'bad-empty.md'))
    expect(result.valid).toBe(false)
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
    const nodeAtomsDir = join(import.meta.dir, '..', '..', '..', 'docs/knowledge/nodejs-typescript/atoms')
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
