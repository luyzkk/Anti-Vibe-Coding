// 2026-05-12 (Luiz/dev): testes RED para compound-note-writer — CA-29, G5 (Plano 05 fase-01)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { writeCompoundNote } from './compound-note-writer'
// 2026-05-23 (Luiz/dev): cross-skill import — D19 + CA-15 + Plano 02 fase-02
import { parseFrontmatter, findMissingRequiredSections } from '../compound-engineering/lib/compound-frontmatter'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-note-writer-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('writeCompoundNote', () => {
  it('creates file with full frontmatter that passes parseFrontmatter', async () => {
    // 2026-05-12 (Luiz/dev): CA-29 — frontmatter deve passar validador compound-frontmatter.ts
    const { filePath } = await writeCompoundNote(tmpDir, {
      title: 'Bug X encontrado em producao',
      category: 'bug',
      tags: ['producao', 'regression'],
    })

    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = parseFrontmatter(content)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.data.title).toBe('Bug X encontrado em producao')
      expect(parsed.data.category).toBe('bug')
      expect(parsed.data.tags).toContain('producao')
    }
  })

  it('generates slug from title in filename', async () => {
    // 2026-05-12 (Luiz/dev): nome do arquivo = YYYY-MM-DD-{slug}.md
    const { filePath } = await writeCompoundNote(tmpDir, {
      title: 'Erro de conexao com banco',
      createdISO: '2026-05-12',
    })

    const basename = path.basename(filePath)
    expect(basename).toBe('2026-05-12-erro-de-conexao-com-banco.md')
  })

  it('creates file with Problem, Solution, Prevention sections', async () => {
    // 2026-05-12 (Luiz/dev): findMissingRequiredSections deve retornar array vazio
    const { filePath } = await writeCompoundNote(tmpDir, {
      title: 'Race condition em session refresh',
      createdISO: '2026-05-12',
    })

    const content = await fs.readFile(filePath, 'utf-8')
    const missing = findMissingRequiredSections(content)
    expect(missing).toHaveLength(0)
  })

  it('appends -2 suffix on slug collision same day', async () => {
    // 2026-05-12 (Luiz/dev): G5 — politica de colisao -2, -3 (Plano 05 README)
    const input = { title: 'Titulo duplicado', createdISO: '2026-05-12' }
    const { filePath: first } = await writeCompoundNote(tmpDir, input)
    const { filePath: second } = await writeCompoundNote(tmpDir, input)

    expect(path.basename(first)).toBe('2026-05-12-titulo-duplicado.md')
    expect(path.basename(second)).toBe('2026-05-12-titulo-duplicado-2.md')
  })

  it('uses category as default tag when no tags provided (CA-29)', async () => {
    // 2026-05-12 (Luiz/dev): CA-29 ambiguity 04-A2 — tags default = [category]
    const { filePath } = await writeCompoundNote(tmpDir, {
      title: 'Sem tags explicitas',
      category: 'performance',
      createdISO: '2026-05-12',
    })

    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = parseFrontmatter(content)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.data.tags).toContain('performance')
    }
  })
})
