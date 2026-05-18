// skills/init/lib/steps/10-migrate-1-backup.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { migrate1BackupStep } from './10-migrate-1-backup'
import { AbortError } from './abort-error'

const ctx = (cwd: string, args: readonly string[] = []) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('migrate1BackupStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no-args (no migrate mode): no-op silencioso, mutated=false', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-noop-'))
    // 2026-05-17 (Luiz/dev): sem 'migrate' em args[0], step nao age. CA-01.
    const r = await migrate1BackupStep.run(ctx(tmpDir, []))
    expect(r.mutated).toBe(false)
    expect(r.summary).toBe('')
  })

  test('migrate mode + legacy v5: cria backup, summary byte-identico', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-create-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrate1BackupStep.run(ctx(tmpDir, ['migrate']))

    expect(r.mutated).toBe(true)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 117 (PRD R1, G1).
    expect(r.summary).toMatch(/^Backup \d+ files → .+\.planning\.v5-backup$/)
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(true)
  })

  test('migrate mode + backup ja existe: idempotente, summary byte-identico', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-idem-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')
    // Pre-criar o backup (simula segunda execucao)
    await mkdir(path.join(tmpDir, '.planning.v5-backup'), { recursive: true })

    const r = await migrate1BackupStep.run(ctx(tmpDir, ['migrate']))

    expect(r.mutated).toBe(false)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 120 (PRD R1, G1).
    expect(r.summary).toMatch(/^Backup already present at .+ — proceeding \(idempotent\)\.$/)
  })

  test('migrate mode + lock orfao: lanca AbortError com code=1', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-lock-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')
    // Simula lock orfao
    await writeFile(path.join(tmpDir, '.planning.v5-backup.lock'), '')

    let caught: AbortError | undefined
    try {
      await migrate1BackupStep.run(ctx(tmpDir, ['migrate']))
    } catch (e) {
      if (e instanceof AbortError) caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
    if (caught) {
      // 2026-05-17 (Luiz/dev): PRD CA-07 — backup falha com lock => AbortError code=1.
      expect(caught.code).toBe(1)
      expect(caught.reason).toMatch(/Backup lock present at .+\.planning\.v5-backup\.lock/)
      expect(caught.reason).toMatch(/another \/init may be running/)
    }
  })

  test('migrate mode + --dry-run: status dry-run, mutated=false, summary vazio', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-dryrun-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrate1BackupStep.run({
      cwd: tmpDir,
      args: ['migrate'],
      flags: { 'dry-run': true },
    })
    expect(r.mutated).toBe(false)
    expect(r.summary).toBe('')
    // 2026-05-17 (Luiz/dev): dry-run nao cria backup. PRD CA-03.
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(false)
  })
})
