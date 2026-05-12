// 2026-05-11 (Luiz/dev): instala .github/ sempre (D14, S1).
// Plano 02 fase-04. Atende CA-12.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const STATIC_GH_ROOT = path.join(import.meta.dir, '..', 'assets', 'static', '.github')

const FILES_TO_COPY: ReadonlyArray<string> = [
  'workflows/harness.yml',
  'pull_request_template.md',
]

export type InstallGhFilesResult = {
  filesWritten: ReadonlyArray<string>
}

export async function installGhFiles(targetDir: string): Promise<InstallGhFilesResult> {
  const written: string[] = []

  for (const rel of FILES_TO_COPY) {
    const src = path.join(STATIC_GH_ROOT, rel)
    const dst = path.join(targetDir, '.github', rel)
    await fs.mkdir(path.dirname(dst), { recursive: true })
    const body = await fs.readFile(src, 'utf8')
    await fs.writeFile(dst, body, 'utf8')
    written.push(dst)
  }

  return { filesWritten: written }
}
