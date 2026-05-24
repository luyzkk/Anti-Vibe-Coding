// 2026-05-24 (Luiz/dev): testes RED para installCompound — PRD CA-04/05/06/20, D17-A

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Importar APOS implementacao existir (RED vai falhar aqui com module not found — aceitavel)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — modulo nao existe em RED phase; erro esperado ate GREEN
import { installCompound } from './installer'

describe('installCompound', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'installer-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('skip-by-default: skipa arquivos existentes sem --force (CA-04)', async () => {
    // Pre-criar docs/COMPOUND_ENGINEERING.md no target
    const targetFile = path.join(tmpDir, 'docs', 'COMPOUND_ENGINEERING.md')
    await fs.mkdir(path.dirname(targetFile), { recursive: true })
    await fs.writeFile(targetFile, '# existing content')

    const result = await installCompound(tmpDir, { force: false })

    expect(result.skipped).toContain('docs/COMPOUND_ENGINEERING.md')
    expect(result.overwritten).not.toContain('docs/COMPOUND_ENGINEERING.md')
    // arquivo original nao foi alterado
    const content = await fs.readFile(targetFile, 'utf-8')
    expect(content).toBe('# existing content')
  })

  it('force overwrite: --force sobrescreve arquivos existentes (CA-05)', async () => {
    // Pre-criar docs/COMPOUND_ENGINEERING.md no target
    const targetFile = path.join(tmpDir, 'docs', 'COMPOUND_ENGINEERING.md')
    await fs.mkdir(path.dirname(targetFile), { recursive: true })
    await fs.writeFile(targetFile, '# existing content')

    const result = await installCompound(tmpDir, { force: true })

    expect(result.overwritten).toContain('docs/COMPOUND_ENGINEERING.md')
    expect(result.skipped).not.toContain('docs/COMPOUND_ENGINEERING.md')
    // arquivo foi sobrescrito (conteudo diferente do original)
    const content = await fs.readFile(targetFile, 'utf-8')
    expect(content).not.toBe('# existing content')
  })

  it('notas intactas: docs/compound/*.md de usuario nunca sao alvo (CA-06)', async () => {
    // Pre-criar uma nota compound do dev no target
    const notaDir = path.join(tmpDir, 'docs', 'compound')
    await fs.mkdir(notaDir, { recursive: true })
    const notaFile = path.join(notaDir, '2024-05-foo.md')
    await fs.writeFile(notaFile, '# nota do dev — NAO deve ser tocada')

    const result = await installCompound(tmpDir, { force: false })
    const resultForce = await installCompound(tmpDir, { force: true })

    // Nota nao deve aparecer em created, skipped ou overwritten
    const allPaths = [...result.created, ...result.skipped, ...result.overwritten,
                      ...resultForce.created, ...resultForce.skipped, ...resultForce.overwritten]
    const hasNota = allPaths.some(p => p.includes('2024-05-foo.md'))
    expect(hasNota).toBe(false)

    // Conteudo da nota preservado
    const content = await fs.readFile(notaFile, 'utf-8')
    expect(content).toBe('# nota do dev — NAO deve ser tocada')
  })

  it('stack-agnostic: sem package.json adiciona nota UX em result.notes (CA-20)', async () => {
    // tmpDir sem package.json
    const result = await installCompound(tmpDir, { force: false })

    expect(result.notes.length).toBeGreaterThan(0)
    const noteText = result.notes.join(' ')
    expect(noteText).toContain('No package.json detected')
    expect(noteText).toContain('compound-check.ts')
  })
})
