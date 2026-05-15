// 2026-05-14 (Luiz/dev): plan writer — shape new-plan.mjs do André, paths em docs/exec-plans/active/

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { validateMigrationPlan } from './plan-validator'

export type PlanWriterOptions = {
  strict?: boolean
}

export type WrittenPlan = {
  absolutePath: string
  relativePath: string
  slotSlug: string
  domainStatus: string
}

export function slotToSlug(slotPath: string): string {
  const basename = path.posix.basename(slotPath, '.md')
  return basename
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function nextPlanIndex(activeDir: string): Promise<string> {
  let entries: string[] = []
  try {
    entries = await fs.readdir(activeDir)
  } catch {
    return '0001'
  }
  const migrationPlans = entries.filter((e) => e.match(/^\d{4}-/))
  if (migrationPlans.length === 0) return '0001'

  const maxIndex = migrationPlans.reduce((max, name) => {
    const m = name.match(/^(\d{4})-/)
    const n = m?.[1] ? parseInt(m[1], 10) : 0
    return Math.max(max, n)
  }, 0)

  return String(maxIndex + 1).padStart(4, '0')
}

export async function writeMigrationPlan(
  targetDir: string,
  slotPath: string,
  domainStatus: string,
  planContent: string,
  date: string = new Date().toISOString().slice(0, 10),
  opts: PlanWriterOptions = {},
): Promise<WrittenPlan> {
  const strict = opts.strict ?? true

  const validation = validateMigrationPlan(planContent)
  if (!validation.valid && strict) {
    throw new Error(
      `Plan inválido para slot "${slotPath}": ` +
        `seções faltando: [${validation.missingSections.join(', ')}]; ` +
        `erros de ordem: [${validation.orderErrors.join('; ')}]`,
    )
  }

  const slug = slotToSlug(slotPath)
  const activeDir = path.join(targetDir, 'docs/exec-plans/active')
  await fs.mkdir(activeDir, { recursive: true })

  const index = await nextPlanIndex(activeDir)
  const filename = `${date}-${index}-${slug}-migration.md`
  const absolutePath = path.join(activeDir, filename)
  const relativePath = `docs/exec-plans/active/${filename}`

  const finalContent = planContent.startsWith('---')
    ? planContent
    : `---\nslot: ${slotPath}\ndomain_status: ${domainStatus}\ncreated: ${date}\nstatus: active\n---\n\n${planContent}`

  await fs.writeFile(absolutePath, finalContent, 'utf-8')

  return { absolutePath, relativePath, slotSlug: slug, domainStatus }
}
