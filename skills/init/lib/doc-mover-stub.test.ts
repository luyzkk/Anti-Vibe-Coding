// 2026-05-18 (Luiz/dev): Plano 04 fase-04 RED — 5 testes para doc-mover-stub

import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { moveDocWithStub, rewriteInternalLinks } from './doc-mover-stub'

describe('doc-mover-stub', () => {
  let repoRoot: string

  beforeEach(() => {
    repoRoot = mkdtempSync(path.join(tmpdir(), 'doc-mover-'))
    mkdirSync(path.join(repoRoot, 'docs'), { recursive: true })
  })

  it('moves file, writes stub at old path, increments linksRewritten when other md references old path', async () => {
    const source = 'docs/ARQUITETURA.md'
    const target = 'docs/ARCHITECTURE.md'

    writeFileSync(path.join(repoRoot, source), '# Arquitetura\n\nConteudo original.', 'utf8')

    // Another md file that references the old path
    writeFileSync(
      path.join(repoRoot, 'docs', 'OUTRO.md'),
      '# Outro\n\nVeja [Arquitetura](ARQUITETURA.md) para detalhes.\n',
      'utf8',
    )

    const result = await moveDocWithStub({ source, target, repoRoot })

    expect(result.moved).toBe(true)
    expect(result.stubWritten).toBe(true)
    expect(result.errors).toHaveLength(0)

    // Target must exist with original content
    const targetContent = readFileSync(path.join(repoRoot, target), 'utf8')
    expect(targetContent).toContain('Arquitetura')

    // Stub must exist at old path
    const stubContent = readFileSync(path.join(repoRoot, source), 'utf8')
    expect(stubContent).toContain('# Moved')
    expect(stubContent).toContain('ARCHITECTURE.md')

    // Links must be rewritten
    expect(result.linksRewritten).toBeGreaterThanOrEqual(1)
    const outroContent = readFileSync(path.join(repoRoot, 'docs', 'OUTRO.md'), 'utf8')
    expect(outroContent).toContain('ARCHITECTURE.md')
    expect(outroContent).not.toContain('ARQUITETURA.md')
  })

  it('does NOT rewrite external URLs but lists them in externalLinks', async () => {
    const source = 'docs/REF.md'
    const target = 'docs/REFERENCE.md'

    writeFileSync(path.join(repoRoot, source), '# Ref\n\nConteudo.', 'utf8')

    // Another md with external URL
    writeFileSync(
      path.join(repoRoot, 'docs', 'EXTERNAL.md'),
      '# External\n\nSee [docs](https://example.com/REF.md) and local [ref](REF.md).\n',
      'utf8',
    )

    const result = await moveDocWithStub({ source, target, repoRoot })

    expect(result.moved).toBe(true)
    expect(result.errors).toHaveLength(0)

    // External link must NOT be rewritten
    const extContent = readFileSync(path.join(repoRoot, 'docs', 'EXTERNAL.md'), 'utf8')
    expect(extContent).toContain('https://example.com/REF.md')

    // But it must appear in externalLinks
    expect(result.externalLinks.length).toBeGreaterThanOrEqual(1)
    const extLink = result.externalLinks.find((l) => l.url.includes('example.com'))
    expect(extLink).toBeDefined()
  })

  it('returns error when target already exists (no overwrite)', async () => {
    const source = 'docs/A.md'
    const target = 'docs/B.md'

    writeFileSync(path.join(repoRoot, source), '# A', 'utf8')
    writeFileSync(path.join(repoRoot, target), '# B already exists', 'utf8')

    const result = await moveDocWithStub({ source, target, repoRoot })

    expect(result.moved).toBe(false)
    expect(result.stubWritten).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.stage).toBe('rename')
    expect(result.errors[0]?.message).toContain('target already exists')

    // Source must remain intact
    expect(existsSync(path.join(repoRoot, source))).toBe(true)
  })

  it('returns error when source does not exist', async () => {
    const result = await moveDocWithStub({
      source: 'docs/NONEXISTENT.md',
      target: 'docs/TARGET.md',
      repoRoot,
    })

    expect(result.moved).toBe(false)
    expect(result.stubWritten).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.stage).toBe('rename')
    expect(result.errors[0]?.message).toContain('source not found')
  })

  it('dryRun=true returns moved=false and stubWritten=false without disk mutation', async () => {
    const source = 'docs/DRAFT.md'
    const target = 'docs/FINAL.md'

    writeFileSync(path.join(repoRoot, source), '# Draft', 'utf8')

    const result = await moveDocWithStub({ source, target, repoRoot, dryRun: true })

    expect(result.moved).toBe(false)
    expect(result.stubWritten).toBe(false)
    expect(result.linksRewritten).toBe(0)
    expect(result.externalLinks).toHaveLength(0)
    expect(result.errors).toHaveLength(0)

    // Disk must be untouched
    expect(existsSync(path.join(repoRoot, source))).toBe(true)
    expect(existsSync(path.join(repoRoot, target))).toBe(false)
  })
})

describe('rewriteInternalLinks', () => {
  let repoRoot: string

  beforeEach(() => {
    repoRoot = mkdtempSync(path.join(tmpdir(), 'doc-mover-rewrite-'))
    mkdirSync(path.join(repoRoot, 'docs'), { recursive: true })
  })

  it('rewrites internal links across multiple md files', async () => {
    writeFileSync(
      path.join(repoRoot, 'docs', 'INDEX.md'),
      '# Index\n\n- [Old doc](OLD.md)\n- [Another](OTHER.md)\n',
      'utf8',
    )
    writeFileSync(
      path.join(repoRoot, 'docs', 'OTHER.md'),
      '# Other\n\nSee also [Old doc](OLD.md).\n',
      'utf8',
    )

    const result = await rewriteInternalLinks({
      repoRoot,
      oldPath: 'docs/OLD.md',
      newPath: 'docs/NEW.md',
    })

    expect(result.filesModified).toBe(2)

    const indexContent = readFileSync(path.join(repoRoot, 'docs', 'INDEX.md'), 'utf8')
    expect(indexContent).toContain('NEW.md')
    expect(indexContent).not.toContain('OLD.md')
  })
})
