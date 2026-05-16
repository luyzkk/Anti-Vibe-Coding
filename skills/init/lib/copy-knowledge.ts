// 2026-05-16 (Luiz/dev): cópia idempotente monostack — Plano 01 fase-03, D14 + CA-02 + CA-04.
// G2 do plano: STATE.md (escrita por state-md-init.ts) permanece intacta — esta fn é aditiva.
// G5 do plano: meta SLA ≤100ms (CA-02). Com 1 átomo é trivial; medido em fase-05 E2E.

import { cpSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type CopyKnowledgeArgs = {
  projectRoot: string
  pluginRoot: string
  primary: string | null
}

export type CopyKnowledgeResult =
  | { status: 'copied'; atomCount: number; durationMs: number }
  | { status: 'skipped'; reason: string }
  | { status: 'noop'; reason: string }

export async function copyKnowledge(args: CopyKnowledgeArgs): Promise<CopyKnowledgeResult> {
  const { projectRoot, pluginRoot, primary } = args

  if (primary === null) {
    return { status: 'noop', reason: 'unknown stack (primary=null)' }
  }

  const destRoot = join(projectRoot, '.claude', 'knowledge')
  if (existsSync(destRoot)) {
    return { status: 'skipped', reason: '.claude/knowledge already exists (use --refresh-knowledge in Plano 02 to force)' }
  }

  const sourceRoot = join(pluginRoot, 'docs', 'knowledge', primary)
  if (!existsSync(sourceRoot)) {
    return { status: 'noop', reason: `matrix folder absent: docs/knowledge/${primary}` }
  }

  const start = performance.now()
  cpSync(sourceRoot, destRoot, { recursive: true })
  const durationMs = performance.now() - start

  const atomsDir = join(destRoot, 'atoms')
  const atomCount = existsSync(atomsDir)
    ? readdirSync(atomsDir).filter((f) => f.endsWith('.md')).length
    : 0

  return { status: 'copied', atomCount, durationMs }
}
