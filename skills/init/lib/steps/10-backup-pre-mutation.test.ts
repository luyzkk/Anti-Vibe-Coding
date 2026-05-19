// 2026-05-19 (Luiz/dev): testes da nova logica leve do Step 10 (MH-05).
// Substitui suite antiga (applyMergeDestructive) — deletar `10-apply-merge-destructive.test.ts`.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { backupPreMutationStep } from './10-backup-pre-mutation'
import type { StepContext } from './types'

async function mkTempProject(files: Record<string, string> = {}): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-step10-'))
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf8')
  }
  return tmpDir
}

function ctxFor(cwd: string, flags: Record<string, boolean | string> = {}): StepContext {
  return { cwd, args: [], flags }
}

describe('backupPreMutationStep', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('copies CLAUDE.md to docs/_legacy/CLAUDE.md.bak when CLAUDE.md exists', async () => {
    tmpDir = await mkTempProject({ 'CLAUDE.md': '# old content' })

    const report = await backupPreMutationStep.run(ctxFor(tmpDir))

    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('CLAUDE.md -> docs/_legacy/CLAUDE.md.bak')

    const bak = await fs.readFile(path.join(tmpDir, 'docs/_legacy/CLAUDE.md.bak'), 'utf8')
    expect(bak).toBe('# old content')
  })

  it('skips silently when CLAUDE.md is absent (greenfield)', async () => {
    tmpDir = await mkTempProject() // sem CLAUDE.md

    const report = await backupPreMutationStep.run(ctxFor(tmpDir))

    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skip')

    const legacyExists = await fs.access(path.join(tmpDir, 'docs/_legacy')).then(() => true).catch(() => false)
    expect(legacyExists).toBe(false)
  })

  it('respects --dry-run (no copy)', async () => {
    tmpDir = await mkTempProject({ 'CLAUDE.md': '# something' })

    const report = await backupPreMutationStep.run(ctxFor(tmpDir, { 'dry-run': true }))

    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('dry-run')

    const bakExists = await fs.access(path.join(tmpDir, 'docs/_legacy/CLAUDE.md.bak'))
      .then(() => true)
      .catch(() => false)
    expect(bakExists).toBe(false)
  })
})
