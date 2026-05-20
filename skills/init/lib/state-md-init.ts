// 2026-05-11 (Luiz/dev): grava detected_stack em docs/STATE.md.
// Plano 02 fase-06 — atende CA-19/20/21.
// Defensivo: funciona mesmo se docs/STATE.md nao existir ainda (skeleton minimo).
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — usa stack.primary ?? 'unknown' (Plano 01 fase-03).
// CA-10 regressao: STATE.md preserva StackId interno (node-ts, rails, etc), nao matrix folder.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DetectedStack } from './detect-stack'

const STATE_MD_PATH_REL = path.join('docs', 'STATE.md')

export type WriteStackResult = {
  status: 'updated' | 'created'
  path: string
}

/**
 * Atualiza (ou cria) `docs/STATE.md` no `targetDir` com `detected_stack: <id>`.
 * Idempotente: segunda chamada com mesmo stack produz conteudo identico.
 * Nao cria `knowledge/` — escopo D37 respeitado.
 * 2026-05-20 (Luiz/dev): D1 do PRD knowledge-path-cutover — path atualizado (docs/knowledge/ → knowledge/)
 *
 * @example
 * const result = await writeStackToStateMd('/path/to/project', { primary: 'nextjs', ... })
 * console.log(result.status) // 'updated' | 'created'
 */
export type WriteStackOptions = {
  /**
   * 2026-05-18 (Luiz/dev): writer injetavel — Quick Plan /init v6.4.0 fix (dry-run wiring).
   * Default: fs.writeFile real. Em dry-run: makeWriter({dryRun:true,recorder}).
   */
  writeFile?: (path: string, body: string) => Promise<void>
}

export async function writeStackToStateMd(
  targetDir: string,
  stack: DetectedStack,
  opts: WriteStackOptions = {},
): Promise<WriteStackResult> {
  const filePath = path.join(targetDir, STATE_MD_PATH_REL)

  // 2026-05-18 (Luiz/dev): D22 — primary null representa fallback (antigo 'unknown').
  // Preservar string 'unknown' na saida para compatibilidade com consumers de STATE.md (CA-10).
  const stackLabel = stack.primary ?? 'unknown'

  let body: string
  let status: WriteStackResult['status']

  try {
    body = await fs.readFile(filePath, 'utf8')
    status = 'updated'
  } catch {
    // STATE.md nao existe ainda — escrever skeleton minimo.
    body = '# State\n\n## Resources\n\n- detected_stack: unknown\n\n## Recent Activity\n\n## Pending\n'
    status = 'created'
  }

  // Substituicao idempotente — regex captura linha "- detected_stack: <qualquer>"
  const replaced = body.replace(
    /^- detected_stack:.*$/m,
    `- detected_stack: ${stackLabel}`,
  )

  // Se a linha nao existia (template editado a mao), append em ## Resources.
  const finalBody = replaced.includes(`detected_stack: ${stackLabel}`)
    ? replaced
    : replaced.replace(/(^## Resources\s*$)/m, `$1\n\n- detected_stack: ${stackLabel}`)

  const writer = opts.writeFile ?? (async (p: string, b: string) => {
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, b, 'utf8')
  })
  await writer(filePath, finalBody)

  return { status, path: filePath }
}
