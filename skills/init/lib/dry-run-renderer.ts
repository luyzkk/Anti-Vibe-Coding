// 2026-05-12 (Luiz/dev): formats MigrationDryRunReport to stdout in git diff --stat style.
// G-A4: plain text by default. Plano 03 fase-06.

import type { MigrationDryRunReport } from './migrate-orchestrator'

/**
 * Renders a MigrationDryRunReport as a human-readable string (git diff --stat style).
 *
 * @example
 * const report = await orchestrateMigration(dir, { dryRun: true })
 * console.log(renderDryRunReport(report))
 */
export function renderDryRunReport(report: MigrationDryRunReport): string {
  const lines: string[] = []
  lines.push('--- Migration Dry Run ---')
  lines.push('')
  lines.push(`Detected v5.x: ${report.state.isLegacy ? 'yes' : 'no'}`)
  lines.push(`Artifacts: ${report.state.artifacts.join(', ') || '(none)'}`)
  lines.push(`Already migrated: ${report.state.alreadyMigrated ? 'yes' : 'no'}`)
  lines.push('')
  lines.push(`Backup: ${report.backup.status} — ${report.backup.filesCopied} files`)
  lines.push('')

  lines.push('Planning migration (.planning/ → docs/):')
  lines.push(`  entries: ${report.planning.entries}`)
  lines.push(`  would write: ${report.planning.written.length}`)
  lines.push(`  skipped: ${report.planning.skipped.length}`)
  if (report.planning.conflicts.length > 0) {
    lines.push(`  CONFLICTS: ${report.planning.conflicts.length} (resolve manually)`)
  }
  for (const p of report.planning.written.slice(0, 10)) {
    lines.push(`    + ${p}`)
  }
  if (report.planning.written.length > 10) {
    lines.push(`    ... +${report.planning.written.length - 10} more`)
  }
  lines.push('')

  lines.push('Lessons migration (lessons-learned.md → docs/compound/):')
  lines.push(`  entries: ${report.lessons.entries}`)
  lines.push(`  would write: ${report.lessons.written.length}`)
  for (const p of report.lessons.written.slice(0, 10)) {
    lines.push(`    + ${p}`)
  }
  lines.push('')

  lines.push('Decisions migration (decisions.md → docs/design-docs/ADR-*.md):')
  lines.push(`  entries: ${report.decisions.entries}`)
  lines.push(`  would write: ${report.decisions.written.length}`)
  if (report.decisions.coreBeliefs === 'created') {
    lines.push('  + core-beliefs.md (from senior-principles.md)')
  }
  for (const p of report.decisions.written.slice(0, 10)) {
    lines.push(`    + ${p}`)
  }
  lines.push('')

  lines.push('---')
  lines.push(`Total files to write: ${report.recordedWrites}`)
  lines.push(`Total bytes: ${formatBytes(report.totalBytes)}`)
  lines.push('Backup will go to: .planning.v5-backup/')
  lines.push('Original .planning/ will be deleted after success (backup preserves it).')
  lines.push('')
  lines.push(report.dryRun
    ? 'This is a DRY RUN — no files were created. Re-run without --dry-run to apply.'
    : 'Migration applied successfully.',
  )

  return lines.join('\n')
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
