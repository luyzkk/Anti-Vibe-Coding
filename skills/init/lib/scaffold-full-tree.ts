// 2026-05-11 (Luiz/dev): expande scaffoldTemplates do Plano 01 para a arvore inteira.
// Plano 02 fase-02. Alinhado com PRD M2 e CA-06.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST, TEMPLATES_ROOT, type TemplateEntry } from './template-manifest'

export type ScaffoldFullTreeOptions = {
  targetDir: string
  projectName: string
  stack: string
}

export type ScaffoldFullTreeResult = {
  filesWritten: ReadonlyArray<string>
  durationMs: number
}

function renderTemplate(body: string, vars: Record<string, string>): string {
  let out = body
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v)
  }
  return out
}

export async function scaffoldFullTree(opts: ScaffoldFullTreeOptions): Promise<ScaffoldFullTreeResult> {
  const start = Date.now()
  const filesWritten: string[] = []

  // 2026-05-11 (Luiz/dev): {{TODAY}} adicionado para TODO.md.tpl — fase-01 introduziu.
  const vars: Record<string, string> = {
    PROJECT_NAME: opts.projectName,
    STACK: opts.stack,
    TODAY: new Date().toISOString().slice(0, 10),
  }

  // Paraleliza por entry — cada uma e independente (mkdir + read + write).
  // Promise.all com mkdir { recursive: true } e seguro: kernel garante atomicidade
  // para entries no mesmo diretorio (ex: 6 entries em docs/review-checklists/).
  await Promise.all(
    TEMPLATE_MANIFEST.map(async (entry: TemplateEntry) => {
      const srcPath = path.join(TEMPLATES_ROOT, entry.src)
      const dstPath = path.join(opts.targetDir, entry.dst)

      await fs.mkdir(path.dirname(dstPath), { recursive: true })
      const tpl = await fs.readFile(srcPath, 'utf8')
      const rendered = renderTemplate(tpl, vars)
      await fs.writeFile(dstPath, rendered, 'utf8')
      filesWritten.push(dstPath)
    }),
  )

  return {
    filesWritten,
    durationMs: Date.now() - start,
  }
}
