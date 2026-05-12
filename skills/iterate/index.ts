// 2026-05-11 (Luiz/dev): D10 wrapper — expoe iterate() consumindo runCompoundGate
import { runCompoundGate, type GatePromptFn } from '../lib/compound-decision-gate'
import { listActivePlans } from '../lib/exec-plan-mover'
import { readExecPlan, isComplete } from '../lib/exec-plan-reader'

export type IterateResult = {
  gatesRun: number
  plans: Array<{ planPath: string; moved: boolean }>
}

export async function iterate(
  promptFn: GatePromptFn,
  projectRoot: string = process.cwd(),
): Promise<IterateResult> {
  const activePlans = await listActivePlans(projectRoot)
  let gatesRun = 0
  const plans: Array<{ planPath: string; moved: boolean }> = []

  for (const planPath of activePlans) {
    const plan = await readExecPlan(planPath)
    if (!isComplete(plan)) continue
    const result = await runCompoundGate({ projectRoot, planPath }, promptFn)
    gatesRun++
    plans.push({ planPath, moved: result.planMoved })
  }

  return { gatesRun, plans }
}
