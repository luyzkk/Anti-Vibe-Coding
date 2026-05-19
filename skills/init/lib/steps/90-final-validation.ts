// skills/init/lib/steps/90-final-validation.ts
// 2026-05-19 (Luiz/dev): reescrito — allowlist mode (Plano 04 fase-03).
// Substitui spawn de harness-validate por walk em docs/ + allowlist derivada de TEMPLATE_MANIFEST.
// Modo warning: nao lanca AbortError. Fase-04: try/catch defensivo para IO errors (CA-07 convergencia).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDryRun } from '../dry-run-mode'
import { buildAllowlistFromTemplateManifest, isAllowed, groupWarnings } from '../validator-allowlist'
import type { Step } from './types'

async function walkDocs(rootCwd: string): Promise<string[]> {
  const out: string[] = []
  async function walk(absDir: string): Promise<void> {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const absPath = path.join(absDir, e.name)
      // Normalize para forward-slash (Windows path.relative usa backslash)
      const rel = path.relative(rootCwd, absPath).split(path.sep).join('/')
      // G6: pular backup pre-6.5.0
      if (rel.startsWith('docs/_legacy')) continue
      if (e.isDirectory()) {
        await walk(absPath)
      } else if (e.isFile() && rel.endsWith('.md')) {
        out.push(rel)
      }
    }
  }
  await walk(path.join(rootCwd, 'docs'))
  return out
}

/**
 * Step 90 — validacao final via allowlist (PRD MH-08, CA-06).
 * Emite warnings agrupados; nao aborta init.
 */
export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    if (isDryRun(ctx)) {
      return { mutated: false, summary: 'dry-run: validator skipped (would check allowlist)' }
    }

    try {
      const allowlist = buildAllowlistFromTemplateManifest()
      const docs = await walkDocs(ctx.cwd)
      const unallowed = docs.filter((p) => !isAllowed(p, allowlist))

      if (unallowed.length === 0) {
        return { mutated: false, summary: 'validator: 0 warnings — scaffold canonico intacto' }
      }

      const grouped = groupWarnings(unallowed)
      const summary = `validator: ${grouped.length} warnings (${unallowed.length} paths fora do scaffold canonico)`
      return { mutated: false, summary }
    } catch (e) {
      // 2026-05-19 (Luiz/dev): Plano 04 fase-04 — degrade gracefully para IO errors.
      // Final-validation NUNCA aborta — Step 91 (ja rodado antes) preserva seus artefatos.
      // PRD MH-08 modo warning + CA-07 convergencia.
      const reason = e instanceof Error ? e.message : String(e)
      return { mutated: false, summary: `validator: skipped due to IO error (${reason})` }
    }
  },
}
