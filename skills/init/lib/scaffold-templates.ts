// 2026-05-11 (Luiz/dev): helper de scaffold — fase-02 do plano01 v6.0.0
// Alinhado com D9 (/init absorve harness) e D13 (TS+bun).

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ScaffoldOptions = {
  targetDir: string
  templatesDir: string
  projectName: string
  stack: string
}

export type ScaffoldResult = {
  filesWritten: string[]
}

export async function scaffoldTemplates(opts: ScaffoldOptions): Promise<ScaffoldResult> {
  const filesWritten: string[] = []

  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['AGENTS.md.tpl', 'AGENTS.md'],
    ['ARCHITECTURE.md.tpl', 'ARCHITECTURE.md'],
  ]

  for (const [src, dst] of pairs) {
    const srcPath = path.join(opts.templatesDir, src)
    const dstPath = path.join(opts.targetDir, dst)

    const tpl = await fs.readFile(srcPath, 'utf8')
    const rendered = tpl
      .replaceAll('{{PROJECT_NAME}}', opts.projectName)
      .replaceAll('{{STACK}}', opts.stack)
      // ARCHITECTURE.md.tpl extras — default to "TBD" until Plano 02 fase-03
      .replaceAll('{{ONE_LINE_DESCRIPTION}}', 'TBD')
      .replaceAll('{{RUNTIME}}', 'TBD')
      .replaceAll('{{FRAMEWORK}}', 'TBD')
      .replaceAll('{{DATABASE}}', 'TBD')

    await fs.writeFile(dstPath, rendered, 'utf8')
    filesWritten.push(dstPath)
  }

  return { filesWritten }
}
