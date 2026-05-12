// 2026-05-12 (Luiz/dev): testes RED para lessons-learned/index.ts — CA-14, D10 (Plano 05 fase-01)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { add } from './index'
import { parseFrontmatter } from '../init/lib/compound-frontmatter'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-lessons-learned-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

async function makeV6Project(root: string): Promise<void> {
  // 2026-05-12 (Luiz/dev): layout v6 = docs/compound + docs/exec-plans ambos presentes
  await fs.mkdir(path.join(root, 'docs', 'compound'), { recursive: true })
  await fs.mkdir(path.join(root, 'docs', 'exec-plans'), { recursive: true })
}

async function makeV5Project(root: string): Promise<void> {
  // 2026-05-12 (Luiz/dev): layout v5 = apenas lessons-learned.md existente
  await fs.writeFile(path.join(root, 'lessons-learned.md'), '# Lessons Learned\n\n', 'utf-8')
}

describe('add (v6 layout)', () => {
  it('creates compound note in docs/compound/ with valid frontmatter (CA-14)', async () => {
    // 2026-05-12 (Luiz/dev): CA-14 verbatim — projeto v6 deve escrever em docs/compound/
    await makeV6Project(tmpDir)

    const result = await add('Bug X aconteceu em producao', tmpDir)

    expect(result.layout).toBe('v6')
    const content = await fs.readFile(result.filePath, 'utf-8')
    const parsed = parseFrontmatter(content)
    expect(parsed.ok).toBe(true)
    expect(result.filePath).toContain(path.join('docs', 'compound'))
  })

  it('accepts LessonOpts object form (D10 — both forms work)', async () => {
    // 2026-05-12 (Luiz/dev): Ambiguity 05-A1 — assinatura union string | LessonOpts
    await makeV6Project(tmpDir)

    const result = await add(
      { title: 'Race condition em session', category: 'architecture', tags: ['async'] },
      tmpDir,
    )

    expect(result.layout).toBe('v6')
    const content = await fs.readFile(result.filePath, 'utf-8')
    const parsed = parseFrontmatter(content)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.data.category).toBe('architecture')
    }
  })
})

describe('add (v5 layout)', () => {
  it('appends to lessons-learned.md in v5 project', async () => {
    // 2026-05-12 (Luiz/dev): D10 — comportamento legado preservado
    await makeV5Project(tmpDir)

    const result = await add('Titulo Y legado', tmpDir)

    expect(result.layout).toBe('v5')
    expect(result.filePath).toBe(path.join(tmpDir, 'lessons-learned.md'))
    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('Titulo Y legado')
  })

  it('injects migration tip once in v5 project (Ambiguity 05-A2)', async () => {
    // 2026-05-12 (Luiz/dev): tip de migracao injetado UMA vez (idempotente via includes check)
    await makeV5Project(tmpDir)

    await add('Licao 1', tmpDir)
    await add('Licao 2', tmpDir)

    const content = await fs.readFile(path.join(tmpDir, 'lessons-learned.md'), 'utf-8')
    const tipOccurrences = (content.match(/<!-- Tip:/g) ?? []).length
    expect(tipOccurrences).toBe(1)
  })

  it('does NOT create docs/compound/ folder in v5 project', async () => {
    // 2026-05-12 (Luiz/dev): CA criterio — v5 NAO cria estrutura v6
    await makeV5Project(tmpDir)

    await add('Qualquer licao', tmpDir)

    const compoundDir = path.join(tmpDir, 'docs', 'compound')
    const exists = await fs.stat(compoundDir).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })
})

describe('add (cru — raw project)', () => {
  it('creates lessons-learned.md in raw project with tip', async () => {
    // 2026-05-12 (Luiz/dev): projeto cru cai em v5-default (Ambiguity 05-A2)
    const result = await add('Licao em projeto cru', tmpDir)

    expect(result.layout).toBe('cru')
    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('Licao em projeto cru')
    expect(content).toContain('<!-- Tip:')
  })
})
