// skills/init/lib/steps/12-migrate-3-lessons.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { migrate3LessonsStep } from './12-migrate-3-lessons'

const ctx = (cwd: string, args: readonly string[] = ['migrate']) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('migrate3LessonsStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm3-noop-'))
    const r = await migrate3LessonsStep.run(ctx(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode, source missing: 2 linhas, segunda eh "nothing to migrate"', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm3-miss-'))
    // 2026-05-17 (Luiz/dev): backup dir exists but lessons-learned.md is absent.
    // Helper looks at .planning.v5-backup/lessons-learned.md (direct, not nested .planning/).
    await mkdir(path.join(tmpDir, '.planning.v5-backup'), { recursive: true })

    const r = await migrate3LessonsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(2)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 172 (PRD R1, G1).
    expect(lines[0]).toMatch(/^Lessons: skipped — wrote: 0 skipped: \d+$/)
    expect(lines[1]).toBe('  (no lessons-learned.md in backup — nothing to migrate)')
    expect(r.mutated).toBe(false)
  })

  test('migrate mode, source present: 1 linha, wrote >= 1', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm3-pres-'))
    // 2026-05-17 (Luiz/dev): helper looks at .planning.v5-backup/lessons-learned.md (not nested .planning/).
    await mkdir(path.join(tmpDir, '.planning.v5-backup'), { recursive: true })
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', 'lessons-learned.md'),
      '## 2025-12-01: foo licao\n\n- detalhe\n',
    )

    const r = await migrate3LessonsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^Lessons: completed — wrote: \d+ skipped: \d+$/)
    expect(r.mutated).toBe(true)
  })
})
