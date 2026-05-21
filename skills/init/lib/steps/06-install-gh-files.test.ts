// skills/init/lib/steps/06-install-gh-files.test.ts
// 2026-05-21 (Luiz/dev): Step 6 — install-gh-files REAL (Plano 03 fase-02 init-refactor-v7).
// Cobre CA-08 (skip-if-exists em re-run), D4 (sem dry-run), summary com metricas observabilidade.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { installGhFilesStep } from './06-install-gh-files'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-step6-'))
}

describe('installGhFilesStep (Step 6 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = 06-install-gh-files', () => {
    // 2026-05-21 (Luiz/dev): id e contrato com registry.ts (PRD CA-09).
    expect(installGhFilesStep.id).toBe('06-install-gh-files')
  })

  test('greenfield: escreve harness.yml + pull_request_template.md', async () => {
    // 2026-05-21 (Luiz/dev): valida que ambos arquivos do .github/ foram criados (RF-03 estendido).
    const report = await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    expect(report.summary).toMatch(/ghFilesInstalled:\s*2/)
    expect(report.summary).toMatch(/ghFilesSkipped:\s*0/)

    const yml = await fs.stat(path.join(tmp, '.github/workflows/harness.yml'))
    expect(yml.isFile()).toBe(true)
    const pr = await fs.stat(path.join(tmp, '.github/pull_request_template.md'))
    expect(pr.isFile()).toBe(true)
  })

  test('re-run: nenhum arquivo sobrescrito (CA-08)', async () => {
    // 2026-05-21 (Luiz/dev): primeira execucao popula; segunda deve skipar tudo (PRD CA-08).
    await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })
    const second = await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })

    expect(second.summary).toMatch(/ghFilesInstalled:\s*0/)
    expect(second.summary).toMatch(/ghFilesSkipped:\s*2/)
  })

  test('re-run preserva conteudo customizado pelo usuario em pull_request_template.md', async () => {
    // 2026-05-21 (Luiz/dev): defensa contra cross-upgrade destrutivo (analogo ao scaffold:80).
    await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })
    const customPath = path.join(tmp, '.github/pull_request_template.md')
    const sentinel = '# Meu PR template customizado\n\nNao sobrescrever.\n'
    await fs.writeFile(customPath, sentinel, 'utf8')

    await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })

    const preserved = await fs.readFile(customPath, 'utf8')
    expect(preserved).toBe(sentinel)
  })

  test('D4: zero imports de dry-run no codigo do step', async () => {
    // 2026-05-21 (Luiz/dev): meta-test — garante que D4 (CONTEXT linha 38) eh respeitado.
    const src = await fs.readFile(
      path.join(import.meta.dir, '06-install-gh-files.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/isDryRun|WriteRecorder|makeWriter|dry-run-mode/)
  })
})
