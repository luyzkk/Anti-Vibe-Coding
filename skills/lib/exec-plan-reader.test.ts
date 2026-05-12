// 2026-05-12 (Luiz/dev): RED suite for exec-plan-reader — parser + isComplete logic
import { describe, it, expect } from 'bun:test'
import { readExecPlan, isComplete } from './exec-plan-reader'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

async function writeTmp(dir: string, name: string, content: string): Promise<string> {
  const p = path.join(dir, name)
  await fs.writeFile(p, content, 'utf-8')
  return p
}

const ACTIVE_PLAN = `---
title: Test Plan
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [x] step 2

## Other Section

some content here
`

const PLAN_WITH_PLACEHOLDER = `---
title: Placeholder Plan
mode: quick
status: active
created: 2026-05-12
---

## Exit Criteria

<!-- preencher -->
`

const PLAN_WITH_UNCHECKED = `---
title: Mixed Plan
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [ ] step 2
`

const PLAN_ALREADY_COMPLETED = `---
title: Done Plan
mode: full
status: completed
created: 2026-05-12
completedAt: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [x] step 2
`

const PLAN_EMPTY_EXIT = `---
title: Empty Plan
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria


`

describe('readExecPlan', () => {
  it('parses frontmatter fields', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', ACTIVE_PLAN)
    const result = await readExecPlan(p)
    expect(result.frontmatter.title).toBe('Test Plan')
    expect(result.frontmatter.mode).toBe('full')
    expect(result.frontmatter.status).toBe('active')
    expect(result.frontmatter.created).toBe('2026-05-12')
    await fs.rm(dir, { recursive: true })
  })

  it('parses H2 sections into bodyByH2', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', ACTIVE_PLAN)
    const result = await readExecPlan(p)
    expect(result.bodyByH2['Exit Criteria']).toContain('- [x] step 1')
    expect(result.bodyByH2['Other Section']).toContain('some content here')
    await fs.rm(dir, { recursive: true })
  })

  it('exposes the filePath', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', ACTIVE_PLAN)
    const result = await readExecPlan(p)
    expect(result.filePath).toBe(p)
    await fs.rm(dir, { recursive: true })
  })

  it('handles BOM-prefixed file', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = path.join(dir, 'bom.md')
    await fs.writeFile(p, '\uFEFF' + ACTIVE_PLAN, 'utf-8')
    const result = await readExecPlan(p)
    expect(result.frontmatter.title).toBe('Test Plan')
    await fs.rm(dir, { recursive: true })
  })
})

describe('isComplete', () => {
  it('returns true when status active and all exit criteria checked', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', ACTIVE_PLAN)
    const plan = await readExecPlan(p)
    expect(isComplete(plan)).toBe(true)
    await fs.rm(dir, { recursive: true })
  })

  it('returns false when exit criteria has placeholder', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', PLAN_WITH_PLACEHOLDER)
    const plan = await readExecPlan(p)
    expect(isComplete(plan)).toBe(false)
    await fs.rm(dir, { recursive: true })
  })

  it('returns false when exit criteria has unchecked items', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', PLAN_WITH_UNCHECKED)
    const plan = await readExecPlan(p)
    expect(isComplete(plan)).toBe(false)
    await fs.rm(dir, { recursive: true })
  })

  it('returns false when status is already completed', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', PLAN_ALREADY_COMPLETED)
    const plan = await readExecPlan(p)
    expect(isComplete(plan)).toBe(false)
    await fs.rm(dir, { recursive: true })
  })

  it('returns false when exit criteria is empty', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-plan-reader-'))
    const p = await writeTmp(dir, 'plan.md', PLAN_EMPTY_EXIT)
    const plan = await readExecPlan(p)
    expect(isComplete(plan)).toBe(false)
    await fs.rm(dir, { recursive: true })
  })
})
