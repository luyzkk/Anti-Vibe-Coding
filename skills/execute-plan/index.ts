// 2026-05-11 (Luiz/dev): D10 wrapper — expoe listActive() e onPlanPotentiallyComplete()
import { listActivePlans, moveToCompleted } from '../lib/exec-plan-mover'
import { readExecPlan, isComplete } from '../lib/exec-plan-reader'

export async function listActive(projectRoot: string = process.cwd()): Promise<string[]> {
  return listActivePlans(projectRoot)
}

export async function onPlanPotentiallyComplete(
  projectRoot: string,
  planPath: string,
): Promise<{ moved: boolean; newPath?: string }> {
  const plan = await readExecPlan(planPath)
  if (!isComplete(plan)) return { moved: false }
  const { newPath } = await moveToCompleted(projectRoot, planPath)
  return { moved: true, newPath }
}
