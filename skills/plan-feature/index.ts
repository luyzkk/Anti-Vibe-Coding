// 2026-05-11 (Luiz/dev): D10 wrapper — expoe create() consumindo writeExecPlan (fase-03 helper)
import { writeExecPlan, type ExecPlanInput } from '../lib/exec-plan-template'

export type PlanCreateInput = string | { title: string }

export async function create(
  arg: PlanCreateInput,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string }> {
  const title = typeof arg === 'string' ? arg : arg.title
  return writeExecPlan(projectRoot, { title, mode: 'full' })
}
