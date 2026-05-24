// 2026-05-24 (Luiz/dev): P2 — PRD SH-04/D8/D10 + RNF-02 idempotencia
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { PatchResult } from './patch-types'

// 2026-05-24 (Luiz/dev): D10 — ordem canonica: Compound Opportunity → Review Checklist → Validation Log → Lessons Captured
const NEW_PLAN_SECTIONS = [
  '## Compound Opportunity',
  '## Review Checklist',
  '## Validation Log',
  '## Lessons Captured',
]

const EXIT_CRITERIA_MARKER = '## Exit Criteria'

export async function patchNewPlanTpl(targetRoot: string): Promise<PatchResult> {
  // 2026-05-24 (Luiz/dev): suporta .ts.tpl ou .mjs (RF-04) — tenta na ordem, opera no 1o encontrado
  const candidates = ['scripts/new-plan.ts.tpl', 'scripts/new-plan.mjs', 'scripts/new-plan.ts']
  let tplPath: string | undefined
  for (const c of candidates) {
    const abs = path.join(targetRoot, c)
    if (await fs.access(abs).then(() => true).catch(() => false)) {
      tplPath = abs
      break
    }
  }

  if (!tplPath) {
    return { status: 'already-present', message: 'No new-plan template found — skip P2' }
  }

  const content = await fs.readFile(tplPath, 'utf-8')

  // 2026-05-24 (Luiz/dev): idempotencia — se todas as 4 secoes ja presentes, no-op (RNF-02)
  const allPresent = NEW_PLAN_SECTIONS.every((s) => content.includes(s))
  if (allPresent) {
    return {
      status: 'already-present',
      message: 'new-plan template already has 4 compound sections — no patch needed',
    }
  }

  // 2026-05-24 (Luiz/dev): D10 — monta bloco das 4 secoes com placeholder
  const sectionsBlock = NEW_PLAN_SECTIONS.map(
    (s) => `${s}\n\n_(Preenchido durante execucao.)_\n`,
  ).join('\n')

  const exitIdx = content.indexOf(EXIT_CRITERIA_MARKER)

  let patched: string
  if (exitIdx >= 0) {
    // 2026-05-24 (Luiz/dev): D10 — insere ANTES de `## Exit Criteria`
    patched = `${content.slice(0, exitIdx)}${sectionsBlock}\n${content.slice(exitIdx)}`
  } else {
    // 2026-05-24 (Luiz/dev): degraded — sem Exit Criteria; append no fim
    patched = `${content.trimEnd()}\n\n${sectionsBlock}\n`
  }

  await fs.writeFile(tplPath, patched)
  return {
    status: 'patched',
    message: `Patched ${path.relative(targetRoot, tplPath)}: injected 4 compound sections before ${EXIT_CRITERIA_MARKER}`,
  }
}
