// skills/init/lib/steps/07-generate-populate-plans.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-04 — substitui stub do Plano 01 fase-04.
// Step 7 do pipeline v7 (DV-1 + DV-3 deram +2 steps, este e o "Step 5" do PRD).
//
// Contratos:
//   - input: ctx.stack populado pelo Step 2 (Plano 01 fase-02). DV-4: opcional no Plano 01,
//     obrigatorio aqui — DR-2 aborta se ausente.
//   - output: 1 pasta docs/exec-plans/active/{date}-populate-harness/ com PRD, CONTEXT, PLAN e 16 fases.
//   - abort: AbortError code=20 com mensagem DR-2 se stack=null.
//
// G5 do Plano 04 README: DR-2 override do RF-11. RF-11 dizia "copy-knowledge pula gracioso"
// — Step 7 e diferente: sem stack, Waves nao tem como ser path-resolved. Aborta hard.
// 2026-05-21 (Luiz/dev): Plano 02 fase-02 — wording ABORT_MESSAGE + summary refletindo hierarquia.

import type { Step } from './types'
import { AbortError } from './abort-error'
import { generatePopulatePlans } from '../populate-plan-generator'

export const STEP_ID = 'generate-populate-plans' as const
export const ABORT_CODE_NO_STACK = 20 as const

/**
 * Mensagem literal do abort DR-2. Wording-stable — teste de fase-02 valida bytes exatos.
 * Mudar = mudar teste de proposito.
 * 2026-05-21 (Luiz/dev): Plano 02 fase-02 — DR-2 wording refletindo hierarquia.
 */
export const ABORT_MESSAGE_NO_STACK =
  'Stack not detected — run /anti-vibe-coding:detect-architecture before /init.\n' +
  'Detected primary: null.\n' +
  'Waves in the 16 populate-harness fases cannot be path-resolved without stack.'

/**
 * Prompt extension para o gate greenfield. Anexado a ABORT_MESSAGE_NO_STACK no
 * needsUser.prompt — mantem a mensagem DR-2 byte-identical e adiciona as opcoes.
 * 2026-05-28 (Luiz/dev): bug fix /init greenfield.
 */
const GREENFIELD_PROMPT_SUFFIX = '\n\n(s)kip populate-plan and continue, or (a)bort?'

export const generatePopulatePlansStep: Step = {
  id: STEP_ID,

  async run(ctx) {
    // 2026-05-28 (Luiz/dev): DR-2 hard abort substituido por gate interativo para suportar
    // greenfield (repo zerado sem package.json/Gemfile). Hierarquia de decisao:
    //   1. --skip-populate-plan flag → skip silencioso (CI override)
    //   2. 1a invocacao sem __interactiveAnswer → return needsUser (dispatcher pergunta)
    //   3. 2a invocacao: 's' → skip gracioso; 'a' → AbortError historico
    // ABORT_MESSAGE_NO_STACK preservado byte-identical (teste valida).
    if (!ctx.stack || ctx.stack.primary === null) {
      if (ctx.flags['skip-populate-plan'] === true) {
        return {
          mutated: false,
          summary: 'init-07: populate-plan skipped (--skip-populate-plan flag) — stack not detected',
        }
      }

      const answer = ctx.flags['__interactiveAnswer']
      if (typeof answer !== 'string') {
        return {
          mutated: false,
          summary: '',
          needsUser: {
            prompt: ABORT_MESSAGE_NO_STACK + GREENFIELD_PROMPT_SUFFIX,
            options: ['s', 'a'] as const,
          },
        }
      }

      const normalized = answer.trim().toLowerCase()
      if (normalized === 'a') {
        throw new AbortError({
          code: ABORT_CODE_NO_STACK,
          reason: ABORT_MESSAGE_NO_STACK,
        })
      }
      return {
        mutated: false,
        summary: 'init-07: populate-plan skipped by user — stack not detected',
      }
    }

    const result = await generatePopulatePlans({
      cwd: ctx.cwd,
      stack: ctx.stack,
    })

    // NFR Observabilidade — 4 metricas no summary multilinha.
    // 2026-05-21 (Luiz/dev): Plano 02 fase-02 — summary aponta para pasta unica (hierarquia).
    const summary = [
      `init-07: 1 folder generated with ${result.fasePlans.length} fases (${result.stackPrimary} stack)`,
      `Folder: ${result.folderPath}`,
      `Legacy artifacts found: ${result.legacyArtifactsFound}`,
      `Docs skipped: ${result.docsSkipped.length} (${result.docsSkipped.join(', ') || 'none excluded'})`,
    ].join('\n')

    return {
      mutated: true,
      summary,
    }
  },
}
