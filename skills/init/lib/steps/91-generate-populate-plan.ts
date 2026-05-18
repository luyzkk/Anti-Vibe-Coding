// 2026-05-18 (Luiz/dev): MH-01 do PRD — Step 91 emite PLAN.md de populacao em disco.
// D3 do PRD: init NAO invoca /execute-plan — apenas sugere via summary.
// G1 do plano02: NUNCA chamar a skill /execute-plan programaticamente daqui.
// SH-07 do PRD / G8 do plano02: subagent_id canonico para audit log futuro (Plano 06 fase-01).
import type { Step } from './types'

/** SH-07 do PRD — subagent_id canonico para Plano 06 fase-01 audit log padronizado. */
export const SUBAGENT_ID = 'init-populate-plan-gen' as const

export const generatePopulatePlanStep: Step = {
  id: '91-generate-populate-plan',
  async run(_ctx) { throw new Error('not implemented') },
}
