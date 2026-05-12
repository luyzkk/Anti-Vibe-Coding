// 2026-05-11 (Luiz/dev): valida parser de ambos formatos isoladamente.

import { describe, it, expect } from 'bun:test'
import { parseLessons } from './parse-lessons'

describe('parseLessons', () => {
  it('parses format A (## YYYY-MM-DD: title)', () => {
    const body = `## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)\n\n**Sintoma:** XYZ\n**Fix:** ABC\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.date).toBe('2026-03-23')
    expect(entries[0]!.title).toBe('hooks.json overwrite bug')
    expect(entries[0]!.body).toContain('Sintoma')
  })

  it('parses format B (### [Categoria] title)', () => {
    const body = `### [Armadilha] grep -c retorna exit 1\n**Regra:** XYZ\n**Contexto:** ABC\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.category).toBe('Armadilha')
    expect(entries[0]!.title).toBe('grep -c retorna exit 1')
  })

  it('parses both formats in same file', () => {
    const body = `## 2026-03-23: bug A\n**Fix:** x\n\n## Licoes — v5.2 (2026-04-21)\n\n### [Armadilha] bug B\n**Regra:** y\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries).toHaveLength(2)
    expect(entries[0]!.date).toBe('2026-03-23')
    expect(entries[1]!.date).toBe('2026-05-11') // fallback
  })

  it('strips (CORRIGIDO) suffix from title', () => {
    const body = `## 2026-03-23: bug X (CORRIGIDO)\n**Fix:** x\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries[0]!.title).toBe('bug X')
  })

  it('returns empty array for body without lessons', () => {
    expect(parseLessons('# Just a title\nSome text.\n', '2026-05-11')).toHaveLength(0)
  })

  it('auto-tags from title words and category', () => {
    const body = `### [Armadilha] grep counter bug\n**Regra:** x\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries[0]!.tags).toContain('armadilha')
    expect(entries[0]!.tags).toContain('grep')
  })
})
