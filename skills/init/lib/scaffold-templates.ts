// 2026-05-11 (Luiz/dev): helper de scaffold — fase-02 do plano01 v6.0.0
// Alinhado com D9 (/init absorve harness) e D13 (TS+bun).

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ScaffoldOptions = {
  targetDir: string
  templatesDir: string
  projectName: string
  stack: string
  /**
   * 2026-05-18 (Luiz/dev): writer injetavel — Quick Plan /init v6.4.0 fix (dry-run wiring).
   * Default: fs.writeFile + mkdir reais. Em dry-run: makeWriter({dryRun:true,recorder}).
   */
  writeFile?: (dstPath: string, body: string) => Promise<void>
}

export type ScaffoldResult = {
  filesWritten: string[]
  /**
   * 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — bug 2 (overwrite destrutivo).
   * Arquivos preservados porque ja existiam no targetDir. Guard sempre-ativo.
   */
  filesSkipped: string[]
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function scaffoldTemplates(opts: ScaffoldOptions): Promise<ScaffoldResult> {
  const filesWritten: string[] = []
  const filesSkipped: string[] = []

  const defaultWriter = async (dstPath: string, body: string): Promise<void> => {
    await fs.mkdir(path.dirname(dstPath), { recursive: true })
    await fs.writeFile(dstPath, body, 'utf8')
  }
  const writer = opts.writeFile ?? defaultWriter

  const pairs: ReadonlyArray<readonly [string, string]> = [
    ['AGENTS.md.tpl', 'AGENTS.md'],
    ['ARCHITECTURE.md.tpl', 'ARCHITECTURE.md'],
    // Adicionados em fase-04:
    ['scripts/harness-validate.ts.tpl', 'scripts/harness-validate.ts'],
    ['package.json.tpl', 'package.json'],
  ]

  for (const [src, dst] of pairs) {
    const srcPath = path.join(opts.templatesDir, src)
    const dstPath = path.join(opts.targetDir, dst)

    // 2026-05-18 (Luiz/dev): guard sempre-ativo. Independente de dry-run, NUNCA sobrescrever
    // arquivo preexistente. Defesa contra cross-upgrade destrutivo (Quick Plan /init v6.4.0).
    if (await fileExists(dstPath)) {
      filesSkipped.push(dstPath)
      continue
    }

    // 2026-05-11 (Luiz/dev): + {{TODAY}} para alinhar com scaffoldFullTree — Plano 02 fase-02.
    const today = new Date().toISOString().slice(0, 10)
    const tpl = await fs.readFile(srcPath, 'utf8')
    const rendered = tpl
      .replaceAll('{{PROJECT_NAME}}', opts.projectName)
      .replaceAll('{{STACK}}', opts.stack)
      .replaceAll('{{TODAY}}', today)
      // ARCHITECTURE.md.tpl extras — default to "TBD" until Plano 02 fase-03
      .replaceAll('{{ONE_LINE_DESCRIPTION}}', 'TBD')
      .replaceAll('{{RUNTIME}}', 'TBD')
      .replaceAll('{{FRAMEWORK}}', 'TBD')
      .replaceAll('{{DATABASE}}', 'TBD')

    await writer(dstPath, rendered)
    filesWritten.push(dstPath)
  }

  return { filesWritten, filesSkipped }
}
