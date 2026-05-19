// 2026-05-19 (Luiz/dev): Plano 01 fase-04 — testes minimos do backup-pre-mutation.
// Cobertura completa (manifest, multiplos docs, edge cases) e do Plano 02 fase-03.
import { describe, expect, test } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { backupPreMutationStep } from './10-backup-pre-mutation'

async function mkTmp(): Promise<string> {
  const base = path.join(import.meta.dir, '..', '..', '..', '..', '.tmp', `bpm-${Date.now()}`)
  await fs.mkdir(base, { recursive: true })
  return base
}

describe('10-backup-pre-mutation (esqueleto minimo)', () => {
  test('copies CLAUDE.md raiz to docs/_legacy/CLAUDE.md.bak when present', async () => {
    const cwd = await mkTmp()
    await fs.writeFile(path.join(cwd, 'CLAUDE.md'), '# legacy content', 'utf8')

    const report = await backupPreMutationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(true)

    const backup = await fs.readFile(path.join(cwd, 'docs/_legacy/CLAUDE.md.bak'), 'utf8')
    expect(backup).toBe('# legacy content')
  })

  test('skips silently when no CLAUDE.md raiz', async () => {
    const cwd = await mkTmp()
    const report = await backupPreMutationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skip')
  })

  test('dry-run: nao escreve nada', async () => {
    const cwd = await mkTmp()
    await fs.writeFile(path.join(cwd, 'CLAUDE.md'), '# anything', 'utf8')

    const report = await backupPreMutationStep.run({ cwd, args: ['--dry-run'], flags: { 'dry-run': true } })
    expect(report.mutated).toBe(false)

    const legacyExists = await fs.access(path.join(cwd, 'docs/_legacy')).then(() => true).catch(() => false)
    expect(legacyExists).toBe(false)
  })
})
