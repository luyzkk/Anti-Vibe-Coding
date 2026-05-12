// 2026-05-12 (Luiz/dev): CA-31 prereq — testa criacao idempotente de TODO.md.
// TDD Red first: testa tanto o template skeleton quanto o helper de scaffold idempotente.

import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import * as fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const SKELETON_PATH = path.join(
  import.meta.dir,
  '..',
  'skills/todo-pick/templates/todo-md-skeleton.md',
)

const INIT_TEMPLATES_ROOT = path.join(
  import.meta.dir,
  '..',
  'skills/init/assets/templates',
)

// Helper idempotente que a fase-01 adiciona ao scaffold-full-tree
async function scaffoldTodoMdIdempotent(projectRoot: string): Promise<'created' | 'skipped'> {
  const { scaffoldTodoMd } = await import('../skills/init/lib/scaffold-todo-md')
  return scaffoldTodoMd(projectRoot)
}

const tmpDirs: string[] = []

function makeTmpDir(): string {
  const dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'avibe-test-'))
  tmpDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

describe('todo-md-skeleton template', () => {
  it('exists at expected path', async () => {
    const stat = await fs.stat(SKELETON_PATH)
    expect(stat.isFile()).toBe(true)
  })

  it('starts with # TODO header', async () => {
    const content = await fs.readFile(SKELETON_PATH, 'utf8')
    expect(content.startsWith('# TODO')).toBe(true)
  })

  it('mentions /todo-pick classifier format', async () => {
    const content = await fs.readFile(SKELETON_PATH, 'utf8')
    expect(content).toContain('todo-pick')
  })

  it('contains pending/done/skipped state docs', async () => {
    const content = await fs.readFile(SKELETON_PATH, 'utf8')
    expect(content).toContain('[ ] pending')
    expect(content).toContain('[x] done')
    expect(content).toContain('[-] skipped')
  })
})

describe('TODO.md.tpl in init templates', () => {
  it('exists', async () => {
    const tplPath = path.join(INIT_TEMPLATES_ROOT, 'TODO.md.tpl')
    const stat = await fs.stat(tplPath)
    expect(stat.isFile()).toBe(true)
  })

  it('starts with # TODO', async () => {
    const tplPath = path.join(INIT_TEMPLATES_ROOT, 'TODO.md.tpl')
    const content = await fs.readFile(tplPath, 'utf8')
    expect(content.startsWith('# TODO')).toBe(true)
  })
})

describe('scaffoldTodoMd (idempotent helper)', () => {
  it('creates TODO.md when absent', async () => {
    const dir = makeTmpDir()
    const result = await scaffoldTodoMdIdempotent(dir)
    expect(result).toBe('created')
    const content = await fs.readFile(path.join(dir, 'TODO.md'), 'utf8')
    expect(content.startsWith('# TODO')).toBe(true)
  })

  it('skips when TODO.md already exists', async () => {
    const dir = makeTmpDir()
    const existingContent = '# TODO\n\n- [ ] 2026-01-01 my existing task\n'
    await fs.writeFile(path.join(dir, 'TODO.md'), existingContent, 'utf8')
    const result = await scaffoldTodoMdIdempotent(dir)
    expect(result).toBe('skipped')
    const afterContent = await fs.readFile(path.join(dir, 'TODO.md'), 'utf8')
    expect(afterContent).toBe(existingContent)
  })

  it('writes UTF-8 without BOM', async () => {
    const dir = makeTmpDir()
    await scaffoldTodoMdIdempotent(dir)
    const buf = await fs.readFile(path.join(dir, 'TODO.md'))
    // UTF-8 BOM is EF BB BF
    expect(buf[0]).not.toBe(0xef)
  })
})
