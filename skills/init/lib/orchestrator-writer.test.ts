import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { writeInitOrchestrator } from './orchestrator-writer'
import type { MigrationPlanEntry } from './manifest-writer'
import { tmpdir } from 'node:os'

describe('orchestrator-writer', () => {
  it('module exists and exports writeInitOrchestrator', () => {
    expect(typeof writeInitOrchestrator).toBe('function')
  })

  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(tmpdir(), 'orchestrator-writer-test-'))
    await fs.mkdir(path.join(tmpDir, 'docs/exec-plans/active'), { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('writes _INIT_ORCHESTRATOR.md to docs/exec-plans/active/', async () => {
    await writeInitOrchestrator(tmpDir, [])
    const destPath = path.join(tmpDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md')
    const exists = await fs.stat(destPath).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('generated file contains header and plan count', async () => {
    const plans: MigrationPlanEntry[] = [
      { id: 'plan-a', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/active/plan-a-migration.md', status: 'active' },
    ]
    await writeInitOrchestrator(tmpDir, plans)
    const content = await fs.readFile(path.join(tmpDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md'), 'utf-8')
    expect(content).toContain('# _INIT_ORCHESTRATOR — Migration Execution Order')
    expect(content).toContain('**Plans:** 1')
  })

  it('AGENTS.md plan appears in Tier 5 as last item', async () => {
    const plans: MigrationPlanEntry[] = [
      { id: 'agents-plan', slot: 'AGENTS.md', path: 'docs/exec-plans/active/agents-plan-migration.md', status: 'active' },
      { id: 'design-plan', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/active/design-plan-migration.md', status: 'active' },
      { id: 'readme-plan', slot: 'README.md', path: 'docs/exec-plans/active/readme-plan-migration.md', status: 'active' },
    ]
    await writeInitOrchestrator(tmpDir, plans)
    const content = await fs.readFile(path.join(tmpDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md'), 'utf-8')

    expect(content).toContain('## Tier 5 — Router (execute last)')

    // Tier 5 (AGENTS.md) must appear after Tier 2 (docs/DESIGN.md) and Tier 4 (README.md)
    const tier2Pos = content.indexOf('## Tier 2')
    const tier4Pos = content.indexOf('## Tier 4')
    const tier5Pos = content.indexOf('## Tier 5')
    expect(tier2Pos).toBeLessThan(tier5Pos)
    expect(tier4Pos).toBeLessThan(tier5Pos)

    // AGENTS.md plan must appear after others
    const agentsPos = content.indexOf('agents-plan')
    const designPos = content.indexOf('design-plan')
    expect(designPos).toBeLessThan(agentsPos)
  })

  it('completed plan shows [x] badge, active shows [ ]', async () => {
    const plans: MigrationPlanEntry[] = [
      { id: 'active-plan', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/active/active-plan-migration.md', status: 'active' },
      { id: 'done-plan', slot: 'AGENTS.md', path: 'docs/exec-plans/completed/done-plan-migration.md', status: 'completed' },
    ]
    await writeInitOrchestrator(tmpDir, plans)
    const content = await fs.readFile(path.join(tmpDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md'), 'utf-8')
    expect(content).toContain('- [ ] [active-plan]')
    expect(content).toContain('- [x] [done-plan]')
  })

  it('unknown slot plan uses fallback display and is placed in Tier 4', async () => {
    const plans: MigrationPlanEntry[] = [
      { id: 'mystery-plan', slot: 'unknown', path: 'docs/exec-plans/active/mystery-plan-migration.md', status: 'active' },
    ]
    await writeInitOrchestrator(tmpDir, plans)
    const content = await fs.readFile(path.join(tmpDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md'), 'utf-8')
    expect(content).toContain('## Tier 4')
    expect(content).toContain('*(slot unknown — mystery-plan)*')
  })

  it('overwrites existing _INIT_ORCHESTRATOR.md (not append)', async () => {
    const destPath = path.join(tmpDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md')
    await fs.writeFile(destPath, 'OLD CONTENT', 'utf-8')

    await writeInitOrchestrator(tmpDir, [])
    const content = await fs.readFile(destPath, 'utf-8')
    expect(content).not.toContain('OLD CONTENT')
    expect(content).toContain('_INIT_ORCHESTRATOR')
  })
})
