// 2026-05-11 (Luiz/dev): cobre RED da fase-02 + matriz de idempotencia/atomicidade.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { backupPlanning, BACKUP_DIR } from './backup-planning'
import { detectV5Legacy } from './detect-v5-legacy'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'backup')

async function setupLegacy(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, '.planning', 'plano01'), { recursive: true })
  await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), '# Foo\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', 'plano01', 'PRD.md'), '# PRD\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), '# Lessons\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'decisions.md'), '# Decisions\n', 'utf8')
}

describe('backupPlanning', () => {
  beforeEach(setupLegacy)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('creates .planning.v5-backup/ with all artifacts', async () => {
    const state = await detectV5Legacy(FIXTURE)
    const result = await backupPlanning(FIXTURE, { state })
    expect(result.status).toBe('created')
    expect(await fs.stat(path.join(FIXTURE, BACKUP_DIR, '.planning'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, BACKUP_DIR, 'lessons-learned.md'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, BACKUP_DIR, 'decisions.md'))).toBeDefined()
  })

  it('is idempotent — second call returns already-exists', async () => {
    const state = await detectV5Legacy(FIXTURE)
    await backupPlanning(FIXTURE, { state })
    const second = await backupPlanning(FIXTURE, { state })
    expect(second.status).toBe('already-exists')
    expect(second.filesCopied).toBe(0)
  })

  it('preserves nested directory structure', async () => {
    const state = await detectV5Legacy(FIXTURE)
    await backupPlanning(FIXTURE, { state })
    const nested = path.join(FIXTURE, BACKUP_DIR, '.planning', 'plano01', 'PRD.md')
    expect(await fs.readFile(nested, 'utf8')).toBe('# PRD\n')
  })

  it('dryRun=true does NOT create backup but returns count', async () => {
    const state = await detectV5Legacy(FIXTURE)
    const result = await backupPlanning(FIXTURE, { state, dryRun: true })
    expect(result.status).toBe('dry-run')
    expect(result.filesCopied).toBeGreaterThan(0)
    // Nao escreveu nada:
    const exists = await fs.stat(path.join(FIXTURE, BACKUP_DIR)).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('cleans tmp dir from previous aborted run', async () => {
    // Simula tmp dir orfao:
    await fs.mkdir(path.join(FIXTURE, '.planning.v5-backup.tmp', 'leftover'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, '.planning.v5-backup.tmp', 'leftover', 'x'), 'x', 'utf8')

    const state = await detectV5Legacy(FIXTURE)
    const result = await backupPlanning(FIXTURE, { state })
    expect(result.status).toBe('created')
    // Tmp dir nao deve mais existir (foi renomeado).
    const tmpExists = await fs.stat(path.join(FIXTURE, '.planning.v5-backup.tmp'))
      .then(() => true).catch(() => false)
    expect(tmpExists).toBe(false)
  })

  it('rejects when lock file present', async () => {
    await fs.writeFile(path.join(FIXTURE, '.planning.v5-backup.lock'), 'pid=999\n', 'utf8')
    const state = await detectV5Legacy(FIXTURE)
    await expect(backupPlanning(FIXTURE, { state })).rejects.toThrow(/lock/i)
  })

  it('removes lock even on success', async () => {
    const state = await detectV5Legacy(FIXTURE)
    await backupPlanning(FIXTURE, { state })
    const lockExists = await fs.stat(path.join(FIXTURE, '.planning.v5-backup.lock'))
      .then(() => true).catch(() => false)
    expect(lockExists).toBe(false)
  })

  it('does NOT modify the original .planning/ (read-only over source)', async () => {
    const state = await detectV5Legacy(FIXTURE)
    const before = await fs.readFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), 'utf8')
    await backupPlanning(FIXTURE, { state })
    const after = await fs.readFile(path.join(FIXTURE, '.planning', 'CONTEXT-foo.md'), 'utf8')
    expect(after).toBe(before)
  })
})
