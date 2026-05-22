// skills/init/lib/steps/07-generate-populate-plans.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-04 — substitui stub do Plano 01 fase-04.
// Step 7 do pipeline v7 (DV-1 + DV-3 deram +2 steps, este e o "Step 5" do PRD).
//
// Contratos:
//   - input: ctx.stack populado pelo Step 2 (Plano 01 fase-02). DV-4: opcional no Plano 01,
//     obrigatorio aqui — DR-2 aborta se ausente.
//   - output: 16 PLAN.md em docs/exec-plans/active/{date}-populate-{slug}/PLAN.md.
//   - abort: AbortError code=20 com mensagem DI-Plano04-fase04-abort-message se stack=null.
//
// G5 do Plano 04 README: DR-2 override do RF-11. RF-11 dizia "copy-knowledge pula gracioso"
// — Step 7 e diferente: sem stack, Waves nao tem como ser path-resolved. Aborta hard.

import type { Step } from './types'
import { AbortError } from './abort-error'
import { generatePopulatePlans } from '../populate-plan-generator'

export const STEP_ID = 'generate-populate-plans' as const
export const ABORT_CODE_NO_STACK = 20 as const

/**
 * Mensagem literal do abort DR-2. Wording-stable — teste de fase-04 valida bytes exatos.
 * Mudar = mudar teste de proposito.
 */
export const ABORT_MESSAGE_NO_STACK =
  'Stack not detected — run /anti-vibe-coding:detect-architecture before /init.\n' +
  'Detected primary: null.\n' +
  'Waves in 16 populate plans cannot be path-resolved without stack.'

export const generatePopulatePlansStep: Step = {
  id: STEP_ID,

  async run(ctx) {
    // DR-2 (G5 do Plano 04 README): aborta se stack ausente ou primary=null.
    if (!ctx.stack || ctx.stack.primary === null) {
      throw new AbortError({
        code: ABORT_CODE_NO_STACK,
        reason: ABORT_MESSAGE_NO_STACK,
      })
    }

    const result = await generatePopulatePlans({
      cwd: ctx.cwd,
      stack: ctx.stack,
    })

    // NFR Observabilidade — 4 metricas no summary multilinha.
    const summary = [
      `init-07: ${result.fasePlans.length} plans generated (${result.stackPrimary} stack)`,
      `Legacy artifacts found: ${result.legacyArtifactsFound}`,
      `Docs skipped: ${result.docsSkipped.length} (${result.docsSkipped.join(', ') || 'none excluded'})`,
      `Output: docs/exec-plans/active/${result.folderPath.split('/').at(-1)}/`,
    ].join('\n')

    return {
      mutated: true,
      summary,
    }
  },
}
