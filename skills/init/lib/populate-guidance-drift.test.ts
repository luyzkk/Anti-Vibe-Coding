// skills/init/lib/populate-guidance-drift.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — drift test entre mustCover e prosa.

import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { POPULATE_INSTRUCTIONS_BY_DOC } from './populate-instructions-table'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')

/**
 * Extrai os nomes de H3 que aparecem dentro da secao "## Por H2 — o que escrever"
 * em um arquivo de guidance .md.
 *
 * Regra: pega todas as linhas que comecam com `### ` apos a linha que comeca com
 * `## Por H2` e antes da proxima linha que comeca com `## ` (proxima H2).
 */
function extractH2NamesFromGuidance(content: string): string[] {
  const lines = content.split('\n')
  const result: string[] = []
  let inSection = false
  for (const line of lines) {
    if (line.startsWith('## Por H2')) {
      inSection = true
      continue
    }
    if (inSection && line.startsWith('## ')) {
      // chegou na proxima H2
      break
    }
    if (inSection && line.startsWith('### ')) {
      result.push(line.replace(/^###\s+/, '').trim())
    }
  }
  return result
}

describe('drift test: mustCover keys ↔ guidance .md H3 names', () => {
  test('every mustCover key has a matching ### subsection in the guidance .md', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const guidancePath = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(guidancePath, 'utf-8')
      const proseSubsections = new Set(extractH2NamesFromGuidance(content))
      const mustCoverKeys = Object.keys(instr.mustCover)

      for (const key of mustCoverKeys) {
        expect(
          proseSubsections.has(key),
          `${doc}: mustCover key "${key}" has no matching ### in ${instr.guidanceFile}\n` +
          `  Prose subsections found: ${[...proseSubsections].join(', ') || '(none)'}`,
        ).toBe(true)
      }
    }
  })

  test('no orphan ### in guidance .md (every prose subsection is in mustCover)', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const guidancePath = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(guidancePath, 'utf-8')
      const proseSubsections = extractH2NamesFromGuidance(content)
      const mustCoverKeys = new Set(Object.keys(instr.mustCover))

      for (const sub of proseSubsections) {
        expect(
          mustCoverKeys.has(sub),
          `${doc}: orphan ### "${sub}" in ${instr.guidanceFile} (no matching mustCover key)`,
        ).toBe(true)
      }
    }
  })
})
