import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { discoverExistingDocsStep } from './07-discover-existing-docs'
import { writeDiscoveryArtifact, readDiscoveryArtifact } from '../discovery-store'
import { registry } from '../registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-discover-'))
}

async function touch(file: string, content: string = ''): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

describe('discoverExistingDocsStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel', () => {
    expect(discoverExistingDocsStep.id).toBe('07-discover-existing-docs')
  })

  test('discovery vazio retorna 0 docs e 0 blocked', async () => {
    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 arquivos encontrados')
    expect(report.summary).toContain('0 bloqueados')
  })

  test('com secrets-scan previo, flag blockedBySecret eh propagada', async () => {
    await touch(path.join(tmp, 'docs', 'STRIPE.md'), 'sk_live_xxxxx')
    await touch(path.join(tmp, 'docs', 'CLEAN.md'), '# limpo')

    await writeDiscoveryArtifact(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 2,
      blockedFiles: [{ relativePath: 'docs/STRIPE.md', matches: [] }],
      durationMs: 1,
    })

    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('2 arquivos encontrados')
    expect(report.summary).toContain('1 bloqueados')

    const persisted = await readDiscoveryArtifact<{
      docs: ReadonlyArray<{ relativePath: string; blockedBySecret: boolean }>
    }>(tmp, 'discovered-docs')
    const stripe = persisted?.docs.find((d) => d.relativePath === 'docs/STRIPE.md')
    const clean = persisted?.docs.find((d) => d.relativePath === 'docs/CLEAN.md')
    expect(stripe?.blockedBySecret).toBe(true)
    expect(clean?.blockedBySecret).toBe(false)
  })

  test('sem secrets-scan-result.json previo, todos blockedBySecret=false (graceful)', async () => {
    await touch(path.join(tmp, 'docs', 'A.md'), '# a')
    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('0 bloqueados')
  })

  test('README da raiz NAO entra na lista (D6)', async () => {
    await touch(path.join(tmp, 'README.md'), '# raiz')
    await touch(path.join(tmp, 'docs', 'real.md'), '# real')
    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('1 arquivos encontrados')
  })

  test('registry: discoverExistingDocsStep apos secretsScanStep, antes de migrate0', () => {
    const ids = registry.map((s) => s.id)
    const idxDiscover = ids.indexOf('07-discover-existing-docs')
    const idxSecrets = ids.indexOf('06-secrets-scan')
    const idxMigrate0 = ids.indexOf('migrate-0-parse-dry-run')
    expect(idxDiscover).toBe(idxSecrets + 1)
    expect(idxDiscover).toBeLessThan(idxMigrate0)
  })

  test('performance budget — 50 arquivos < 5s (proxy para CA-15)', async () => {
    for (let i = 0; i < 50; i++) {
      await touch(path.join(tmp, 'docs', `f${i}.md`), '# x')
    }
    const start = performance.now()
    await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(5000)
    // TODO Plano 07 fase-05: fixture com 500 arquivos para CA-15 (<120s no init completo --dry-run).
  })
})
