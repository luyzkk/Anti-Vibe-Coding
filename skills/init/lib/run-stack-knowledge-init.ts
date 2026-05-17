// 2026-05-17 (Luiz/dev): Wave 5 D2 — extracao orquestracao /init Stack Knowledge para callable + testavel.
// Antes vivia inline em SKILL.md Step 3.1 como snippet bun -e (HIGH #5 do verify-work pos Plano 01).

import { detectMultiStack } from './detect-multi-stack'
import { writeStackJson } from './write-stack-json'
import { copyKnowledge } from './copy-knowledge'
import type { CopyKnowledgeResult } from './copy-knowledge'
import { parseRefreshFlag } from './parse-refresh-flag'
import { parseTopKeywords, formatKnowledgePreview, TOP_N_KEYWORDS } from './format-knowledge-preview'
import { writeTelemetryDomainEvent } from '../../lib/telemetry-utils'
import { join } from 'node:path'

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

  // RF9 — emitir eventos auxiliares de dominio.
  // G7: writeTelemetryDomainEvent e silencioso (appendJsonlLine tem try/catch interno).
  const nowISO = new Date().toISOString()
  writeTelemetryDomainEvent({
    evento: 'stack_detected',
    skill_invocada: 'init',
    timestamp: nowISO,
    primary: detection.primary,
    secondary: detection.secondary,
    anchor_files: detection.anchor_files,
  }, targetDir)
  writeTelemetryDomainEvent({
    evento: 'knowledge_copied',
    skill_invocada: 'init',
    timestamp: nowISO,
    stack: detection.primary,
    atom_count: copyResult.atomCount,
    status: copyResult.status,
  }, targetDir)

  // RF10 preview — top-N keywords ao output user-facing (PRD §Could Haves)
  const indexPath = join(targetDir, '.claude/knowledge/INDEX.md')
  const preview = formatKnowledgePreview(parseTopKeywords(indexPath, TOP_N_KEYWORDS))
  let previewEmitted = false
  if (preview) {
    logger(preview)
    previewEmitted = true
  }

  return { stackPrimary: stackJson.primary, stackJsonMessage, copyResult, previewEmitted }
}
