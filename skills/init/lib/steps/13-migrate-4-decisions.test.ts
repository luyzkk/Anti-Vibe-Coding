// skills/init/lib/steps/13-migrate-4-decisions.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { migrate4DecisionsStep } from './13-migrate-4-decisions'

const ctx = (cwd: string, args: readonly string[] = ['migrate']) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('migrate4DecisionsStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm4-noop-'))
    const r = await migrate4DecisionsStep.run(ctx(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode, decisions sem senior-principles: 1 linha', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm4-nocore-'))
    // 2026-05-17 (Luiz/dev): helper looks at .planning.v5-backup/decisions.md (direct, not nested .planning/).
    await mkdir(path.join(tmpDir, '.planning.v5-backup'), { recursive: true })
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', 'decisions.md'),
      '## D1 - bar decisao\n\n- detalhe\n',
    )

    const r = await migrate4DecisionsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(1)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 196 (PRD R1, G1).
    expect(lines[0]).toMatch(/^Decisions: completed — wrote: \d+$/)
  })

  test('migrate mode, decisions + senior-principles: 2 linhas (core-beliefs created)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm4-core-'))
    // 2026-05-17 (Luiz/dev): helper looks at .planning.v5-backup/ directly.
    await mkdir(path.join(tmpDir, '.planning.v5-backup'), { recursive: true })
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', 'decisions.md'),
      '## D1 - bar decisao\n\n- detalhe\n',
    )
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', 'senior-principles.md'),
      '# Senior Principles\n\n1. test\n',
    )

    const r = await migrate4DecisionsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(2)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 198 (PRD R1, G1).
    expect(lines[1]).toBe('  core-beliefs.md created from senior-principles.md')
    expect(r.mutated).toBe(true)
  })
})
