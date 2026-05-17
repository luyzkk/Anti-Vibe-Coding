// 2026-05-17 (Luiz/dev): RF10 — preview de keywords no output do /init (PRD §Could Haves)
import { describe, it, expect } from 'bun:test'
import { formatKnowledgePreview, parseTopKeywords } from './format-knowledge-preview'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('format-knowledge-preview (RF10)', () => {
  it('extrai top-N keywords do INDEX.md', () => {
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

    const keywords = parseTopKeywords(indexPath, 8)
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

  it('retorna string vazia quando INDEX.md não existe (graceful)', () => {
    const keywords = parseTopKeywords('/path/que/nao/existe/INDEX.md', 8)
    expect(keywords).toEqual([])
    expect(formatKnowledgePreview(keywords)).toBe('')
  })
})
