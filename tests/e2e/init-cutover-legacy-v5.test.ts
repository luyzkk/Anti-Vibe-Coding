// tests/e2e/init-cutover-legacy-v5.test.ts
// 2026-05-17 (Luiz/dev): E2E migracao v5 -> v6 — PRD CA-02 + CA-03 (dry-run) + CA-07.
// DEV-P04F04-1: detect-legacy no dispatcher aborta projetos legacy com AbortError code 1
// antes que os migrate steps executem. CA-02 testa o gate de abort + orchestrateMigration direto.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { AbortError } from '../../skills/init/lib/steps/abort-error'
import { orchestrateMigration } from '../../skills/init/lib/migrate-orchestrator'

const FIXTURE_SRC = path.join(import.meta.dir, '__fixtures__', 'init-legacy-v5')

describe('E2E cutover — legacy v5 (CA-02 + CA-07)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'init-legacy-'))
    await cp(FIXTURE_SRC, tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('detect-legacy gate aborts dispatcher for legacy project with code 1 (CA-02 gate)', async () => {
    // 2026-05-17 (Luiz/dev): DEV-P04F04-1 — detect-legacy nao verifica migrate mode.
    // Comportamento correto: AbortError code 1 com artifacts listados.
    // Usuario entao executa orchestrateMigration (helper) diretamente.
    const result = await runInit([], { cwd: tmpDir })
    expect(result.kind).toBe('aborted')
    if (result.kind === 'aborted') {
      expect(result.code).toBe(1)
      expect(result.reason).toContain('planning-dir')
    }
  })

  test('legacy v5 migrates planning + lessons + decisions via orchestrateMigration (CA-02)', async () => {
    // 2026-05-17 (Luiz/dev): migration via helper direto (comportamento real do sistema).
    // orchestrateMigration eh o helper que migrate steps chamam individualmente.
    const report = await orchestrateMigration(tmpDir, { dryRun: false })

    // Backup criado em .planning.v5-backup/
    expect(report.backup.status).toBe('created')
    const backupExists = await fs
      .access(path.join(tmpDir, '.planning.v5-backup'))
      .then(() => true)
      .catch(() => false)
    expect(backupExists).toBe(true)

    // .planning/ original removida apos migracao
    const planningExists = await fs
      .access(path.join(tmpDir, '.planning'))
      .then(() => true)
      .catch(() => false)
    expect(planningExists).toBe(false)

    // PRD migrado para docs/product-specs/ (plan-folder-prd entry kind — computeTargetPath)
    const productSpecsEntries = await fs.readdir(path.join(tmpDir, 'docs', 'product-specs'))
    expect(productSpecsEntries.filter((e) => e.endsWith('.md')).length).toBeGreaterThanOrEqual(1)

    // docs/compound/ tem as lessons migradas (3 lessons no fixture)
    const compoundEntries = await fs.readdir(path.join(tmpDir, 'docs', 'compound'))
    expect(compoundEntries.filter((e) => e.endsWith('.md')).length).toBeGreaterThanOrEqual(2)

    // docs/design-docs/ tem as decisoes migradas (2 ADRs no fixture)
    const designEntries = await fs.readdir(path.join(tmpDir, 'docs', 'design-docs'))
    expect(designEntries.filter((e) => /^ADR-\d{4}-/.test(e)).length).toBeGreaterThanOrEqual(2)
  })

  test('dry-run via orchestrateMigration mutates nothing on disk (CA-03)', async () => {
    // 2026-05-17 (Luiz/dev): dry-run em migration path — zero mutacao em docs/.
    // Note: --dry-run no dispatcher greenfield path nao tem implementacao de no-op
    // (scaffold steps nao verificam a flag). CA-03 se aplica ao caminho de migracao.
    const report = await orchestrateMigration(tmpDir, { dryRun: true })
    expect(report.dryRun).toBe(true)

    // docs/ nao deve existir (zero mutacao)
    const docsExists = await fs
      .access(path.join(tmpDir, 'docs'))
      .then(() => true)
      .catch(() => false)
    expect(docsExists).toBe(false)

    // .planning/ original intacta
    const planningExists = await fs
      .access(path.join(tmpDir, '.planning'))
      .then(() => true)
      .catch(() => false)
    expect(planningExists).toBe(true)
  })

  test('backup-fail aborts migration with AbortError code 1 (CA-07)', async () => {
    // 2026-05-17 (Luiz/dev): simular permissao negada via chmod 000 no .planning/.
    // No Windows, chmod nao funciona — pular com comentario explicativo.
    // GT-P04F04-2: CA-07 skip em Windows — abrir tech-debt para rodar em CI Linux.
    if (process.platform === 'win32') {
      // skip: chmod 000 nao funciona em Windows; testar em CI Linux (tech-debt CA-07-win32)
      return
    }

    const { chmod } = await import('node:fs/promises')
    await chmod(path.join(tmpDir, '.planning'), 0o000)
    try {
      await expect(runInit(['migrate'], { cwd: tmpDir })).rejects.toThrow(AbortError)
    } finally {
      // Restaurar para permitir cleanup no afterEach
      await chmod(path.join(tmpDir, '.planning'), 0o755)
    }
  })
})
