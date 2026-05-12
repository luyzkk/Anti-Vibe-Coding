// 2026-05-11 (Luiz/dev): testes minimos para satisfazer tdd-gate (copy-recursive.ts).
// Comportamento: copyRecursive copia arquivo plano e diretorio recursivo.

import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyRecursive } from './copy-recursive'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'copy-recursive')

afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

describe('copyRecursive', () => {
  it('copies a flat file', async () => {
    const src = path.join(FIXTURE, 'src', 'file.txt')
    const dst = path.join(FIXTURE, 'dst', 'file.txt')
    await fs.mkdir(path.dirname(src), { recursive: true })
    await fs.writeFile(src, 'hello', 'utf8')
    await copyRecursive(src, dst)
    expect(await fs.readFile(dst, 'utf8')).toBe('hello')
  })

  it('copies a directory recursively', async () => {
    const src = path.join(FIXTURE, 'src-dir')
    const dst = path.join(FIXTURE, 'dst-dir')
    await fs.mkdir(path.join(src, 'nested'), { recursive: true })
    await fs.writeFile(path.join(src, 'a.txt'), 'a', 'utf8')
    await fs.writeFile(path.join(src, 'nested', 'b.txt'), 'b', 'utf8')
    await copyRecursive(src, dst)
    expect(await fs.readFile(path.join(dst, 'a.txt'), 'utf8')).toBe('a')
    expect(await fs.readFile(path.join(dst, 'nested', 'b.txt'), 'utf8')).toBe('b')
  })
})
