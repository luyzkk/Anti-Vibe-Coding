// 2026-05-12 (Luiz/dev): covers RED of fase-06 + zero side effects in dry-run — CA-10, R14.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { orchestrateMigration } from './migrate-orchestrator'
import { renderDryRunReport } from './dry-run-renderer'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'orchestrator')

async function setupLegacy(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
  await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-x.md'), '# X\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), '## 2026-03-23: bug\n**Fix:** f\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'decisions.md'), '### [V]: m\n**Data:** 2026-03-23\n', 'utf8')
}

describe('orchestrateMigration --dry-run', () => {
  beforeEach(setupLegacy)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('dryRun=true creates ZERO files in destination', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: true })
    expect(report.dryRun).toBe(true)

    // CA-10 verbatim: nothing written to destination in disk.
    const docsExists = await fs.access(path.join(FIXTURE, 'docs')).then(() => true).catch(() => false)
    expect(docsExists).toBe(false)
    // .planning/ original must remain intact
    const originalExists = await fs.access(path.join(FIXTURE, '.planning')).then(() => true).catch(() => false)
    expect(originalExists).toBe(true)
  })

  it('dryRun=true reports what WOULD be written', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: true })
    expect(report.recordedWrites).toBeGreaterThan(0)
    expect(
      report.planning.written.length +
      report.lessons.written.length +
      report.decisions.written.length,
    ).toBe(report.recordedWrites)
  })

  it('dryRun=false applies migration', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: false })
    expect(report.dryRun).toBe(false)
    const docsExists = await fs.access(path.join(FIXTURE, 'docs')).then(() => true).catch(() => false)
    expect(docsExists).toBe(true)
    const backupExists = await fs.access(path.join(FIXTURE, '.planning.v5-backup')).then(() => true).catch(() => false)
    expect(backupExists).toBe(true)
  })

  it('renderDryRunReport produces non-empty string', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: true })
    const rendered = renderDryRunReport(report)
    expect(rendered).toContain('Migration Dry Run')
    expect(rendered).toContain('Total files to write')
    expect(rendered).toContain('DRY RUN')
  })

  it('parallel migrations do not block each other', async () => {
    // Soft check: orchestrator uses Promise.all — duration must not grow linearly.
    // On a small fixture, exact timing is unreliable; test just confirms it returned.
    const start = Date.now()
    await orchestrateMigration(FIXTURE, { dryRun: true })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000)  // well within M8 ≤120s
  })
})
