// 2026-05-11 (Luiz/dev): D10 wrapper — expoe create() consumindo writeExecPlan (fase-03 helper)
import { writeExecPlan, type ExecPlanInput } from '../lib/exec-plan-template'
import { renderCompletionSignal } from '../lib/completion-signal'

export type PlanCreateInput = string | { title: string }

export async function create(
  arg: PlanCreateInput,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string }> {
  const title = typeof arg === 'string' ? arg : arg.title
  const result = await writeExecPlan(projectRoot, { title, mode: 'full' })
  // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal para orquestradores
  console.log('\n\n' + renderCompletionSignal({
    skill: 'plan-feature',
    status: 'complete',
    outputs: [result.filePath],
    next_suggested: '/execute-plan',
    blocks_for_user: [],
  }))
  return result
}
