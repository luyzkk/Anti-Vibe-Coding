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

  test('CA-01: runInit creates populate-harness folder with 16 fase-NN-*.md files', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const entries = await fs.readdir(activeDir)
    const harnessDirs = entries.filter(e => e.includes('-populate-harness'))
    expect(harnessDirs.length).toBe(1)

    const harnessDir = path.join(activeDir, harnessDirs[0]!)
    const harnessFiles = await fs.readdir(harnessDir)
    const faseMds = harnessFiles.filter(f => f.startsWith('fase-') && f.endsWith('.md'))
    expect(faseMds.length).toBe(16)

    for (const faseFile of faseMds) {
      const fasePath = path.join(harnessDir, faseFile)
      const stat = await fs.stat(fasePath)
      expect(stat.isFile()).toBe(true)
      expect(stat.size).toBeGreaterThan(500)
    }
  })

  test('CA-07: every generated fase-NN-*.md has exactly the 10 H2 sections in canonical order', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const harnessDir = (await fs.readdir(activeDir)).find(e => e.includes('-populate-harness'))!
    const faseMds = (await fs.readdir(path.join(activeDir, harnessDir))).filter(f =>
      f.startsWith('fase-') && f.endsWith('.md'),
    )

    // renderFasePlan emite 10 H2 Andre + ## Final Report Contract (ADR-0022 decisao 6)
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
      '## Final Report Contract',
    ]

    for (const faseFile of faseMds) {
      const content = await fs.readFile(path.join(activeDir, harnessDir, faseFile), 'utf-8')
      const sections = content.split('\n').filter(l => l.startsWith('## '))
      expect(sections, `${faseFile} sections`).toEqual(EXPECTED_SECTIONS)
    }
  })

  test('parity gate: number of fase-NN-*.md files matches POPULATE_INSTRUCTIONS_BY_DOC.size', async () => {
    const { POPULATE_INSTRUCTIONS_BY_DOC } = await import('../../skills/init/lib/populate-instructions-table')
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const harnessDir = (await fs.readdir(activeDir)).find(e => e.includes('-populate-harness'))!
    const faseMds = (await fs.readdir(path.join(activeDir, harnessDir))).filter(f =>
      f.startsWith('fase-') && f.endsWith('.md'),
    )
    expect(faseMds.length).toBe(POPULATE_INSTRUCTIONS_BY_DOC.size)
  })

  test('Node-TS FRONTEND fase plan uses src/components, not app/views', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const harnessDir = (await fs.readdir(activeDir)).find(d => d.includes('-populate-harness'))!
    const frontendFase = (await fs.readdir(path.join(activeDir, harnessDir)))
      .find(f => f.includes('docs-frontend'))!
    const content = await fs.readFile(
      path.join(activeDir, harnessDir, frontendFase),
      'utf-8',
    )
    // Wave 1 Discovery deve usar paths Node-TS (src/components)
    // Nota: detection signals listam ambos os stacks — verificar Wave 1 section especificamente
    const wave1Match = content.match(/### Wave 1 — Discovery([\s\S]*?)###/)
    const wave1 = wave1Match ? wave1Match[1] : ''
    expect(wave1).toContain('src/components')
    expect(wave1).not.toContain('app/views')
  })
})
