// 2026-05-18 (Luiz/dev): MH-01 do PRD — Step 91 emite PLAN.md de populacao em disco.
// D3 do PRD: init NAO invoca /execute-plan — apenas sugere via summary.
// G1 do plano02: NUNCA chamar a skill /execute-plan programaticamente daqui.
// SH-07 do PRD / G8 do plano02: subagent_id canonico para audit log futuro (Plano 06 fase-01).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectProjectName } from '../detect-project-name'
import { generatePopulatePlan } from '../populate-plan-generator'
import type { Step } from './types'
import { isDryRun } from '../dry-run-mode'

/** SH-07 do PRD — subagent_id canonico para Plano 06 fase-01 audit log padronizado. */
export const SUBAGENT_ID = 'init-populate-plan-gen' as const

/** Step 91: gera PLAN.md de populacao do harness em `docs/exec-plans/active/{date}-populate-harness/`. */
export const generatePopulatePlanStep: Step = {
  id: '91-generate-populate-plan',
  async run(ctx) {
    // 2026-05-18 (Luiz/dev): Plano 05 fase-01 — dry-run bypass: preview sem escrever PLAN.md
    if (isDryRun(ctx)) {
      const projectName = detectProjectName(ctx.cwd)
      const result = await generatePopulatePlan({ cwd: ctx.cwd, projectName })
      return {
        mutated: false,
        summary: `dry-run: would generate populate plan at ${result.relativePath} with ${result.tasks.length} tasks`,
      }
    }

    const projectName = detectProjectName(ctx.cwd)

    // 2026-05-18 (Luiz/dev): CH-03 do PRD — no tracer bullet (greenfield), sharedGlossary
    // eh undefined porque Step 08 classify-blocks-hybrid (Plano 03) ainda nao rodou.
    // Plano 05 fase-03 (drift detector) e Plano 03 fase-06 podem passar terminologia real.
    const result = await generatePopulatePlan({
      cwd: ctx.cwd,
      projectName,
      // sharedGlossary: undefined  // explicit por documentacao
    })

    const absolutePath = path.join(ctx.cwd, result.relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, result.planMarkdown, 'utf8')

    // 2026-05-18 (Luiz/dev): RNF-05 do PRD — summary em PT-BR para mensagem final do init.
    const summary = [
      `Plano de populacao gerado: ${result.relativePath}`,
      `Tasks emitidas: ${result.tasks.length} (${result.tasks.filter(t => t.wave === 1).length} populacao + 1 validacao).`,
      'Para popular o harness com analise do repo: /anti-vibe-coding:execute-plan',
    ].join('\n')

    return { mutated: true, summary }
  },
}
