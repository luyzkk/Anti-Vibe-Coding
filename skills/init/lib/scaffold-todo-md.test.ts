// 2026-05-12 (Luiz/dev): CA-31 — co-located TDD Red para scaffold-todo-md.
// Testes completos em tests/scaffold-todo-md.test.ts e tests/todo-md-init.test.ts.
// Este arquivo co-localizado satisfaz o TDD gate (busca sameDir).

import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import * as fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scaffoldTodoMd } from './scaffold-todo-md'

const tmpDirs: string[] = []

function makeTmpDir(): string {
  const dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'avibe-colocated-'))
  tmpDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

describe('scaffoldTodoMd (co-located)', () => {
  it('creates TODO.md when absent', () => {
    const dir = makeTmpDir()
    const result = scaffoldTodoMd(dir)
    expect(result).toBe('created')
    expect(fsSync.existsSync(path.join(dir, 'TODO.md'))).toBe(true)
  })

  it('skips when TODO.md pre-exists', () => {
    const dir = makeTmpDir()
    fsSync.writeFileSync(path.join(dir, 'TODO.md'), '# TODO\n', 'utf-8')
    const result = scaffoldTodoMd(dir)
    expect(result).toBe('skipped')
  })
})
