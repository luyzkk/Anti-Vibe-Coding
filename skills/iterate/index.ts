// 2026-05-11 (Luiz/dev): D10 wrapper — expoe iterate() consumindo runCompoundGate
import { runCompoundGate, type GatePromptFn } from '../lib/compound-decision-gate'
import { listActivePlans } from '../lib/exec-plan-mover'
import { readExecPlan, isComplete } from '../lib/exec-plan-reader'
import { renderCompletionSignal } from '../lib/completion-signal'

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

  // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal apos ciclo de iteracao
  // next_suggested: '/lessons-learned' se capturou compound notes, null se nao
  const capturedAny = plans.some(p => p.moved)
  console.log('\n\n' + renderCompletionSignal({
    skill: 'iterate',
    status: 'complete',
    outputs: plans.map(p => p.planPath),
    next_suggested: capturedAny ? '/lessons-learned' : null,
    blocks_for_user: [],
  }))

  return { gatesRun, plans }
}
