// 2026-05-11 (Luiz/dev): valida que cada entry do manifest aponta para .tpl real.
// Previne drift: entries sem arquivo correspondente quebram fase-02 silenciosamente.
// 2026-05-14 (Luiz/dev): Plano 01 fase-01 — adiciona testes para campo category.

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
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

  it('has exactly 22 canon-andre entries', () => {
    const canon = TEMPLATE_MANIFEST.filter((e) => e.category === 'canon-andre')
    expect(canon.length).toBe(22)
  })

  it('has exactly 9 anti-vibe-extension entries', () => {
    const ext = TEMPLATE_MANIFEST.filter((e) => e.category === 'anti-vibe-extension')
    expect(ext.length).toBe(9)
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
