// 2026-05-12 (Luiz/dev): RED suite for exec-plan-mover — listActivePlans + moveToCompleted
import { describe, it, expect } from 'bun:test'
import { listActivePlans, moveToCompleted } from './exec-plan-mover'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

async function setupV6Root(): Promise<{ root: string; activeDir: string; completedDir: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-mover-'))
  const activeDir = path.join(root, 'docs', 'exec-plans', 'active')
  const completedDir = path.join(root, 'docs', 'exec-plans', 'completed')
  // Also create docs/compound so resolvePaths detects v6
  await fs.mkdir(path.join(root, 'docs', 'compound'), { recursive: true })
  await fs.mkdir(activeDir, { recursive: true })
  await fs.mkdir(completedDir, { recursive: true })
  return { root, activeDir, completedDir }
}

const ACTIVE_PLAN_CONTENT = `---
title: Test Plan
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [x] step 2
`

describe('listActivePlans', () => {
  it('returns absolute paths of .md files excluding README.md', async () => {
    const { root, activeDir } = await setupV6Root()
    const planPath = path.join(activeDir, '2026-05-12-foo.md')
    await fs.writeFile(planPath, ACTIVE_PLAN_CONTENT, 'utf-8')
    await fs.writeFile(path.join(activeDir, 'README.md'), '# readme', 'utf-8')

    const plans = await listActivePlans(root)
    expect(plans).toHaveLength(1)
    expect(plans[0]).toBe(planPath)
    await fs.rm(root, { recursive: true })
  })

  it('returns empty array when active dir does not exist', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-mover-empty-'))
    const plans = await listActivePlans(root)
    expect(plans).toEqual([])
    await fs.rm(root, { recursive: true })
  })

  it('returns multiple plans sorted by filename', async () => {
    const { root, activeDir } = await setupV6Root()
    const p1 = path.join(activeDir, '2026-05-10-alpha.md')
    const p2 = path.join(activeDir, '2026-05-11-beta.md')
    await fs.writeFile(p1, ACTIVE_PLAN_CONTENT, 'utf-8')
    await fs.writeFile(p2, ACTIVE_PLAN_CONTENT, 'utf-8')

    const plans = await listActivePlans(root)
    expect(plans).toHaveLength(2)
    expect(plans.every((p) => path.isAbsolute(p))).toBe(true)
    await fs.rm(root, { recursive: true })
  })
})

describe('moveToCompleted', () => {
  it('moves file from active to completed dir', async () => {
    const { root, activeDir } = await setupV6Root()
    const planPath = path.join(activeDir, '2026-05-12-foo.md')
    await fs.writeFile(planPath, ACTIVE_PLAN_CONTENT, 'utf-8')

    const { newPath } = await moveToCompleted(root, planPath)

    // old path should not exist
    await expect(fs.stat(planPath)).rejects.toThrow()
    // new path should exist
    const stat = await fs.stat(newPath)
    expect(stat.isFile()).toBe(true)
    await fs.rm(root, { recursive: true })
  })

  it('updates status from active to completed in frontmatter', async () => {
    const { root, activeDir } = await setupV6Root()
    const planPath = path.join(activeDir, '2026-05-12-foo.md')
    await fs.writeFile(planPath, ACTIVE_PLAN_CONTENT, 'utf-8')

    const { newPath } = await moveToCompleted(root, planPath)
    const content = await fs.readFile(newPath, 'utf-8')
    expect(content).toContain('status: completed')
    expect(content).not.toContain('status: active')
    await fs.rm(root, { recursive: true })
  })

  it('adds completedAt with YYYY-MM-DD format', async () => {
    const { root, activeDir } = await setupV6Root()
    const planPath = path.join(activeDir, '2026-05-12-foo.md')
    await fs.writeFile(planPath, ACTIVE_PLAN_CONTENT, 'utf-8')

    const { newPath } = await moveToCompleted(root, planPath)
    const content = await fs.readFile(newPath, 'utf-8')
    expect(content).toMatch(/completedAt: \d{4}-\d{2}-\d{2}/)
    await fs.rm(root, { recursive: true })
  })

  it('does not duplicate completedAt if already present', async () => {
    const { root, activeDir } = await setupV6Root()
    const planPath = path.join(activeDir, '2026-05-12-foo.md')
    const withExistingCompleted = ACTIVE_PLAN_CONTENT.replace(
      'created: 2026-05-12',
      'created: 2026-05-12\ncompletedAt: 2026-05-10',
    ).replace('status: active', 'status: active')
    await fs.writeFile(planPath, withExistingCompleted, 'utf-8')

    const { newPath } = await moveToCompleted(root, planPath)
    const content = await fs.readFile(newPath, 'utf-8')
    const matches = content.match(/completedAt:/g)
    expect(matches).toHaveLength(1)
    await fs.rm(root, { recursive: true })
  })

  it('returns ENOENT when called on already-moved plan', async () => {
    const { root, activeDir } = await setupV6Root()
    const planPath = path.join(activeDir, '2026-05-12-foo.md')
    await fs.writeFile(planPath, ACTIVE_PLAN_CONTENT, 'utf-8')
    await moveToCompleted(root, planPath)

    await expect(moveToCompleted(root, planPath)).rejects.toThrow()
    await fs.rm(root, { recursive: true })
  })

  it('returns newPath with same filename as source', async () => {
    const { root, activeDir } = await setupV6Root()
    const planPath = path.join(activeDir, '2026-05-12-my-plan.md')
    await fs.writeFile(planPath, ACTIVE_PLAN_CONTENT, 'utf-8')

    const { newPath } = await moveToCompleted(root, planPath)
    expect(path.basename(newPath)).toBe('2026-05-12-my-plan.md')
    await fs.rm(root, { recursive: true })
  })
})
