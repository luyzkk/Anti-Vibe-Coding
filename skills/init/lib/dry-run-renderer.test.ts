// 2026-05-12 (Luiz/dev): validates renderDryRunReport output — Plano 03 fase-06.

import { describe, it, expect } from 'bun:test'
import { renderDryRunReport } from './dry-run-renderer'
import type { MigrationDryRunReport } from './migrate-orchestrator'

function makeReport(overrides: Partial<MigrationDryRunReport> = {}): MigrationDryRunReport {
  return {
    dryRun: true,
    state: {
      isLegacy: true,
      alreadyMigrated: false,
      artifacts: ['planning-dir'],
      paths: {},
    },
    backup: { status: 'dry-run', backupPath: '/tmp/x/.planning.v5-backup', filesCopied: 2 },
    planning: { status: 'dry-run', entries: 3, written: ['/tmp/x/docs/exec-plans/active/a.md'], skipped: [], conflicts: [] },
    lessons: { status: 'dry-run', entries: 1, written: ['/tmp/x/docs/compound/2026-03-23-bug.md'], skipped: [] },
    decisions: { status: 'dry-run', entries: 1, written: ['/tmp/x/docs/design-docs/ADR-0001-m.md'], skipped: [], coreBeliefs: 'skipped' },
    recordedWrites: 3,
    totalBytes: 0,
    ...overrides,
  }
}

describe('renderDryRunReport', () => {
  it('includes header and footer', () => {
    const out = renderDryRunReport(makeReport())
    expect(out).toContain('Migration Dry Run')
    expect(out).toContain('Total files to write')
    expect(out).toContain('DRY RUN')
  })

  it('shows detected v5 artifacts', () => {
    const out = renderDryRunReport(makeReport())
    expect(out).toContain('planning-dir')
    expect(out).toContain('Detected v5.x: yes')
  })

  it('lists planning written paths', () => {
    const out = renderDryRunReport(makeReport())
    expect(out).toContain('docs/exec-plans/active/a.md')
  })

  it('real mode shows success message not DRY RUN', () => {
    const out = renderDryRunReport(makeReport({ dryRun: false }))
    expect(out).toContain('Migration applied successfully')
    expect(out).not.toContain('DRY RUN')
  })
})
