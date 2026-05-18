import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { executeRollback } from './rollback'

let tmpDir: string
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rollback-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const shaBuffer = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex')

async function seedBackup(
  cwd: string,
  ts: string,
  entries: Array<{ originalPath: string; backupPath: string; content: string; action: string }>,
): Promise<string> {
  const backupDir = path.join(cwd, '.anti-vibe', 'backup', ts)
  await fs.mkdir(backupDir, { recursive: true })
  const files = []
  for (const e of entries) {
    const abs = path.join(backupDir, e.backupPath)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    const buf = Buffer.from(e.content, 'utf8')
    await fs.writeFile(abs, buf)
    files.push({
      originalPath: e.originalPath,
      backupPath: e.backupPath,
      sha256: shaBuffer(buf),
      action: e.action,
    })
  }
  await fs.writeFile(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify({ timestamp: ts, files, gitSha: null }, null, 2),
  )
  return backupDir
}

describe('executeRollback', () => {
  it('returns error when no backup found', async () => {
    const result = await executeRollback({ cwd: tmpDir })
    expect(result.errors[0]?.message).toBe('no backup found')
    expect(result.adrPath).toBeNull()
    expect(result.backupDir).toBeNull()
  })

  it('aborts when manifest schema invalid', async () => {
    const backupDir = path.join(tmpDir, '.anti-vibe', 'backup', '2026-05-18T14-30-00Z')
    await fs.mkdir(backupDir, { recursive: true })
    await fs.writeFile(path.join(backupDir, 'manifest.json'), 'not valid json{', 'utf8')
    const result = await executeRollback({ cwd: tmpDir })
    expect(result.errors[0]?.message).toMatch(/Backup integrity check failed.*manifest/i)
    expect(result.restored).toHaveLength(0)
  })

  it('aborts when checksum mismatch (CA-10)', async () => {
    const backupDir = await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      { originalPath: 'CLAUDE.md', backupPath: 'CLAUDE.md', content: 'original', action: 'transform' },
    ])
    // Corrupt the backup file AFTER manifest was written
    await fs.writeFile(path.join(backupDir, 'CLAUDE.md'), 'tampered', 'utf8')
    const result = await executeRollback({ cwd: tmpDir })
    expect(result.errors[0]?.message).toMatch(/sha256 mismatch/)
    expect(result.restored).toHaveLength(0)
  })

  it('honours user cancel', async () => {
    await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      { originalPath: 'CLAUDE.md', backupPath: 'CLAUDE.md', content: 'original', action: 'transform' },
    ])
    const result = await executeRollback({ cwd: tmpDir, askUser: async () => 'Cancel' })
    expect(result.userCancelled).toBe(true)
    expect(result.restored).toHaveLength(0)
  })

  it('restores byte-identico + writes ADR (CA-06)', async () => {
    const originalContent = '# CLAUDE\n\n## Akita rules\n... 287 lines ...\n'
    await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      { originalPath: 'CLAUDE.md', backupPath: 'CLAUDE.md', content: originalContent, action: 'transform' },
    ])
    // Simulate post-merge state
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# mirror\n', 'utf8')
    const result = await executeRollback({ cwd: tmpDir, askUser: async () => 'Confirm' })
    expect(result.errors).toHaveLength(0)
    expect(result.restored).toContain('CLAUDE.md')
    const restoredContent = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8')
    expect(restoredContent).toBe(originalContent)
    expect(result.adrPath).not.toBeNull()
    const adrContent = await fs.readFile(result.adrPath!, 'utf8')
    expect(adrContent).toMatch(/ADR-0001.*Rollback/)
    expect(adrContent).toContain('CLAUDE.md')
  })

  it('reverses move action — restores file at original path', async () => {
    const originalContent = '# Old\n\n... contents ...\n'
    await seedBackup(tmpDir, '2026-05-18T14-30-00Z', [
      {
        originalPath: 'docs/ARQUITETURA.md',
        backupPath: 'docs/ARQUITETURA.md',
        content: originalContent,
        action: 'move',
      },
    ])
    // Simulate post-move state: stub at originalPath
    await fs.mkdir(path.join(tmpDir, 'docs'), { recursive: true })
    await fs.writeFile(
      path.join(tmpDir, 'docs', 'ARQUITETURA.md'),
      '# Moved\n\nThis document moved to docs/ARCHITECTURE.md.\n',
      'utf8',
    )
    const result = await executeRollback({ cwd: tmpDir, askUser: async () => 'Confirm' })
    expect(result.errors).toHaveLength(0)
    const restoredContent = await fs.readFile(path.join(tmpDir, 'docs', 'ARQUITETURA.md'), 'utf8')
    expect(restoredContent).toBe(originalContent)
  })
})
