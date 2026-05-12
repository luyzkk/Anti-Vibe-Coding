// 2026-05-11 (Luiz/dev): D10 wrapper — expoe quickPlan() consumindo writeExecPlan modo quick
import { writeExecPlan } from '../lib/exec-plan-template'
import { renderCompletionSignal } from '../lib/completion-signal'

export async function quickPlan(
  titleOrArg: string,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string }> {
  const result = await writeExecPlan(projectRoot, { title: titleOrArg, mode: 'quick' })
  // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal para orquestradores
  console.log('\n\n' + renderCompletionSignal({
    skill: 'quick-plan',
    status: 'complete',
    outputs: [result.filePath],
    next_suggested: '/execute-plan',
    blocks_for_user: [],
  }))
  return result
}
