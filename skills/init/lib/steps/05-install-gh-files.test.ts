// skills/init/lib/steps/05-install-gh-files.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { installGhFilesStep } from './05-install-gh-files'

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('installGhFilesStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('greenfield: installs .github files, summary follows wording', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'gh-test-'))
    const report = await installGhFilesStep.run(ctx(tmpDir))
    expect(report.mutated).toBe(true)
    expect(report.summary).toMatch(/^\.github files installed: .+$/)

    // 2026-05-17 (Luiz/dev): D14 — sempre instala. Validar artefato no FS.
    expect(existsSync(path.join(tmpDir, '.github'))).toBe(true)
  })

  test('idempotent: re-run on existing .github does not throw', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'gh-idem-'))
    await installGhFilesStep.run(ctx(tmpDir))
    // 2026-05-17 (Luiz/dev): segunda run nao deve falhar — helper eh idempotente (G2).
    await installGhFilesStep.run(ctx(tmpDir))
    expect(existsSync(path.join(tmpDir, '.github'))).toBe(true)
  })
})
