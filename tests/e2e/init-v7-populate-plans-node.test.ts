// tests/e2e/init-v7-populate-plans-node.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — CA-01 + CA-07 via fixture Node-TS.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'

describe('e2e: init v7 generate-populate-plans (Node-TS)', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('CA-01: runInit creates 16 PLAN.md files in docs/exec-plans/active/', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const entries = await fs.readdir(activeDir)
    const populateDirs = entries.filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(16)

    for (const dir of populateDirs) {
      const planPath = path.join(activeDir, dir, 'PLAN.md')
      const stat = await fs.stat(planPath)
      expect(stat.isFile()).toBe(true)
      expect(stat.size).toBeGreaterThan(500)
    }
  })

  test('CA-07: every generated PLAN.md has exactly the 10 H2 sections in canonical order', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const dirs = (await fs.readdir(activeDir)).filter(e => e.includes('-populate-'))

    const EXPECTED_SECTIONS = [
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
    ]

    for (const dir of dirs) {
      const content = await fs.readFile(path.join(activeDir, dir, 'PLAN.md'), 'utf-8')
      const sections = content.split('\n').filter(l => l.startsWith('## '))
      expect(sections, `Plan ${dir} sections`).toEqual(EXPECTED_SECTIONS)
    }
  })

  test('parity gate: number of plans matches POPULATE_INSTRUCTIONS_BY_DOC.size', async () => {
    const { POPULATE_INSTRUCTIONS_BY_DOC } = await import('../../skills/init/lib/populate-instructions-table')
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const populateDirs = (await fs.readdir(activeDir)).filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(POPULATE_INSTRUCTIONS_BY_DOC.size)
  })

  test('Node-TS FRONTEND plan uses src/components, not app/views', async () => {
    await runInit([], { cwd })
    const frontendPlanDir = (await fs.readdir(path.join(cwd, 'docs/exec-plans/active')))
      .find(d => d.includes('-populate-docs-frontend-md'))!
    const content = await fs.readFile(
      path.join(cwd, 'docs/exec-plans/active', frontendPlanDir, 'PLAN.md'),
      'utf-8',
    )
    expect(content).toContain('src/components')
    expect(content).not.toContain('app/views')
  })
})
