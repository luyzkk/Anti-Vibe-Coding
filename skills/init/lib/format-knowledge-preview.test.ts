// 2026-05-17 (Luiz/dev): RF10 — preview de keywords no output do /init (PRD §Could Haves)
// M1.1 (2026-05-17): parseTopKeywords agora async — testes migrados para await.
import { describe, it, expect } from 'bun:test'
import { formatKnowledgePreview, parseTopKeywords, TOP_N_KEYWORDS } from './format-knowledge-preview'
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
})
