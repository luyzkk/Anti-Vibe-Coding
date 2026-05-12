// 2026-05-11 (Luiz/dev): D10 wrapper — expoe listActive() e onPlanPotentiallyComplete()
import { listActivePlans, moveToCompleted } from '../lib/exec-plan-mover'
import { readExecPlan, isComplete } from '../lib/exec-plan-reader'
import { renderCompletionSignal } from '../lib/completion-signal'
import path from 'node:path'

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
  // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal quando plano e movido para completed
  const relPath = newPath !== undefined ? path.relative(projectRoot, newPath) : path.relative(projectRoot, planPath)
  console.log('\n\n' + renderCompletionSignal({
    skill: 'execute-plan',
    status: 'complete',
    outputs: [relPath],
    next_suggested: '/iterate',
    blocks_for_user: [],
  }))
  return { moved: true, newPath }
}
