// 2026-05-24 (Luiz/dev): subcomando install — PRD D17-A, CA-04/05/06/20, D11

import { getCompoundManifest } from './manifest'
import type { InstallOpts, InstallResult } from './install-types'
import { patchAgentsMd } from './patch-agents'
import { patchNewPlanTpl } from './patch-new-plan'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// 2026-05-24 (Luiz/dev): nunca toca docs/compound/*.md (exceto README.md) — RF-11, CA-06
// Regex: qualquer .md dentro de docs/compound/ que NAO seja README.md
const COMPOUND_NOTES_RE = /^docs\/compound\/(?!README\.md$)[^/]+\.md$/

export async function installCompound(
  targetRoot: string,
  opts: InstallOpts,
): Promise<InstallResult> {
  const result: InstallResult = { created: [], skipped: [], overwritten: [], notes: [] }
  const manifest = getCompoundManifest()

  // 2026-05-24 (Luiz/dev): G5 — stack-agnostic (D11/CA-20). Sem package.json = nota UX, sem patch npm
  const hasPackageJson = await fileExists(path.join(targetRoot, 'package.json'))
  if (!hasPackageJson) {
    result.notes.push(
      "No package.json detected — installed compound-check.ts as standalone (run via 'bun scripts/compound-check.ts')",
    )
  }

  for (const entry of manifest) {
    // 2026-05-24 (Luiz/dev): normaliza dst para forward slash (Windows usa backslash internamente)
    const dstNorm = entry.dst.replace(/\\/g, '/')

    // 2026-05-24 (Luiz/dev): notas de usuario (docs/compound/*.md) NUNCA sao alvo — D17-A, RF-11, CA-06
    if (COMPOUND_NOTES_RE.test(dstNorm)) continue

    const absDst = path.join(targetRoot, entry.dst)
    const exists = await fileExists(absDst)

    if (exists && !opts.force) {
      result.skipped.push(dstNorm)
      continue
    }

    await fs.mkdir(path.dirname(absDst), { recursive: true })
    await fs.copyFile(entry.src, absDst)

    if (exists) {
      result.overwritten.push(dstNorm)
    } else {
      result.created.push(dstNorm)
    }
  }

  // 2026-05-24 (Luiz/dev): patches P1/P2 — PRD SH-03/SH-04 + idempotencia RNF-02
  // Sempre executam apos o loop de copia (sem flag adicional)
  const p1 = await patchAgentsMd(targetRoot)
  result.notes.push(p1.message)
  const p2 = await patchNewPlanTpl(targetRoot)
  result.notes.push(p2.message)

  return result
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
