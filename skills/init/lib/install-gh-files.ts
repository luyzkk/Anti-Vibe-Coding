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

export type InstallGhFilesOptions = {
  /**
   * 2026-05-18 (Luiz/dev): writer injetavel — Quick Plan /init v6.4.0 fix (dry-run wiring).
   * Default: fs.writeFile + mkdir reais. Em dry-run: makeWriter({dryRun:true,recorder}).
   */
  writeFile?: (path: string, body: string) => Promise<void>
}

export async function installGhFiles(
  targetDir: string,
  opts: InstallGhFilesOptions = {},
): Promise<InstallGhFilesResult> {
  const written: string[] = []
  const writer = opts.writeFile ?? (async (p: string, b: string) => {
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, b, 'utf8')
  })

  for (const rel of FILES_TO_COPY) {
    const src = path.join(STATIC_GH_ROOT, rel)
    const dst = path.join(targetDir, '.github', rel)
    const body = await fs.readFile(src, 'utf8')
    await writer(dst, body)
    written.push(dst)
  }

  return { filesWritten: written }
}
