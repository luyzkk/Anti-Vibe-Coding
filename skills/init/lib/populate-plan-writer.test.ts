// 2026-05-19 (Luiz/dev): Plano 03 fase-04 RED — testes para writePopulatePlanFolder.
// Isolamento: tmpdir + randomUUID por teste. Sem fixtures comitadas.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { writePopulatePlanFolder } from './populate-plan-writer'
import type { PopulatePlanOutputV2 } from './populate-plan-generator'

function makeFakePlan(): PopulatePlanOutputV2 {
  const phaseFiles = new Map<string, string>([
    ['fase-01-architecture.md', '# Fase 01: ARCHITECTURE\n\n## Inputs (codigo)\n- src/app/layout.tsx\n'],
    ['fase-02-frontend.md', '# Fase 02: FRONTEND\n\n## Inputs (codigo)\n- tailwind.config.ts\n'],
  ])
  return {
    planIndexMarkdown: '# Plan: Populate Harness — test\n\n## Fases\n| 01 | ARCHITECTURE |\n',
    phaseFiles,
    relativeFolderPath: 'docs/exec-plans/active/2026-05-19-populate-harness',
    phases: [],
  }
}

let tmpCwd: string

describe('writePopulatePlanFolder', () => {
  beforeEach(async () => {
    tmpCwd = path.join(os.tmpdir(), `pop-writer-${randomUUID()}`)
    await fs.mkdir(tmpCwd, { recursive: true })
  })
  afterEach(async () => {
    await fs.rm(tmpCwd, { recursive: true, force: true })
  })

  it('creates folder + PLAN.md + 1 file per phase', async () => {
    const plan = makeFakePlan()
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    const files = await fs.readdir(result.absoluteFolder)
    expect(files).toContain('PLAN.md')
    expect(files).toContain('fase-01-architecture.md')
    expect(files).toContain('fase-02-frontend.md')
    expect(result.writtenFiles).toHaveLength(3)
    expect(result.warnings).toHaveLength(0)
  })

  it('overwrites existing files with warning', async () => {
    const plan = makeFakePlan()
    await fs.mkdir(path.join(tmpCwd, plan.relativeFolderPath), { recursive: true })
    await fs.writeFile(
      path.join(tmpCwd, plan.relativeFolderPath, 'PLAN.md'),
      'old content',
      'utf-8',
    )
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    expect(result.warnings.some(w => w.startsWith('sobrescrito:'))).toBe(true)
    const newContent = await fs.readFile(path.join(result.absoluteFolder, 'PLAN.md'), 'utf-8')
    expect(newContent).toContain('Plan: Populate Harness')
  })

  it('PLAN.md index references each phase file', async () => {
    const plan: PopulatePlanOutputV2 = {
      ...makeFakePlan(),
      planIndexMarkdown:
        makeFakePlan().planIndexMarkdown +
        '\n[fase-01-architecture.md](./fase-01-architecture.md)\n',
    }
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    const index = await fs.readFile(path.join(result.absoluteFolder, 'PLAN.md'), 'utf-8')
    expect(index).toContain('fase-01-architecture.md')
  })

  it('returns absolutePath using cwd + relativeFolderPath', async () => {
    const plan = makeFakePlan()
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    expect(result.absoluteFolder).toBe(path.join(tmpCwd, plan.relativeFolderPath))
  })
})
