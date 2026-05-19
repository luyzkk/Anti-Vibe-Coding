// skills/init/lib/steps/04-customize-architecture.ts
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — usa stack.primary ?? 'unknown' (Plano 01 fase-03).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { customizeArchitecture } from '../customize-architecture'
import { detectStack } from '../detect-stack'
import { getDryRunMode, isDryRun } from '../dry-run-mode'
import { makeWriter } from '../dry-run'
import type { Step } from './types'

export const customizeArchitectureStep: Step = {
  id: 'customize-architecture',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): re-deteccao explicita do stack — mesmo padrao do SKILL.md linha 343.
    // NAO le STATE.md aqui. Trade-off: detectStack roda 2x (em Step 3 e Step 4). Aceitavel
    // porque detectStack eh idempotente e barata (le 1-2 arquivos). Preservar byte-idemp.
    const stack = await detectStack(ctx.cwd)
    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run wiring.
    const dryRun = isDryRun(ctx)
    // Em dry-run, Step 01 nao escreve ARCHITECTURE.md em disco — helper lancaria ENOENT (G2).
    // Skip antecipado quando arquivo nao existe + dry-run, mantendo wording compatible.
    // 2026-05-18 (Luiz/dev): D22 — stackLabel para mensagens de log
    const stackLabel = stack.primary ?? 'unknown'
    if (dryRun) {
      const archPath = path.join(ctx.cwd, 'ARCHITECTURE.md')
      const exists = await fs.access(archPath).then(() => true).catch(() => false)
      if (!exists) {
        return {
          mutated: false,
          summary: `dry-run: ARCHITECTURE.md would be customized for ${stackLabel} (file not present yet)`,
        }
      }
    }
    const writer = makeWriter(getDryRunMode(ctx))
    const result = await customizeArchitecture({
      targetDir: ctx.cwd,
      stack,
      writeFile: writer,
    })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 349 (PRD R1, G1).
    // Em-dash U+2014 entre stackLabel e "written". NAO alterar.
    const summary = `ARCHITECTURE.md customized for ${stackLabel} \u2014 written: ${result.written}`
    return { mutated: result.written && !dryRun, summary }
  },
}
