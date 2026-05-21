// skills/init/lib/steps/01-reentry-gate.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-03 — DR-1 do PLAN.md + DV-3 (gate em step proprio).
// Roda ANTES do Step 2 (legacy-and-stack scan) para evitar custo de I/O desnecessario
// em projeto ja inicializado. /init:refresh fica para D13 (adiado, nao prometido).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { AbortError } from './abort-error'
import type { Step } from './types'

async function manifestExists(cwd: string): Promise<string | null> {
  const manifestPath = path.join(cwd, '.claude', 'legacy-manifest.json')
  try {
    const stat = await fs.stat(manifestPath)
    return stat.isFile() ? manifestPath : null
  } catch {
    return null
  }
}

export const reentryGateStep: Step = {
  id: 'reentry-gate',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): code 10 reservado para re-entry blocks.
    // Codes 1-2 usados por legacy-scanner v6.7 (sera deletado em fase-05).
    const existing = await manifestExists(ctx.cwd)
    if (existing !== null) {
      throw new AbortError({
        code: 10,
        reason:
          `Project already initialized (legacy-manifest found at ${path.relative(ctx.cwd, existing)}).\n` +
          'Re-running /init is not supported in v7. Use /init:refresh when available (D13, post-v7).\n' +
          'If you need to force a re-init, delete the manifest manually and re-run.',
      })
    }

    return { mutated: false, summary: 'no prior manifest — proceeding' }
  },
}
