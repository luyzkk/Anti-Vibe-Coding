// 2026-05-20 (Luiz/dev): D7.A.1 + D3 do PRD knowledge-path-cutover — step dedicado de migracao v5.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as os from 'node:os'
import { runMigrateKnowledgePathStep } from './13_1-migrate-knowledge-path'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'migrate-knowledge-path-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('migrateKnowledgePathStep', () => {
  test('moves docs/knowledge/legacy-claude-knowledge to docs/_legacy/knowledge in re-populate mode', async () => {
    // Arrange: criar estrutura v5 legacy
    const src = path.join(tmpDir, 'docs', 'knowledge', 'legacy-claude-knowledge')
    await fs.mkdir(src, { recursive: true })
    await fs.writeFile(path.join(src, 'README.md'), '# legacy knowledge')

    // Act
    const result = await runMigrateKnowledgePathStep({
      cwd: tmpDir,
      flags: { '__reentryMode': 're-populate' },
    })

    // Assert: destino existe, fonte nao existe, step reporta mutacao
    const dest = path.join(tmpDir, 'docs', '_legacy', 'knowledge')
    const destFile = path.join(dest, 'README.md')
    expect(result.mutated).toBe(true)
    expect(result.summary).toContain('migrated')
    // fs.access resolves with null in Bun (file exists) and rejects when absent
    await expect(fs.access(destFile)).resolves.toBeNull()
    await expect(fs.access(src)).rejects.toThrow()
  })

  test('aborts with AbortError when destination docs/_legacy/knowledge already exists', async () => {
    // Arrange: fonte E destino pre-existentes
    const src = path.join(tmpDir, 'docs', 'knowledge', 'legacy-claude-knowledge')
    const dest = path.join(tmpDir, 'docs', '_legacy', 'knowledge')
    await fs.mkdir(src, { recursive: true })
    await fs.mkdir(dest, { recursive: true })
    await fs.writeFile(path.join(src, 'README.md'), '# src')
    await fs.writeFile(path.join(dest, 'README.md'), '# dest existing')

    // Act + Assert
    await expect(
      runMigrateKnowledgePathStep({
        cwd: tmpDir,
        flags: { '__reentryMode': 're-populate' },
      })
    ).rejects.toMatchObject({
      name: 'AbortError',
      reason: expect.stringContaining('Destino já existe'),
    })
  })

  test('is a no-op when NOT in re-populate mode', async () => {
    // Arrange: estrutura v5 presente mas nao eh re-populate
    const src = path.join(tmpDir, 'docs', 'knowledge', 'legacy-claude-knowledge')
    await fs.mkdir(src, { recursive: true })
    await fs.writeFile(path.join(src, 'README.md'), '# legacy knowledge')

    // Act
    const result = await runMigrateKnowledgePathStep({
      cwd: tmpDir,
      flags: {},
    })

    // Assert: nao mutou, fonte intacta
    expect(result.mutated).toBe(false)
    expect(result.summary).toContain('skipped')
    // fs.access resolves with null in Bun (file exists) and rejects when absent
    await expect(fs.access(src)).resolves.toBeNull()
  })

  test('is a no-op when docs/knowledge/legacy-claude-knowledge does not exist', async () => {
    // Sem fonte → skip silencioso
    const result = await runMigrateKnowledgePathStep({
      cwd: tmpDir,
      flags: { '__reentryMode': 're-populate' },
    })

    expect(result.mutated).toBe(false)
    expect(result.summary).toContain('no legacy')
  })
})
