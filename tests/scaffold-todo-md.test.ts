// 2026-05-12 (Luiz/dev): CA-31 — TDD Red para scaffold-todo-md helper.
// Este arquivo existe para satisfazer o TDD gate (basename match).
// Os testes completos estao em todo-md-init.test.ts.

import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import * as fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const tmpDirs: string[] = []

function makeTmpDir(): string {
  const dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'avibe-scaffold-todo-'))
  tmpDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

describe('scaffoldTodoMd', () => {
  it('creates TODO.md with # TODO header when absent', async () => {
    const { scaffoldTodoMd } = await import('../skills/init/lib/scaffold-todo-md')
    const dir = makeTmpDir()
    const result = scaffoldTodoMd(dir)
    expect(result).toBe('created')
    const content = await fs.readFile(path.join(dir, 'TODO.md'), 'utf8')
    expect(content.startsWith('# TODO')).toBe(true)
  })

  it('returns skipped and does not overwrite pre-existing TODO.md', async () => {
    const { scaffoldTodoMd } = await import('../skills/init/lib/scaffold-todo-md')
    const dir = makeTmpDir()
    const original = '# TODO\n\n- [ ] 2026-01-01 existing task\n'
    await fs.writeFile(path.join(dir, 'TODO.md'), original, 'utf8')
    const result = scaffoldTodoMd(dir)
    expect(result).toBe('skipped')
    const after = await fs.readFile(path.join(dir, 'TODO.md'), 'utf8')
    expect(after).toBe(original)
  })
})
