// 2026-05-12 (Luiz/dev): E2E suite for compound-decision-gate — 3 caminhos + edge cases
// Cobre CA-16 e CA-25 (Compound Decision Gate / D17)
import { describe, it, expect } from 'bun:test'
import { runCompoundGate } from '../skills/lib/compound-decision-gate'
import type { GateContext, GatePromptFn } from '../skills/lib/compound-decision-gate'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

async function buildV6Fixture(planContent: string): Promise<{
  root: string
  planPath: string
  activeDir: string
  completedDir: string
  compoundDir: string
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gate-e2e-'))
  const activeDir = path.join(root, 'docs', 'exec-plans', 'active')
  const completedDir = path.join(root, 'docs', 'exec-plans', 'completed')
  const compoundDir = path.join(root, 'docs', 'compound')
  await fs.mkdir(compoundDir, { recursive: true })
  await fs.mkdir(activeDir, { recursive: true })
  await fs.mkdir(completedDir, { recursive: true })
  const planPath = path.join(activeDir, '2026-05-12-test-plan.md')
  await fs.writeFile(planPath, planContent, 'utf-8')
  return { root, planPath, activeDir, completedDir, compoundDir }
}

const COMPLETE_PLAN = `---
title: "Test Plan"
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [x] step 2

## Validation Log

`

const INCOMPLETE_PLAN = `---
title: "Incomplete Plan"
mode: full
status: active
created: 2026-05-12
---

## Exit Criteria

- [x] step 1
- [ ] step 2
`

// ---------------------------------------------------------------------------
// capture path
// ---------------------------------------------------------------------------

describe('runCompoundGate — capture path', () => {
  it('creates compound note and moves plan to completed/', async () => {
    const { root, planPath, completedDir, compoundDir } = await buildV6Fixture(COMPLETE_PLAN)
    const ctx: GateContext = { projectRoot: root, planPath }

    const prompt: GatePromptFn = async () => ({
      choice: 'capture',
      captureInput: {
        title: 'Lição aprendida no plano',
        problem: 'Bug de sincronizacao encontrado',
        solution: 'Adicionar await antes de flush',
        prevention: 'Code review com foco em async',
        tags: ['async', 'bug'],
      },
    })

    const result = await runCompoundGate(ctx, prompt)

    expect(result.choice).toBe('capture')
    expect(result.planMoved).toBe(true)
    expect(result.compoundCreatedPath).toBeDefined()

    // Compound note deve existir
    const compoundStat = await fs.stat(result.compoundCreatedPath!)
    expect(compoundStat.isFile()).toBe(true)

    // Plano deve ter saído de active/
    await expect(fs.stat(planPath)).rejects.toThrow()

    // Plano deve estar em completed/
    const completedFiles = await fs.readdir(completedDir)
    expect(completedFiles).toContain('2026-05-12-test-plan.md')

    // Compound note deve estar dentro do compoundDir
    expect(result.compoundCreatedPath!.startsWith(compoundDir)).toBe(true)

    await fs.rm(root, { recursive: true })
  })
})

// ---------------------------------------------------------------------------
// no_capture_needed path
// ---------------------------------------------------------------------------

describe('runCompoundGate — no_capture_needed path', () => {
  it('appends validation log entry and moves plan to completed/', async () => {
    const { root, planPath, completedDir } = await buildV6Fixture(COMPLETE_PLAN)
    const ctx: GateContext = { projectRoot: root, planPath }

    const prompt: GatePromptFn = async () => ({
      choice: 'no_capture_needed',
      noCaptureReason: 'Mudanca trivial de config sem licao nova',
    })

    const result = await runCompoundGate(ctx, prompt)

    expect(result.choice).toBe('no_capture_needed')
    expect(result.planMoved).toBe(true)
    expect(result.noCaptureReason).toBe('Mudanca trivial de config sem licao nova')

    // Plano deve ter saído de active/
    await expect(fs.stat(planPath)).rejects.toThrow()

    // Plano movido para completed/ — ler e verificar Validation Log
    const completedPath = path.join(completedDir, '2026-05-12-test-plan.md')
    const content = await fs.readFile(completedPath, 'utf-8')
    // Formato esperado: - YYYY-MM-DD: no_capture_needed: {razão}
    expect(content).toMatch(/- \d{4}-\d{2}-\d{2}: no_capture_needed: Mudanca trivial de config sem licao nova/)

    await fs.rm(root, { recursive: true })
  })
})

// ---------------------------------------------------------------------------
// postpone path
// ---------------------------------------------------------------------------

describe('runCompoundGate — postpone path', () => {
  it('updates frontmatter status to pending-capture and keeps plan in active/', async () => {
    const { root, planPath } = await buildV6Fixture(COMPLETE_PLAN)
    const ctx: GateContext = { projectRoot: root, planPath }

    const prompt: GatePromptFn = async () => ({ choice: 'postpone' })

    const result = await runCompoundGate(ctx, prompt)

    expect(result.choice).toBe('postpone')
    expect(result.planMoved).toBe(false)

    // Plano deve AINDA estar em active/
    const stat = await fs.stat(planPath)
    expect(stat.isFile()).toBe(true)

    // Frontmatter deve ter status: pending-capture
    const content = await fs.readFile(planPath, 'utf-8')
    expect(content).toContain('status: pending-capture')
    expect(content).not.toContain('status: active')

    await fs.rm(root, { recursive: true })
  })
})

// ---------------------------------------------------------------------------
// edge case: plano não completo
// ---------------------------------------------------------------------------

describe('runCompoundGate — edge case: plano nao completo', () => {
  it('throws or returns early when plan is not complete', async () => {
    const { root, planPath } = await buildV6Fixture(INCOMPLETE_PLAN)
    const ctx: GateContext = { projectRoot: root, planPath }

    const prompt: GatePromptFn = async () => ({ choice: 'capture' })

    await expect(runCompoundGate(ctx, prompt)).rejects.toThrow()

    await fs.rm(root, { recursive: true })
  })
})
