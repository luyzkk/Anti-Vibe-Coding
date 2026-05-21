// scripts/grep-deleted-steps.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-05 — CA-09 grep-gate.
// Verifica que nenhum dos IDs/exports deletados no Plano 01 fase-05 persiste em skills/init/lib/.
// Cross-platform (sem dependencia de bash). Exit 0 = nenhum match (OK). Exit 1 = regressao detectada.

import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import type { Dirent } from 'node:fs'
import path from 'node:path'

const DELETED_PATTERNS = [
  // Step IDs/exports deletados no Plano 01 fase-05 (registry v6.7 -> v7).
  // 2026-05-21 (Luiz/dev): scaffoldFullTreeStep EXCLUIDO — 01-scaffold-full-tree.ts ainda existe
  // como lib orfa (nao esta no registry v7 mas exporta o symbol). Candidata a delete futuro.
  // Padrao: apenas symbols que NAO existem em nenhum arquivo vivo de skills/init/lib/.
  'secretsScan2Old',
  'discoverDocsStep',
  'classifyBlocksStep',
  'proposeMergeStep',
  'applyMergeDestructiveStep',
  'moveDocsStep',
  'detectDriftIncrementalStep',
  'persistStackKnowledgeStep',
  'deliveryLoopStep_v6',
]

const SEARCH_ROOT = path.join(import.meta.dir, '..', 'skills', 'init', 'lib')

function walkFiles(dir: string): string[] {
  const out: string[] = []
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as Dirent[]
  } catch {
    return out
  }
  for (const e of entries) {
    const name = String(e.name)
    const full = path.join(dir, name)
    if (e.isDirectory()) {
      out.push(...walkFiles(full))
    } else if (e.isFile() && (name.endsWith('.ts') || name.endsWith('.js'))) {
      out.push(full)
    }
  }
  return out
}

const regex = new RegExp(DELETED_PATTERNS.join('|'))
const files = walkFiles(SEARCH_ROOT)
const matches: Array<{ file: string; line: number; text: string }> = []

for (const file of files) {
  let content: string
  try {
    content = readFileSync(file, 'utf-8')
  } catch {
    continue
  }
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (regex.test(line)) {
      matches.push({ file, line: i + 1, text: line.trim() })
    }
  }
}

if (matches.length === 0) {
  console.log('grep-deleted-steps: OK — zero matches in skills/init/lib/')
  process.exit(0)
} else {
  console.error(`grep-deleted-steps: FAIL — ${matches.length} match(es) found (regression):`)
  for (const m of matches) {
    console.error(`  ${m.file}:${m.line}: ${m.text}`)
  }
  process.exit(1)
}
