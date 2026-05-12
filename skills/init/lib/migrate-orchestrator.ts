// 2026-05-12 (Luiz/dev): orchestrates fase-02 → fase-03 → fase-04 → fase-05.
// In dry-run mode: creates a staging backup for helpers to read from, runs all
// migrations with dryRun=true (zero writes to docs/), then removes staging backup.
// DEV-02: helpers only call writeFile when !dryRun, so recordedWrites is computed
// as the sum of written[] arrays (not via WriteRecorder). CA-10 preserved.
// Plano 03 fase-06.

import { promises as fs } from 'node:fs'
import { detectV5Legacy, type LegacyState } from './detect-v5-legacy'
import { backupPlanning, type BackupResult, BACKUP_DIR } from './backup-planning'
import { migratePlanning, type MigrationReport as PlanningReport } from './migrate-planning'
import { migrateLessons, type LessonsMigrationReport } from './migrate-lessons'
import { migrateDecisions, type DecisionsMigrationReport } from './migrate-decisions'

export type MigrationDryRunReport = {
  dryRun: boolean
  state: LegacyState
  backup: BackupResult
  planning: PlanningReport
  lessons: LessonsMigrationReport
  decisions: DecisionsMigrationReport
  recordedWrites: number
  totalBytes: number
}

/**
 * Orchestrates the full v5→v6 migration pipeline.
 * In dry-run mode: zero side effects in docs/ and no .planning.v5-backup/ persists.
 * In real mode: backup is created, docs/ is populated, .planning/ is removed.
 *
 * @example
 * const report = await orchestrateMigration('/path/to/project', { dryRun: true })
 * console.log(report.recordedWrites, 'files would be written')
 */
export async function orchestrateMigration(
  targetDir: string,
  options: { dryRun?: boolean } = {},
): Promise<MigrationDryRunReport> {
  const dryRun = options.dryRun ?? false

  // Phase 1: detect existing legacy artifacts.
  const state = await detectV5Legacy(targetDir)

  if (dryRun) {
    return runDryRun(targetDir, state)
  }

  return runReal(targetDir, state)
}

async function runReal(targetDir: string, state: LegacyState): Promise<MigrationDryRunReport> {
  // Phase 2: create backup (required as source for all migration helpers).
  const backup = await backupPlanning(targetDir, { state, dryRun: false })

  // Phases 3-5: migrate in parallel (independent operations).
  const [planning, lessons, decisions] = await Promise.all([
    migratePlanning(targetDir, { dryRun: false }),
    migrateLessons(targetDir, { dryRun: false }),
    migrateDecisions(targetDir, { dryRun: false }),
  ])

  const recordedWrites = planning.written.length + lessons.written.length + decisions.written.length

  return {
    dryRun: false,
    state,
    backup,
    planning,
    lessons,
    decisions,
    recordedWrites,
    totalBytes: 0,  // real mode: not tracked (files are on disk)
  }
}

async function runDryRun(targetDir: string, state: LegacyState): Promise<MigrationDryRunReport> {
  // DEV-02: helpers read from .planning.v5-backup/ as source of truth (G1).
  // In dry-run we create a staging backup, run migrations with dryRun=true
  // (helpers will not write to docs/), then remove the staging backup.
  // This satisfies CA-10: docs/ never created, .planning/ never deleted.

  const backupAlreadyExisted = await fs.access(
    `${targetDir}/${BACKUP_DIR}`,
  ).then(() => true).catch(() => false)

  // Create staging backup (needed so helpers can read source files).
  const backup = await backupPlanning(targetDir, { state, dryRun: false })

  try {
    // Run migrations with dryRun=true — helpers populate written[] but write nothing.
    const [planning, lessons, decisions] = await Promise.all([
      migratePlanning(targetDir, { dryRun: true }),
      migrateLessons(targetDir, { dryRun: true }),
      migrateDecisions(targetDir, { dryRun: true }),
    ])

    const recordedWrites = planning.written.length + lessons.written.length + decisions.written.length

    return {
      dryRun: true,
      state,
      backup: { ...backup, status: 'dry-run' },
      planning,
      lessons,
      decisions,
      recordedWrites,
      // Approximate total bytes from written path strings (dry-run has no actual bodies).
      totalBytes: 0,
    }
  } finally {
    // Clean up staging backup only if WE created it (not pre-existing).
    if (!backupAlreadyExisted) {
      await fs.rm(`${targetDir}/${BACKUP_DIR}`, { recursive: true, force: true })
    }
  }
}
