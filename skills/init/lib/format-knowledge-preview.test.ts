// 2026-05-17 (Luiz/dev): RF10 — preview de keywords no output do /init (PRD §Could Haves)
// M1.1 (2026-05-17): parseTopKeywords agora async — testes migrados para await.
// 2026-05-18 (Luiz/dev): RF11 — warning Rails legado <7.1, alinhado com D23 + CA-04
import { describe, it, expect, test } from 'bun:test'
import { formatKnowledgePreview, parseTopKeywords, TOP_N_KEYWORDS, extractRailsVersionWarning } from './format-knowledge-preview'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('format-knowledge-preview (RF10)', () => {
  it('extrai top-N keywords do INDEX.md', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kn-preview-'))
    const indexPath = join(tmpDir, 'INDEX.md')
    writeFileSync(indexPath, `# Node.js + TypeScript — Senior Knowledge Index

## Por keyword

| Keyword | Átomos |
|---|---|
| event loop, promise, async | [async-concurrency-streams](./atoms/async-concurrency-streams.md) |
| prisma, drizzle, n+1 | [data-persistence](./atoms/data-persistence.md) |
| pino, telemetry | [error-handling-observability](./atoms/error-handling-observability.md) |
| owasp node, prototype pollution | [security-stack-specific](./atoms/security-stack-specific.md) |
| v8, gc, hidden classes | [performance-and-internals](./atoms/performance-and-internals.md) |
`)

    const keywords = await parseTopKeywords(indexPath, 8)
    expect(keywords.length).toBeGreaterThan(0)
    expect(keywords.length).toBeLessThanOrEqual(8)
    expect(keywords).toContain('event loop')
    expect(keywords).toContain('prisma')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('formata preview como string consumível', () => {
    const formatted = formatKnowledgePreview(['event loop', 'prisma', 'pino', 'owasp node', 'v8'])
    expect(formatted).toMatch(/Knowledge cobre:/)
    expect(formatted).toContain('event loop')
    expect(formatted).toContain('prisma')
  })

  it('retorna string vazia quando INDEX.md não existe (graceful)', async () => {
    const keywords = await parseTopKeywords('/path/que/nao/existe/INDEX.md', 8)
    expect(keywords).toEqual([])
    expect(formatKnowledgePreview(keywords)).toBe('')
  })

  it('TOP_N_KEYWORDS exportado e igual a 8 (Wave 5 CS3)', () => {
    expect(TOP_N_KEYWORDS).toBe(8)
  })

  it('parseTopKeywords sem topN explícito usa TOP_N_KEYWORDS como default', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kn-topn-'))
    const indexPath = join(tmpDir, 'INDEX.md')
    // 10 keywords únicas para verificar que o default limita em 8
    writeFileSync(indexPath, `# Index\n\n## Por keyword\n\n| Keyword | Átomos |\n|---|---|\n| a, b, c, d, e, f, g, h, i, j | [atom](./atoms/atom.md) |\n`)
    const keywords = await parseTopKeywords(indexPath)
    expect(keywords.length).toBe(TOP_N_KEYWORDS)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // M1.1: parseTopKeywords retorna Promise (async I/O)
  it('parseTopKeywords retorna Promise', () => {
    const result = parseTopKeywords('/any/path/INDEX.md', 8)
    expect(result).toBeInstanceOf(Promise)
  })

  // L3 — topN boundary validation
  it('parseTopKeywords com topN=0 retorna array vazio imediatamente', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kn-zero-'))
    const indexPath = join(tmpDir, 'INDEX.md')
    writeFileSync(indexPath, `# Index\n\n## Por keyword\n\n| Keyword | Átomos |\n|---|---|\n| a, b, c | [atom](./atoms/atom.md) |\n`)
    const keywords = await parseTopKeywords(indexPath, 0)
    expect(keywords).toEqual([])
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parseTopKeywords com topN=Infinity clampeia em 50 no máximo', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kn-inf-'))
    const indexPath = join(tmpDir, 'INDEX.md')
    // 60 keywords únicas em 1 linha para verificar o clamp
    const manyKeywords = Array.from({ length: 60 }, (_, i) => `kw${i}`).join(', ')
    writeFileSync(indexPath, `# Index\n\n## Por keyword\n\n| Keyword | Átomos |\n|---|---|\n| ${manyKeywords} | [atom](./atoms/atom.md) |\n`)
    const keywords = await parseTopKeywords(indexPath, Infinity)
    expect(keywords.length).toBe(50)
    rmSync(tmpDir, { recursive: true, force: true })
  })
})

describe('extractRailsVersionWarning (RF11)', () => {
  test('Rails 7.0 (~> 7.0) retorna warning', () => {
    const gemfile = "source 'https://rubygems.org'\ngem 'rails', '~> 7.0'\n"
    expect(extractRailsVersionWarning(gemfile)).toBe(
      '⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar.',
    )
  })

  test('Rails 8.0 (~> 8.0) retorna null (não há warning)', () => {
    const gemfile = "gem 'rails', '~> 8.0'\n"
    expect(extractRailsVersionWarning(gemfile)).toBeNull()
  })

  test('Rails 7.1 (>= 7.1) retorna null (limite inferior do suportado)', () => {
    const gemfile = "gem 'rails', '>= 7.1'\n"
    expect(extractRailsVersionWarning(gemfile)).toBeNull()
  })

  test('Gemfile sem gem rails retorna null', () => {
    const gemfile = "gem 'sinatra'\n"
    expect(extractRailsVersionWarning(gemfile)).toBeNull()
  })

  test('Gemfile vazio retorna null', () => {
    expect(extractRailsVersionWarning('')).toBeNull()
  })
})
