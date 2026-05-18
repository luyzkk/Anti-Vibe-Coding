import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { discoverExistingDocs } from './discover-existing-docs'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'discover-docs-'))
}

async function touch(file: string, content: string = ''): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

describe('discoverExistingDocs', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('cwd inexistente / vazio retorna array vazio', async () => {
    const docs = await discoverExistingDocs(tmp)
    expect(docs).toEqual([])
  })

  test('fixture com 5 arquivos retorna 4 (exclui README e node_modules)', async () => {
    await touch(path.join(tmp, 'README.md'), '# repo readme')
    await touch(path.join(tmp, 'CHANGELOG.md'), '# changelog')
    await touch(path.join(tmp, 'docs', 'ARCHITECTURE.md'), '# arch')
    await touch(path.join(tmp, 'docs', 'SECURITY.md'), '# sec')
    await touch(path.join(tmp, '.claude', 'memory', 'notes.md'), '# notes')
    await touch(path.join(tmp, 'node_modules', 'fake', 'README.md'), '# leak')

    const docs = await discoverExistingDocs(tmp)
    const rels = docs.map((d) => d.relativePath)
    expect(rels).toEqual([
      '.claude/memory/notes.md',
      'CHANGELOG.md',
      'docs/ARCHITECTURE.md',
      'docs/SECURITY.md',
    ])
  })

  test('arquivos .mdx sao incluidos', async () => {
    await touch(path.join(tmp, 'docs', 'guide.mdx'), '# mdx')
    const docs = await discoverExistingDocs(tmp)
    expect(docs).toHaveLength(1)
    expect(docs[0]?.extension).toBe('.mdx')
  })

  test('README dentro de /docs/ NAO eh excluido (apenas o da raiz)', async () => {
    await touch(path.join(tmp, 'README.md'), '# raiz')
    await touch(path.join(tmp, 'docs', 'README.md'), '# docs/README')
    const docs = await discoverExistingDocs(tmp)
    const rels = docs.map((d) => d.relativePath)
    expect(rels).toEqual(['docs/README.md'])
  })

  test('blacklist inclui dist, build, .git, .anti-vibe/backup', async () => {
    await touch(path.join(tmp, 'dist', 'a.md'))
    await touch(path.join(tmp, 'build', 'b.md'))
    await touch(path.join(tmp, '.git', 'COMMIT_EDITMSG.md'))
    await touch(path.join(tmp, '.anti-vibe', 'backup', '2026', 'x.md'))
    await touch(path.join(tmp, 'docs', 'real.md'))
    const docs = await discoverExistingDocs(tmp)
    expect(docs.map((d) => d.relativePath)).toEqual(['docs/real.md'])
  })

  test('ordenacao lexicografica determinista por relativePath', async () => {
    await touch(path.join(tmp, 'docs', 'z.md'))
    await touch(path.join(tmp, 'docs', 'a.md'))
    await touch(path.join(tmp, '.claude', 'b.md'))
    const docs = await discoverExistingDocs(tmp)
    expect(docs.map((d) => d.relativePath)).toEqual([
      '.claude/b.md',
      'docs/a.md',
      'docs/z.md',
    ])
  })

  test('bytes refletem stat.size', async () => {
    const content = 'a'.repeat(123)
    await touch(path.join(tmp, 'docs', 'sized.md'), content)
    const docs = await discoverExistingDocs(tmp)
    expect(docs[0]?.bytes).toBe(123)
  })
})
