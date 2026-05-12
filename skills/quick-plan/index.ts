// 2026-05-11 (Luiz/dev): D10 wrapper — expoe quickPlan() consumindo writeExecPlan modo quick
import { writeExecPlan } from '../lib/exec-plan-template'

export async function quickPlan(
  titleOrArg: string,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string }> {
  return writeExecPlan(projectRoot, { title: titleOrArg, mode: 'quick' })
}
