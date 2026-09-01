// skills/init/lib/steps/03-secrets-scan.test.ts
// 2026-05-21 (Luiz/dev): Step 3 — secrets-scan REAL (Plano 02 fase-02 init-refactor-v7).
// Portado de skills/init/lib/steps/06-secrets-scan.test.ts SEM testes obsoletos (D4):
//   - removido: 'flag --dry-run leva noWrite' (D4 removeu dry-run)
//   - removido: teste de registry order (movido para fase-04)
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { secretsScanStep } from './03-secrets-scan'
import { readDiscoveryArtifact } from '../discovery-store'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-secrets-scan-'))
}

describe('secretsScanStep (Step 3 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = 03-secrets-scan', () => {
    expect(secretsScanStep.id).toBe('03-secrets-scan')
  })

  test('scan vazio (sem .md/.mdx) retorna scannedCount=0 sem blocked', async () => {
    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 arquivos varridos')
    const persisted = await readDiscoveryArtifact<{ blockedFiles: unknown[] }>(tmp, 'secrets-scan-result')
    expect(persisted?.blockedFiles).toHaveLength(0)
  })

  test('match em arquivo X eh registrado em blockedFiles; outros arquivos limpos passam', async () => {
    await fs.mkdir(path.join(tmp, 'docs'), { recursive: true })
    await fs.writeFile(path.join(tmp, 'docs', 'STRIPE.md'), 'STRIPE=sk_live_1234567890ABCDEFGHIJKLMN')
    await fs.writeFile(path.join(tmp, 'docs', 'CLEAN.md'), '# arquivo limpo')

    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('2 arquivos varridos')
    expect(report.summary).toContain('1 arquivos com match')

    const persisted = await readDiscoveryArtifact<{
      blockedFiles: ReadonlyArray<{ relativePath: string }>
    }>(tmp, 'secrets-scan-result')
    expect(persisted?.blockedFiles).toHaveLength(1)
    expect(persisted?.blockedFiles[0]?.relativePath).toBe('docs/STRIPE.md')
  })

  test('blacklist node_modules eh ignorada', async () => {
    await fs.mkdir(path.join(tmp, 'node_modules', 'foo'), { recursive: true })
    await fs.writeFile(path.join(tmp, 'node_modules', 'foo', 'README.md'), 'AKIAIOSFODNN7EXAMPLE')
    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('0 arquivos varridos')
  })

  // 2026-09-01 (Luiz/dev): escopo estendido de markdown-only para arquivos de codigo —
  // PRD §RF-02 / CA-02.
  test('arquivo .ts com secret sintetico eh varrido e entra em blockedFiles', async () => {
    await fs.mkdir(path.join(tmp, 'src'), { recursive: true })
    await fs.writeFile(
      path.join(tmp, 'src', 'config.ts'),
      'const gh = "ghp_A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz"',
    )

    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('1 arquivos com match')

    const persisted = await readDiscoveryArtifact<{
      blockedFiles: ReadonlyArray<{ relativePath: string }>
    }>(tmp, 'secrets-scan-result')
    expect(persisted?.blockedFiles).toHaveLength(1)
    expect(persisted?.blockedFiles[0]?.relativePath).toBe('src/config.ts')
  })

  // 2026-09-01 (Luiz/dev): lockfile fica de fora mesmo dentro do escopo .json — hash
  // sha512- de integridade dispararia a heuristica de entropia em massa. PRD §RF-02.
  test('package-lock.json com hashes sha512- NAO entra em blockedFiles nem scannedCount', async () => {
    await fs.writeFile(
      path.join(tmp, 'package-lock.json'),
      '{ "integrity": "sha512-aZ9kQ2mX7pL4vB8nR1tY6wE3sD5gH0jFwErTyUiOpAsDf" }',
    )

    const report = await secretsScanStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('0 arquivos varridos')
    expect(report.summary).toContain('0 arquivos com match')

    const persisted = await readDiscoveryArtifact<{ blockedFiles: unknown[] }>(tmp, 'secrets-scan-result')
    expect(persisted?.blockedFiles).toHaveLength(0)
  })
})
