// 2026-05-11 (Luiz/dev): valida que cada entry do manifest aponta para .tpl real.
// Previne drift: entries sem arquivo correspondente quebram fase-02 silenciosamente.

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST, TEMPLATES_ROOT } from './template-manifest'

describe('TEMPLATE_MANIFEST', () => {
  it('lists at least 25 templates (PRD M2: 14+ docs structure scaffold)', () => {
    expect(TEMPLATE_MANIFEST.length).toBeGreaterThanOrEqual(25)
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
