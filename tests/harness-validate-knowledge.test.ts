// 2026-05-17 (Luiz/dev): H1.4 — harness deve detectar ausencia de docs/knowledge/ INDEX.md.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { checkKnowledgePresence } from '../scripts/harness-validate'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'harness-knowledge')

describe('checkKnowledgePresence', () => {
  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(FIXTURE, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
  })

  it('passa quando docs/knowledge/nodejs-typescript/INDEX.md existe com >= 1 atomo', async () => {
    const atomsDir = path.join(FIXTURE, 'docs/knowledge/nodejs-typescript/atoms')
    await fs.mkdir(atomsDir, { recursive: true })
    await fs.writeFile(
      path.join(FIXTURE, 'docs/knowledge/nodejs-typescript/INDEX.md'),
      '# Index\n',
      'utf8',
    )
    await fs.writeFile(path.join(atomsDir, 'atom-001.md'), '# Atom\n', 'utf8')

    const failures: Array<{ rule: string; message: string }> = []
    await checkKnowledgePresence(failures, FIXTURE)
    expect(failures).toHaveLength(0)
  })

  it('falha quando INDEX.md esta ausente', async () => {
    const atomsDir = path.join(FIXTURE, 'docs/knowledge/nodejs-typescript/atoms')
    await fs.mkdir(atomsDir, { recursive: true })
    await fs.writeFile(path.join(atomsDir, 'atom-001.md'), '# Atom\n', 'utf8')

    const failures: Array<{ rule: string; message: string }> = []
    await checkKnowledgePresence(failures, FIXTURE)
    expect(failures).toHaveLength(1)
    expect(failures[0]?.rule).toBe('knowledge-presence')
    expect(failures[0]?.message).toContain('INDEX.md')
  })

  it('falha quando atoms/ nao tem arquivos .md', async () => {
    const atomsDir = path.join(FIXTURE, 'docs/knowledge/nodejs-typescript/atoms')
    await fs.mkdir(atomsDir, { recursive: true })
    await fs.writeFile(
      path.join(FIXTURE, 'docs/knowledge/nodejs-typescript/INDEX.md'),
      '# Index\n',
      'utf8',
    )

    const failures: Array<{ rule: string; message: string }> = []
    await checkKnowledgePresence(failures, FIXTURE)
    expect(failures).toHaveLength(1)
    expect(failures[0]?.rule).toBe('knowledge-presence')
    expect(failures[0]?.message).toContain('atoms')
  })

  it('passes silently when docs/knowledge/ does not exist (stack nao inicializado)', async () => {
    // Projetos sem stack knowledge nao devem ser penalizados.
    const failures: Array<{ rule: string; message: string }> = []
    await checkKnowledgePresence(failures, FIXTURE)
    expect(failures).toHaveLength(0)
  })
})
