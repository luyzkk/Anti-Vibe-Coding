// 2026-05-18 (Luiz/dev): fase-02 RED — 6 testes para backup-anti-vibe (D29 canonico + idempotencia RNF-04).

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  createBackup,
  readBackupManifest,
  getLatestBackupDir,
  computeSha256,
} from './backup-anti-vibe'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-anti-vibe-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('computeSha256 + createBackup', () => {
  it('createBackup writes manifest with sha256 of each file', async () => {
    // Setup 2 files
    await fs.writeFile(path.join(tmpDir, 'a.txt'), 'hello', 'utf8')
    await fs.writeFile(path.join(tmpDir, 'b.txt'), 'world', 'utf8')

    const clock = () => new Date('2026-05-18T14:30:00.000Z')
    const result = await createBackup({
      cwd: tmpDir,
      files: [
        { originalPath: 'a.txt', action: 'overwrite' },
        { originalPath: 'b.txt', action: 'overwrite' },
      ],
      clock,
    })

    const manifest = await readBackupManifest(result.backupDir)

    expect(manifest.files).toHaveLength(2)

    for (const entry of manifest.files) {
      const sha = await computeSha256(path.join(tmpDir, entry.originalPath))
      expect(entry.sha256).toBe(sha)
    }
  })

  it('readBackupManifest roundtrips with createBackup', async () => {
    await fs.writeFile(path.join(tmpDir, 'file.txt'), 'content', 'utf8')

    const clock = () => new Date('2026-05-18T14:31:00.000Z')
    const result = await createBackup({
      cwd: tmpDir,
      files: [{ originalPath: 'file.txt', action: 'move' }],
      clock,
    })

    const fromDisk = await readBackupManifest(result.backupDir)
    expect(fromDisk).toEqual(result.manifest)
  })
})

describe('getLatestBackupDir', () => {
  it('returns null when .anti-vibe/backup does not exist', async () => {
    const result = await getLatestBackupDir(tmpDir)
    expect(result).toBeNull()
  })

  it('returns latest by lexicographic timestamp', async () => {
    const clock10 = () => new Date('2026-05-18T10:00:00.000Z')
    const clock11 = () => new Date('2026-05-18T11:00:00.000Z')
    const clock09 = () => new Date('2026-05-18T09:00:00.000Z')

    await fs.writeFile(path.join(tmpDir, 'x.txt'), 'x', 'utf8')

    const r10 = await createBackup({ cwd: tmpDir, files: [{ originalPath: 'x.txt', action: 'overwrite' }], clock: clock10 })
    // For t11 and t09 we need different file content to avoid idempotency no-op
    await fs.writeFile(path.join(tmpDir, 'x.txt'), 'y', 'utf8')
    const r11 = await createBackup({ cwd: tmpDir, files: [{ originalPath: 'x.txt', action: 'overwrite' }], clock: clock11 })
    await fs.writeFile(path.join(tmpDir, 'x.txt'), 'z', 'utf8')
    const r09 = await createBackup({ cwd: tmpDir, files: [{ originalPath: 'x.txt', action: 'overwrite' }], clock: clock09 })

    // Suppress unused variable warning — we need all 3 backups to exist
    void r10
    void r09

    const latest = await getLatestBackupDir(tmpDir)
    expect(latest).toBe(r11.backupDir)
  })
})

describe('gitSha handling', () => {
  it('manifest includes gitSha when .git exists, null otherwise', async () => {
    // Sub-case 1: no .git → null
    await fs.writeFile(path.join(tmpDir, 'f.txt'), 'data', 'utf8')
    const r1 = await createBackup({
      cwd: tmpDir,
      files: [{ originalPath: 'f.txt', action: 'overwrite' }],
      clock: () => new Date('2026-05-18T14:32:00.000Z'),
    })
    expect(r1.manifest.gitSha).toBeNull()

    // Sub-case 2: .git/HEAD with ref → resolves sha
    const fakeSha = 'aabbccdd1122334455667788990011223344556677'
    await fs.mkdir(path.join(tmpDir, '.git', 'refs', 'heads'), { recursive: true })
    await fs.writeFile(path.join(tmpDir, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf8')
    await fs.writeFile(path.join(tmpDir, '.git', 'refs', 'heads', 'main'), `${fakeSha}\n`, 'utf8')

    await fs.writeFile(path.join(tmpDir, 'f.txt'), 'data2', 'utf8')
    const r2 = await createBackup({
      cwd: tmpDir,
      files: [{ originalPath: 'f.txt', action: 'overwrite' }],
      clock: () => new Date('2026-05-18T14:33:00.000Z'),
    })
    expect(r2.manifest.gitSha).toBe(fakeSha)
  })
})

describe('idempotency', () => {
  it('createBackup is no-op when state checksums match latest backup', async () => {
    await fs.writeFile(path.join(tmpDir, 'same.txt'), 'unchanged content', 'utf8')

    const clock1 = () => new Date('2026-05-18T14:40:00.000Z')
    const clock2 = () => new Date('2026-05-18T14:50:00.000Z')

    const r1 = await createBackup({
      cwd: tmpDir,
      files: [{ originalPath: 'same.txt', action: 'overwrite' }],
      clock: clock1,
    })

    // Same content — second call must return r1.backupDir without creating a new folder
    const r2 = await createBackup({
      cwd: tmpDir,
      files: [{ originalPath: 'same.txt', action: 'overwrite' }],
      clock: clock2,
    })

    expect(r2.backupDir).toBe(r1.backupDir)

    // Only 1 entry in .anti-vibe/backup/
    const backupRoot = path.join(tmpDir, '.anti-vibe', 'backup')
    const entries = await fs.readdir(backupRoot)
    expect(entries).toHaveLength(1)
  })
})
