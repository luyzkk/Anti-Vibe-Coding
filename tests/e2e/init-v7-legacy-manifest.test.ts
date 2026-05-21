// tests/e2e/init-v7-legacy-manifest.test.ts
// 2026-05-21 (Luiz/dev): E2E Plano 02 fase-04 init-refactor-v7.
// Cobre CA-03 (.claude/planning/ detectado + manifest entry planning) + CA-05 (greenfield manifest legacy: []).
// DI-Plano02-fase04-no-docs-specs-assert: migratePlanning lê de BACKUP_DIR (não existe no fixture) —
// não verificar docs/specs/ existência. Verificar apenas manifest entry.
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { parseLegacyManifest } from '../../skills/_shared/legacy-manifest-schema'
import { registry } from '../../skills/init/lib/registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-e2e-'))
}

async function readManifest(cwd: string) {
  const raw = await fs.readFile(path.join(cwd, '.claude', 'legacy-manifest.json'), 'utf8')
  return parseLegacyManifest(JSON.parse(raw))
}

describe('init v7 e2e — legacy manifest (Plano 02 fase-04)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('registry: 03-secrets-scan apos 02-detect-legacy-and-stack, antes de migrate-planning-and-manifest', () => {
    const ids = registry.map((s) => s.id)
    const idxSecrets = ids.indexOf('03-secrets-scan')
    const idxDetect = ids.indexOf('detect-legacy-and-stack')
    const idxMigrate = ids.indexOf('migrate-planning-and-manifest')
    expect(idxDetect).toBeGreaterThanOrEqual(0)
    expect(idxSecrets).toBeGreaterThan(idxDetect)
    expect(idxMigrate).toBeGreaterThan(idxSecrets)
  })

  test('CA-05: greenfield (Node-TS) -> manifest com legacy: [] e stack node-ts high', async () => {
    // Setup: package.json minimo com typescript em devDeps -> stack node-ts
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )

    const result = await runInit([], { cwd: tmp, log: () => {} })
    expect(result.kind).toBe('ok')

    const manifest = await readManifest(tmp)
    expect(manifest.schemaVersion).toBe('1.0')
    expect(manifest.stack.primary).toBe('node-ts')
    expect(manifest.stack.confidence).toBe('high')
    expect(manifest.legacy).toHaveLength(0)
  })

  test('CA-03: fixture com .planning (raiz) + .claude/CLAUDE.md (533 linhas) + progress.txt -> manifest com entries corretas', async () => {
    // Setup do legacy
    // DI-Plano02-fase04-planning-path: detect-v5-legacy verifica .planning/ na RAIZ (nao .claude/planning/).
    // Probe: probes[0] = ['planning-dir', path.join(targetDir, '.planning')].
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )
    await fs.mkdir(path.join(tmp, '.planning'), { recursive: true })
    await fs.writeFile(path.join(tmp, '.planning', 'CONTEXT-foo.md'), '# foo')

    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    const claudeMd = Array.from({ length: 533 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    await fs.writeFile(path.join(tmp, '.claude', 'CLAUDE.md'), claudeMd)

    await fs.writeFile(path.join(tmp, '.claude', 'progress.txt'), 'gotcha 1')

    // Run init
    const result = await runInit([], { cwd: tmp, log: () => {} })
    expect(result.kind).toBe('ok')

    // CA-02: CLAUDE.md byte-idêntico
    const after = await fs.readFile(path.join(tmp, '.claude', 'CLAUDE.md'), 'utf8')
    expect(after).toBe(claudeMd)
    expect(after.split('\n')).toHaveLength(533)

    // Manifest com entries corretas
    const manifest = await readManifest(tmp)
    // planning entry presente (Step 2 detectou .claude/planning/)
    expect(manifest.legacy.find((e) => e.type === 'planning')?.action).toBe('moved')
    // claude-md preserved com 533 linhas
    expect(manifest.legacy.find((e) => e.type === 'claude-md')?.lines).toBe(533)
    // progress.txt como compound reference-only
    expect(manifest.legacy.find((e) => e.type === 'compound')?.sourcePath).toBe('.claude/progress.txt')
    // DI-Plano02-fase04-no-docs-specs-assert: NAO verificar docs/specs/ (migratePlanning lê de BACKUP_DIR)
  })
})
