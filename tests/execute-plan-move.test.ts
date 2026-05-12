// 2026-05-12 (Luiz/dev): E2E suite for execute-plan move flow — isComplete + moveToCompleted integration
import { describe, it, expect } from 'bun:test'
import { readExecPlan, isComplete } from '../skills/lib/exec-plan-reader'
import { moveToCompleted, listActivePlans } from '../skills/lib/exec-plan-mover'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

async function buildV6Fixture(content: string): Promise<{
  root: string
  activeDir: string
  completedDir: string
  planPath: string
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-exec-'))
  const activeDir = path.join(root, 'docs', 'exec-plans', 'active')
  const completedDir = path.join(root, 'docs', 'exec-plans', 'completed')
  // v6 heuristic: needs docs/compound/ + docs/exec-plans/
  await fs.mkdir(path.join(root, 'docs', 'compound'), { recursive: true })
  await fs.mkdir(activeDir, { recursive: true })
  await fs.mkdir(completedDir, { recursive: true })
  const planPath = path.join(activeDir, '2026-05-12-test.md')
  await fs.writeFile(planPath, content, 'utf-8')
  return { root, activeDir, completedDir, planPath }
}

const COMPLETE_PLAN = `---
title: Complete Plan
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [x] step 2
`

const PLACEHOLDER_PLAN = `---
title: Placeholder Plan
mode: quick
status: active
created: 2026-05-12
---

## Exit Criteria

<!-- preencher -->
`

const MIXED_PLAN = `---
title: Mixed Plan
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [ ] step 2
`

const ALREADY_COMPLETED_PLAN = `---
title: Already Done Plan
mode: full
status: completed
created: 2026-05-12
completedAt: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [x] step 2
`

describe('E2E: moves plan to completed when all exit criteria checked', () => {
  it('isComplete returns true for fully checked plan', async () => {
    const { root, planPath } = await buildV6Fixture(COMPLETE_PLAN)
    const plan = await readExecPlan(planPath)
    expect(isComplete(plan)).toBe(true)
    await fs.rm(root, { recursive: true })
  })

  it('moveToCompleted resolves with newPath in completed/', async () => {
    const { root, completedDir, planPath } = await buildV6Fixture(COMPLETE_PLAN)
    const { newPath } = await moveToCompleted(root, planPath)
    expect(newPath.startsWith(completedDir)).toBe(true)
    await fs.rm(root, { recursive: true })
  })

  it('after move: stat of oldPath rejects', async () => {
    const { root, planPath } = await buildV6Fixture(COMPLETE_PLAN)
    await moveToCompleted(root, planPath)
    await expect(fs.stat(planPath)).rejects.toThrow()
    await fs.rm(root, { recursive: true })
  })

  it('after move: stat of newPath resolves', async () => {
    const { root, planPath } = await buildV6Fixture(COMPLETE_PLAN)
    const { newPath } = await moveToCompleted(root, planPath)
    const stat = await fs.stat(newPath)
    expect(stat.isFile()).toBe(true)
    await fs.rm(root, { recursive: true })
  })

  it('frontmatter in newPath has status: completed', async () => {
    const { root, planPath } = await buildV6Fixture(COMPLETE_PLAN)
    const { newPath } = await moveToCompleted(root, planPath)
    const moved = await readExecPlan(newPath)
    expect(moved.frontmatter.status).toBe('completed')
    await fs.rm(root, { recursive: true })
  })

  it('frontmatter in newPath has completedAt YYYY-MM-DD', async () => {
    const { root, planPath } = await buildV6Fixture(COMPLETE_PLAN)
    const { newPath } = await moveToCompleted(root, planPath)
    const content = await fs.readFile(newPath, 'utf-8')
    expect(content).toMatch(/completedAt: \d{4}-\d{2}-\d{2}/)
    await fs.rm(root, { recursive: true })
  })
})

describe('E2E: isComplete edge cases', () => {
  it('isComplete returns false when Exit Criteria has placeholder', async () => {
    const { root, planPath } = await buildV6Fixture(PLACEHOLDER_PLAN)
    const plan = await readExecPlan(planPath)
    expect(isComplete(plan)).toBe(false)
    await fs.rm(root, { recursive: true })
  })

  it('isComplete returns false when Exit Criteria has unchecked items', async () => {
    const { root, planPath } = await buildV6Fixture(MIXED_PLAN)
    const plan = await readExecPlan(planPath)
    expect(isComplete(plan)).toBe(false)
    await fs.rm(root, { recursive: true })
  })

  it('isComplete returns false when status is already completed', async () => {
    const { root, planPath } = await buildV6Fixture(ALREADY_COMPLETED_PLAN)
    const plan = await readExecPlan(planPath)
    expect(isComplete(plan)).toBe(false)
    await fs.rm(root, { recursive: true })
  })
})

describe('E2E: listActivePlans', () => {
  it('returns absolute paths and excludes README.md', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-list-'))
    const activeDir = path.join(root, 'docs', 'exec-plans', 'active')
    await fs.mkdir(path.join(root, 'docs', 'compound'), { recursive: true })
    await fs.mkdir(activeDir, { recursive: true })
    await fs.mkdir(path.join(root, 'docs', 'exec-plans', 'completed'), { recursive: true })

    const p1 = path.join(activeDir, '2026-05-12-alpha.md')
    await fs.writeFile(p1, COMPLETE_PLAN, 'utf-8')
    await fs.writeFile(path.join(activeDir, 'README.md'), '# readme', 'utf-8')

    const plans = await listActivePlans(root)
    expect(plans).toHaveLength(1)
    const first = plans[0]
    if (first == null) throw new Error('expected at least one plan')
    expect(first).toBe(p1)
    expect(path.isAbsolute(first)).toBe(true)
    await fs.rm(root, { recursive: true })
  })
})
