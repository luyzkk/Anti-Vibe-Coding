// 2026-05-12 (Luiz/dev): unit tests co-localizados — compound-decision-gate (TDD gate GT-03)
// Testa a API publica de runCompoundGate e helpers internos via comportamento observavel
import { describe, it, expect } from 'bun:test'
import { runCompoundGate } from './compound-decision-gate'
import type { GateContext, GatePromptFn, GateResult } from './compound-decision-gate'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

async function buildV6Root(planContent: string): Promise<{
  root: string
  planPath: string
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gate-unit-'))
  const activeDir = path.join(root, 'docs', 'exec-plans', 'active')
  const completedDir = path.join(root, 'docs', 'exec-plans', 'completed')
  await fs.mkdir(path.join(root, 'docs', 'compound'), { recursive: true })
  await fs.mkdir(activeDir, { recursive: true })
  await fs.mkdir(completedDir, { recursive: true })
  const planPath = path.join(activeDir, '2026-05-12-unit.md')
  await fs.writeFile(planPath, planContent, 'utf-8')
  return { root, planPath }
}

const COMPLETE = `---
title: "Unit Plan"
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] done

## Validation Log

`

const INCOMPLETE = `---
title: "Unit Plan"
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [ ] not done
`

describe('runCompoundGate — unit', () => {
  it('returns GateResult with choice and planMoved for capture', async () => {
    const { root, planPath } = await buildV6Root(COMPLETE)
    const ctx: GateContext = { projectRoot: root, planPath }

    const prompt: GatePromptFn = async () => ({
      choice: 'capture',
      captureInput: {
        title: 'Unit lesson',
        problem: 'p',
        solution: 's',
        prevention: 'pr',
      },
    })

    const result: GateResult = await runCompoundGate(ctx, prompt)
    expect(result.choice).toBe('capture')
    expect(result.planMoved).toBe(true)
    expect(typeof result.compoundCreatedPath).toBe('string')

    await fs.rm(root, { recursive: true })
  })

  it('returns planMoved false and status pending-capture for postpone', async () => {
    const { root, planPath } = await buildV6Root(COMPLETE)
    const ctx: GateContext = { projectRoot: root, planPath }

    const prompt: GatePromptFn = async () => ({ choice: 'postpone' })
    const result = await runCompoundGate(ctx, prompt)

    expect(result.choice).toBe('postpone')
    expect(result.planMoved).toBe(false)

    const raw = await fs.readFile(planPath, 'utf-8')
    expect(raw).toContain('status: pending-capture')

    await fs.rm(root, { recursive: true })
  })

  it('rejects when plan is not complete', async () => {
    const { root, planPath } = await buildV6Root(INCOMPLETE)
    const ctx: GateContext = { projectRoot: root, planPath }

    const prompt: GatePromptFn = async () => ({ choice: 'capture' })
    await expect(runCompoundGate(ctx, prompt)).rejects.toThrow()

    await fs.rm(root, { recursive: true })
  })
})
