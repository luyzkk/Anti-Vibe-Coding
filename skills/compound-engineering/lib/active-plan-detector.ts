// 2026-05-24 (Luiz/dev): detecta plano ativo unico/multiplo/zero — PRD CA-18/19
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ActivePlanResult =
  | { status: 'single'; planPath: string; slug: string }
  | { status: 'multiple'; candidates: Array<{ planPath: string; slug: string }> }
  | { status: 'none' }

export async function detectActivePlan(targetRoot: string): Promise<ActivePlanResult> {
  const activeDir = path.join(targetRoot, 'docs', 'exec-plans', 'active')
  let entries: string[]
  try {
    entries = await fs.readdir(activeDir)
  } catch {
    return { status: 'none' }
  }

  // 2026-05-24 (Luiz/dev): plano = subdir com PLAN.md (v6 layout) — assumption do layout do plano
  const candidates: Array<{ planPath: string; slug: string }> = []
  for (const entry of entries) {
    const subdir = path.join(activeDir, entry)
    const stat = await fs.stat(subdir).catch(() => null)
    if (!stat || !stat.isDirectory()) continue
    const planMd = path.join(subdir, 'PLAN.md')
    const planExists = await fs.access(planMd).then(() => true).catch(() => false)
    if (planExists) candidates.push({ planPath: planMd, slug: entry })
  }

  if (candidates.length === 0) return { status: 'none' }
  if (candidates.length === 1) {
    const single = candidates[0]
    if (single) return { status: 'single', planPath: single.planPath, slug: single.slug }
  }
  return { status: 'multiple', candidates }
}
