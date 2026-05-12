// 2026-05-11 (Luiz/dev): helper de fixture v6 — cleanup recursivo apos cada teste
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const FIXTURE_SRC = path.resolve(import.meta.dir, '..', 'fixtures', 'v6-empty')

export async function makeTempV6(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-v6-'))
  await copyDir(FIXTURE_SRC, dir)
  return dir
}

export async function cleanup(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  await Promise.all(entries.map(async (e) => {
    const s = path.join(src, e.name)
    const d = path.join(dest, e.name)
    if (e.isDirectory()) await copyDir(s, d)
    else await fs.copyFile(s, d)
  }))
}
