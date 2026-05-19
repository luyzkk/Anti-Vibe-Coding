import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseProgressTxt } from './progress-txt-parser'

const FIXTURE = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'progress-txt-licitar.txt')

describe('parseProgressTxt', () => {
  it('returns empty array for empty input', () => {
    expect(parseProgressTxt('')).toEqual([])
  })

  it('extracts a single entry from a minimal block', () => {
    const input = `# Header
---
### [Armadilha] Foo bar
**Contexto:** algo
`
    const entries = parseProgressTxt(input)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('Foo bar')
    expect(entries[0]?.category).toBe('armadilha')
    expect(entries[0]?.slug).toBe('foo-bar')
    expect(entries[0]?.sourceLineNumber).toBe(3)
    expect(entries[0]?.body).toContain('**Contexto:** algo')
  })

  it('extracts entries with numbered heading "### N. Title"', () => {
    const input = `### 1. UPSERT idempotente
body line
### 2. Rate limit
body 2`
    const entries = parseProgressTxt(input)
    expect(entries).toHaveLength(2)
    expect(entries[0]?.title).toBe('UPSERT idempotente')
    expect(entries[1]?.title).toBe('Rate limit')
    expect(entries[0]?.index).toBe(1)
    expect(entries[1]?.index).toBe(2)
  })

  it('uses category=gotcha as default when prefix [..] is absent', () => {
    const input = `### Plain title`
    const entries = parseProgressTxt(input)
    expect(entries[0]?.category).toBe('gotcha')
  })

  it('strips UTF-8 BOM transparently', () => {
    const input = `\uFEFF### Title`
    const entries = parseProgressTxt(input)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('Title')
  })

  it('parses the Licitar fixture without throwing and returns >=4 entries', async () => {
    const content = await fs.readFile(FIXTURE, 'utf-8')
    const entries = parseProgressTxt(content)
    expect(entries.length).toBeGreaterThanOrEqual(4)
    // CA-05 piece: numero da linha de origem preservado
    expect(entries.every((e) => e.sourceLineNumber > 0)).toBe(true)
    // slugs unicos (sufixo de fallback so se necessario — fixture nao tem colisao)
    const slugs = entries.map((e) => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('preserves body markdown verbatim (no strip)', () => {
    const input = `### Title
**Contexto:** x
**Solucao:** y`
    const entries = parseProgressTxt(input)
    expect(entries[0]?.body).toContain('**Contexto:** x')
    expect(entries[0]?.body).toContain('**Solucao:** y')
  })
})
