// 2026-05-12 (Luiz/dev): testes RED para adr-writer — CA-15, monotonic numbering, frontmatter (Plano 05 fase-02)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { writeADR } from './adr-writer'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-adr-writer-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('writeADR', () => {
  it('creates ADR-0001 then ADR-0002 with monotonic numbering', async () => {
    // 2026-05-12 (Luiz/dev): CA-15 — numeracao monotonica por diretorio (G7 Plano 03)
    const first = await writeADR(tmpDir, { title: 'Usar TanStack Query' })
    const second = await writeADR(tmpDir, { title: 'Usar Zod para validacao' })

    expect(first.id).toBe(1)
    expect(second.id).toBe(2)
    expect(path.basename(first.filePath)).toMatch(/^ADR-0001-/)
    expect(path.basename(second.filePath)).toMatch(/^ADR-0002-/)
  })

  it('creates file with valid frontmatter containing id, title, status, created', async () => {
    // 2026-05-12 (Luiz/dev): frontmatter requerido para D31 (Plano 06 revoke)
    const { filePath } = await writeADR(tmpDir, {
      title: 'Adotar monorepo',
      status: 'active',
    })

    const content = await fs.readFile(filePath, 'utf-8')
    expect(content).toContain('id: 1')
    expect(content).toContain('title: "Adotar monorepo"')
    expect(content).toContain('status: active')
    expect(content).toMatch(/created: \d{4}-\d{2}-\d{2}/)
  })

  it('generates slug from title in filename', async () => {
    // 2026-05-12 (Luiz/dev): nome = ADR-NNNN-{slug}.md
    const { filePath } = await writeADR(tmpDir, { title: 'Usar PostgreSQL em vez de SQLite' })

    const basename = path.basename(filePath)
    expect(basename).toBe('ADR-0001-usar-postgresql-em-vez-de-sqlite.md')
  })

  it('creates file with Context, Decision, Alternatives, Consequences sections', async () => {
    // 2026-05-12 (Luiz/dev): secoes obrigatorias para ADR completo
    const { filePath } = await writeADR(tmpDir, {
      title: 'Adotar ESLint',
      context: 'Precisamos de linting consistente',
      decision: 'Usar ESLint com config padrao',
      alternatives: ['Biome', 'TSLint'],
      consequences: 'Curva de aprendizado minima',
    })

    const content = await fs.readFile(filePath, 'utf-8')
    expect(content).toContain('## Context')
    expect(content).toContain('## Decision')
    expect(content).toContain('## Alternatives')
    expect(content).toContain('## Consequences')
    expect(content).toContain('Precisamos de linting consistente')
    expect(content).toContain('- Biome')
    expect(content).toContain('- TSLint')
  })

  it('number disambiguates slug collision (02-G2)', async () => {
    // 2026-05-12 (Luiz/dev): 02-G2 — mesmo slug com numeros diferentes (ADR-0003-cache.md vs ADR-0007-cache.md)
    const first = await writeADR(tmpDir, { title: 'Cache' })
    const second = await writeADR(tmpDir, { title: 'Cache' })
    const third = await writeADR(tmpDir, { title: 'Cache' })

    expect(path.basename(first.filePath)).toBe('ADR-0001-cache.md')
    expect(path.basename(second.filePath)).toBe('ADR-0002-cache.md')
    expect(path.basename(third.filePath)).toBe('ADR-0003-cache.md')
  })

  it('restarts from ADR-0001 after all files deleted (idempotence)', async () => {
    // 2026-05-12 (Luiz/dev): max=0 apos delete => proxima = ADR-0001
    const first = await writeADR(tmpDir, { title: 'Primeiro' })
    await fs.unlink(first.filePath)

    const again = await writeADR(tmpDir, { title: 'Primeiro novamente' })
    expect(again.id).toBe(1)
    expect(path.basename(again.filePath)).toMatch(/^ADR-0001-/)
  })

  it('pad4 produces zero-padded 4-digit number', async () => {
    // 2026-05-12 (Luiz/dev): ADR-0001, nao ADR-1 (formatacao lexicografica)
    const { filePath } = await writeADR(tmpDir, { title: 'Padded' })
    expect(path.basename(filePath)).toMatch(/^ADR-\d{4}-/)
  })

  it('uses title-only object (defaults for optional fields)', async () => {
    // 2026-05-12 (Luiz/dev): edge case — objeto minimo so com title ainda funciona
    const { filePath, id } = await writeADR(tmpDir, { title: 'Decisao minima' })

    const content = await fs.readFile(filePath, 'utf-8')
    expect(id).toBe(1)
    expect(content).toContain('(why is this decision needed)')
    expect(content).toContain('(what was decided)')
    expect(content).toContain('(no alternatives recorded)')
  })

  it('creates designDocsDir if it does not exist', async () => {
    // 2026-05-12 (Luiz/dev): mkdir recursive — dir pode nao existir ainda
    const nestedDir = path.join(tmpDir, 'docs', 'design-docs')
    // nao cria antes — deixa writeADR criar

    const { filePath } = await writeADR(nestedDir, { title: 'Dir criado automaticamente' })

    const exists = await fs.stat(nestedDir).then(() => true).catch(() => false)
    expect(exists).toBe(true)
    expect(filePath).toContain(nestedDir)
  })
})
