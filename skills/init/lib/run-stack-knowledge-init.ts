// 2026-05-17 (Luiz/dev): Wave 5 D2 — extracao orquestracao /init Stack Knowledge para callable + testavel.
// Antes vivia inline em SKILL.md Step 3.1 como snippet bun -e (HIGH #5 do verify-work pos Plano 01).

import { detectMultiStack } from './detect-multi-stack'
import { writeStackJson } from './write-stack-json'
import { copyKnowledge } from './copy-knowledge'
import type { CopyKnowledgeResult } from './copy-knowledge'
import { parseRefreshFlag } from './parse-refresh-flag'
import { parseTopKeywords, formatKnowledgePreview, TOP_N_KEYWORDS } from './format-knowledge-preview'
import { emitStackKnowledgeEvents } from './emit-stack-knowledge-events'
import { join } from 'node:path'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface RunStackKnowledgeInitOpts {
  targetDir: string
  pluginRoot: string
  args?: string
  /** Sink for preview output. Default: console.log. Tests override. */
  logger?: (line: string) => void
}

export interface RunStackKnowledgeInitResult {
  stackPrimary: string | null
  stackJsonMessage: string
  copyResult: CopyKnowledgeResult
  previewEmitted: boolean
}

export async function runStackKnowledgeInit(opts: RunStackKnowledgeInitOpts): Promise<RunStackKnowledgeInitResult> {
  const { targetDir, pluginRoot, args = '', logger = console.log } = opts
  const refresh = parseRefreshFlag(args)
  const detection = await detectMultiStack(targetDir)
  const { written: stackJson } = await writeStackJson(targetDir, detection)
  const stackJsonMessage = `stack.json written. primary = ${stackJson.primary}`
  logger(stackJsonMessage)

  const copyResult = await copyKnowledge({ targetDir, pluginRoot, primary: stackJson.primary, refresh })
  logger(copyResult.message)

  // M2.6: transactional consistency — if copy failed (no-source or no-matrix after primary was set),
  // patch stack.json to set primary=null so it doesn't claim a stack that has no knowledge atoms.
  // Trade-off: we prefer a slightly stale detected_at over a misleading primary field.
  if ((copyResult.status === 'no-source' || copyResult.status === 'no-matrix') && stackJson.primary !== null) {
    const stackJsonPath = path.join(targetDir, '.claude', 'stack.json')
    try {
      const patched = { ...stackJson, primary: null }
      await fs.writeFile(stackJsonPath, JSON.stringify(patched, null, 2) + '\n', 'utf8')
    } catch {
      // M2.6: best-effort patch — if it fails, the inconsistency remains but we don't break the caller
    }
  }

  // M2.4: informative message when a stack was detected via anchor but has no matrix folder in this version
  const noMatrixFolders = detection.recognized_no_matrix ?? []
  if (noMatrixFolders.length > 0 && stackJson.primary === null) {
    const names = noMatrixFolders.join(', ')
    logger(
      `Stack ${names} detectada (anchor: ${detection.anchor_files.join(', ')}) mas matrix não disponível em v6.3.2. Disponível para Node+TS, Rails, Python, Laravel.`,
    )
  }

  // RF9 — emitir eventos auxiliares de dominio via helper (M1.3 SRP).
  // G7: emitStackKnowledgeEvents e void/silencioso — fire-and-forget preservado.
  emitStackKnowledgeEvents({ detection, copyResult, baseDir: targetDir })

  // RF10 preview — top-N keywords ao output user-facing (PRD §Could Haves)
  const indexPath = join(targetDir, '.claude/knowledge/INDEX.md')
  const preview = formatKnowledgePreview(await parseTopKeywords(indexPath, TOP_N_KEYWORDS))
  let previewEmitted = false
  if (preview) {
    logger(preview)
    previewEmitted = true
  }

  return { stackPrimary: stackJson.primary, stackJsonMessage, copyResult, previewEmitted }
}
