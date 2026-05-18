// 2026-05-11 (Luiz/dev): expande scaffoldTemplates do Plano 01 para a arvore inteira.
// Plano 02 fase-02. Alinhado com PRD M2 e CA-06.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST, TEMPLATES_ROOT, type TemplateEntry } from './template-manifest'

export type ScaffoldFullTreeOptions = {
  targetDir: string
  projectName: string
  stack: string
  /** Stack ja detectado para preencher {{DETECTED_STACK}} em STATE.md.tpl. Opcional — default 'unknown'. */
  detectedStack?: string
  /**
   * 2026-05-18 (Luiz/dev): writer injetavel — Quick Plan /init v6.4.0 fix (dry-run wiring).
   * Default: fs.writeFile + mkdir reais. Em dry-run: makeWriter({dryRun:true,recorder}).
   */
  writeFile?: (dstPath: string, body: string) => Promise<void>
}

export type ScaffoldFullTreeResult = {
  filesWritten: ReadonlyArray<string>
  /**
   * 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — bug 3 (overwrite destrutivo).
   * Arquivos preservados porque ja existiam no targetDir. Guard sempre-ativo.
   */
  filesSkipped: ReadonlyArray<string>
  durationMs: number
}

function renderTemplate(body: string, vars: Record<string, string>): string {
  let out = body
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v)
  }
  return out
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function scaffoldFullTree(opts: ScaffoldFullTreeOptions): Promise<ScaffoldFullTreeResult> {
  const start = Date.now()
  const filesWritten: string[] = []
  const filesSkipped: string[] = []

  const defaultWriter = async (dstPath: string, body: string): Promise<void> => {
    await fs.mkdir(path.dirname(dstPath), { recursive: true })
    await fs.writeFile(dstPath, body, 'utf8')
  }
  const writer = opts.writeFile ?? defaultWriter

  // 2026-05-11 (Luiz/dev): {{TODAY}} adicionado para TODO.md.tpl — fase-01 introduziu.
  // 2026-05-11 (Luiz/dev): {{DETECTED_STACK}} adicionado para STATE.md.tpl — fase-06.
  // detectedStack e opcional (backward-compat): se ausente, STATE.md mostra 'unknown' ate
  // writeStackToStateMd ser chamado em Step 3 do SKILL.md.
  const vars: Record<string, string> = {
    PROJECT_NAME: opts.projectName,
    STACK: opts.stack,
    TODAY: new Date().toISOString().slice(0, 10),
    DETECTED_STACK: opts.detectedStack ?? 'unknown',
  }

  // Paraleliza por entry — cada uma e independente (mkdir + read + write).
  // Promise.all com mkdir { recursive: true } e seguro: kernel garante atomicidade
  // para entries no mesmo diretorio (ex: 6 entries em docs/review-checklists/).
  await Promise.all(
    TEMPLATE_MANIFEST.map(async (entry: TemplateEntry) => {
      const srcPath = path.join(TEMPLATES_ROOT, entry.src)
      const dstPath = path.join(opts.targetDir, entry.dst)

      // 2026-05-18 (Luiz/dev): guard sempre-ativo. Independente de dry-run, NUNCA sobrescrever
      // arquivo preexistente. Defesa contra cross-upgrade destrutivo (Quick Plan /init v6.4.0).
      if (await fileExists(dstPath)) {
        filesSkipped.push(dstPath)
        return
      }

      const tpl = await fs.readFile(srcPath, 'utf8')
      const rendered = renderTemplate(tpl, vars)
      await writer(dstPath, rendered)
      filesWritten.push(dstPath)
    }),
  )

  return {
    filesWritten,
    filesSkipped,
    durationMs: Date.now() - start,
  }
}
