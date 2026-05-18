// skills/init/lib/steps/11-migrate-2-planning.test.ts
// 2026-05-17 (Luiz/dev): TDD para step migrate-2-planning. Plano 03 fase-03.
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { migrate2PlanningStep } from './11-migrate-2-planning'
import { AbortError } from './abort-error'

const ctx = (cwd: string, args: readonly string[] = ['migrate'], flags: Readonly<Record<string, boolean | string>> = {}) => ({
  cwd, args, flags,
})

// 2026-05-17 (Luiz/dev): backup ja criado (.planning.v5-backup/.planning/2026-05-12-foo/PLAN.md).
// Destino nao existe — sem conflict. migratePlanning retorna status='completed'.
async function setupBackupOnly(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'm2-ok-'))
  // relPath sera '2026-05-12-foo/PLAN.md' → kind='plan-folder-plan' → target='docs/exec-plans/active/2026-05-12-foo-plan.md'
  await mkdir(path.join(dir, '.planning.v5-backup', '.planning', '2026-05-12-foo'), { recursive: true })
  await writeFile(
    path.join(dir, '.planning.v5-backup', '.planning', '2026-05-12-foo', 'PLAN.md'),
    '# Plan foo\n',
  )
  return dir
}

// 2026-05-17 (Luiz/dev): backup + destino divergente → conflict.
// computeTargetPath para plan-folder-plan: docs/exec-plans/active/2026-05-12-foo-plan.md
async function setupConflict(): Promise<string> {
  const dir = await setupBackupOnly()
  await mkdir(path.join(dir, 'docs', 'exec-plans', 'active'), { recursive: true })
  await writeFile(
    path.join(dir, 'docs', 'exec-plans', 'active', '2026-05-12-foo-plan.md'),
    '# Plan foo - DIVERGENT\n',
  )
  return dir
}

describe('migrate2PlanningStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm2-noop-'))
    const r = await migrate2PlanningStep.run(ctx(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode, no conflicts: 4 linhas de summary, mutated true', async () => {
    tmpDir = await setupBackupOnly()
    const r = await migrate2PlanningStep.run(ctx(tmpDir))
    expect(r.mutated).toBe(true)

    const lines = r.summary.split('\n')
    // 2026-05-17 (Luiz/dev): 4 linhas byte-identicas ao SKILL.md linhas 143-146 (PRD R1, G1).
    expect(lines).toHaveLength(4)
    expect(lines[0]).toMatch(/^Migration: (completed|partial|dry-run)$/)
    expect(lines[1]).toMatch(/^  entries: \d+$/)
    expect(lines[2]).toMatch(/^  written: \d+$/)
    expect(lines[3]).toMatch(/^  skipped: \d+$/)
  })

  test('migrate mode, conflicts presentes: lanca AbortError com reason de 6 linhas', async () => {
    tmpDir = await setupConflict()

    let caught: AbortError | undefined
    try {
      await migrate2PlanningStep.run(ctx(tmpDir))
    } catch (e) {
      if (e instanceof AbortError) caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
    if (caught) {
      expect(caught.code).toBe(1)
      const lines = caught.reason.split('\n')
      // 2026-05-17 (Luiz/dev): 4 linhas relatorio + 2 linhas conflict = 6 total (PRD MH-05).
      expect(lines).toHaveLength(6)
      expect(lines[0]).toMatch(/^Migration: /)
      expect(lines[1]).toMatch(/^  entries: \d+$/)
      expect(lines[2]).toMatch(/^  written: \d+$/)
      expect(lines[3]).toMatch(/^  skipped: \d+$/)
      expect(lines[4]).toMatch(/^  CONFLICTS: /)
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 150 (PRD R1, G1).
      expect(lines[5]).toBe('  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.')
    }
  })

  test('migrate mode, --dry-run: status dry-run, mutated false', async () => {
    tmpDir = await setupBackupOnly()
    const r = await migrate2PlanningStep.run(ctx(tmpDir, ['migrate'], { 'dry-run': true }))
    // 2026-05-17 (Luiz/dev): em dry-run o helper retorna status='dry-run' sem tocar disco.
    // PRD CA-03. mutated=false pois nada foi escrito (status !== 'completed').
    expect(r.mutated).toBe(false)
    expect(r.summary.split('\n')[0]).toBe('Migration: dry-run')
  })
})
