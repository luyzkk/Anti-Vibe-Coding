// 2026-05-11 (Luiz/dev): valida que cada entry do manifest aponta para .tpl real.
// Previne drift: entries sem arquivo correspondente quebram fase-02 silenciosamente.
// 2026-05-14 (Luiz/dev): Plano 01 fase-01 — adiciona testes para campo category.
// 2026-05-24 (Luiz/dev): Plano 01 fase-02 — invariante R11 (compound roundtrip) + boundary D25.

import { describe, it, expect } from 'bun:test'
import { promises as fs, readFileSync } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST, TEMPLATES_ROOT } from './template-manifest'

describe('TEMPLATE_MANIFEST', () => {
  it('lists at least 25 templates (PRD M2: 14+ docs structure scaffold)', () => {
    expect(TEMPLATE_MANIFEST.length).toBeGreaterThanOrEqual(25)
  })

  it('all entries have a category field', () => {
    for (const entry of TEMPLATE_MANIFEST) {
      expect(entry.category).toBeDefined()
      expect(['canon-andre', 'anti-vibe-extension']).toContain(entry.category)
    }
  })

  // 2026-05-21 (Luiz/dev): contagem real 24 (drift pre-existente do "22 do Andre"; ARCHITECTURE.md
  // e AGENTS.md foram adicionados como canon-andre em PRD populate-plan-andre-port).
  it('has exactly 24 canon-andre entries', () => {
    const canon = TEMPLATE_MANIFEST.filter((e) => e.category === 'canon-andre')
    expect(canon.length).toBe(24)
  })

  // 2026-05-21 (Luiz/dev): 13 = 11 originais + harness-validate.ts + package.json (fix scaffold v7).
  it('has exactly 13 anti-vibe-extension entries', () => {
    const ext = TEMPLATE_MANIFEST.filter((e) => e.category === 'anti-vibe-extension')
    expect(ext.length).toBe(13)
  })

  // 2026-05-19 (Luiz/dev): MH-03 — entry CODE_STYLE.md presente no manifest.
  it('contains CODE_STYLE.md entry as anti-vibe-extension', () => {
    const entry = TEMPLATE_MANIFEST.find((e) => e.dst === 'docs/CODE_STYLE.md')
    expect(entry).toBeDefined()
    expect(entry?.category).toBe('anti-vibe-extension')
    expect(entry?.required).toBe(true)
    expect(entry?.src).toBe('docs/CODE_STYLE.md.tpl')
  })

  it('no entry is missing required field', () => {
    for (const entry of TEMPLATE_MANIFEST) {
      expect(typeof entry.required).toBe('boolean')
    }
  })

  it('every src points to a readable .tpl file', async () => {
    for (const entry of TEMPLATE_MANIFEST) {
      const fullPath = path.join(TEMPLATES_ROOT, entry.src)
      const stat = await fs.stat(fullPath)
      expect(stat.isFile()).toBe(true)
      expect(entry.src.endsWith('.tpl')).toBe(true)
    }
  })

  it('no duplicate dst paths', () => {
    const dsts = TEMPLATE_MANIFEST.map(e => e.dst)
    expect(new Set(dsts).size).toBe(dsts.length)
  })

  it('every required template ships in EN — no PT-BR diacritics in template body', async () => {
    const ptDiacritic = /[ãâáàçéêíóôõú]/i
    for (const entry of TEMPLATE_MANIFEST) {
      const body = await fs.readFile(path.join(TEMPLATES_ROOT, entry.src), 'utf8')
      expect(ptDiacritic.test(body)).toBe(false)
    }
  })
})

// 2026-05-24 (Luiz/dev): invariante R11 — PRD MH-04, fase-02 tracer bullet.
// Se este array mudar, golden de scaffold quebra. Fonte de verdade: código em template-manifest.ts.
const EXPECTED_COMPOUND_DSTS = [
  'docs/COMPOUND_ENGINEERING.md',
  'docs/compound/README.md',
  'docs/review-checklists/README.md',
  'docs/review-checklists/security.md',
  'docs/review-checklists/reliability.md',
  'docs/review-checklists/agent-api.md',
  'docs/review-checklists/frontend-ui.md',
  'docs/review-checklists/production-readiness.md',
  'docs/smoke-flows/README.md',
  'scripts/compound-check.ts',
]

describe('template-manifest — invariante compound (R11)', () => {
  it('as 10 entradas compound estao presentes', () => {
    const compoundDsts = TEMPLATE_MANIFEST
      .filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
      .map(e => e.dst)
    expect(compoundDsts.slice().sort()).toEqual(EXPECTED_COMPOUND_DSTS.slice().sort())
  })

  it('cada entrada compound tem required: true', () => {
    const compoundEntries = TEMPLATE_MANIFEST.filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
    for (const entry of compoundEntries) {
      expect(entry.required).toBe(true)
    }
  })

  it('classificacao preservada: 7 canon-andre + 3 anti-vibe-extension', () => {
    const compoundEntries = TEMPLATE_MANIFEST.filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
    const canon = compoundEntries.filter(e => e.category === 'canon-andre').length
    const ext = compoundEntries.filter(e => e.category === 'anti-vibe-extension').length
    expect(canon).toBe(7)
    expect(ext).toBe(3)
  })

  it('src de cada compound entry resolve para arquivo existente (roundtrip CA-03)', async () => {
    const compoundEntries = TEMPLATE_MANIFEST.filter(e => EXPECTED_COMPOUND_DSTS.includes(e.dst))
    for (const entry of compoundEntries) {
      const absSrc = path.join(TEMPLATES_ROOT, entry.src)
      const stat = await fs.stat(absSrc)
      expect(stat.isFile()).toBe(true)
    }
  })
})

// 2026-05-24 (Luiz/dev): boundary D25 — init NAO invoca subskill compound-engineering install (G6).
// Refactor usa import puro, nao subprocess nem Skill tool.
describe('template-manifest — boundary D25', () => {
  it('init NAO invoca subskill compound-engineering install', () => {
    const content = readFileSync(
      new URL('./template-manifest.ts', import.meta.url),
      'utf-8'
    )
    expect(content).not.toContain('Skill(')
    expect(content).not.toContain('compound-engineering:install')
  })
})
