// 2026-05-17 (Luiz/dev): RF11 snapshot — todos os 14 átomos têm audit-trail-path em sources (PRD §Could Haves)
import { describe, it, expect } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

describe('RF11 — audit-trail paths em sources', () => {
  it('todos os 14 átomos têm pelo menos um path absoluto entre parênteses em sources:', () => {
    const atomsDir = join(import.meta.dir, '..', '..', '..', 'docs/knowledge/nodejs-typescript/atoms')
    const atoms = readdirSync(atomsDir).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(14)

    for (const atom of atoms) {
      const content = readFileSync(join(atomsDir, atom), 'utf-8')
      const sourcesBlock = content.match(/^sources:\s*\n([\s\S]*?)(?=^[a-z]+:|^---)/m)
      expect(sourcesBlock, `${atom} sem bloco sources:`).toBeTruthy()
      const hasAuditPath = /\(claude-code\/knowledge\/Nodejs\/[^)]+\)/.test(sourcesBlock![1])
      expect(hasAuditPath, `${atom}: sources: não contém audit-trail-path entre parênteses`).toBe(true)
    }
  })
})
