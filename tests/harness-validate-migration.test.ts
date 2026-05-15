import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

// Testes chamam harness-validate como processo filho para validar exit code real.
// Não importam o módulo diretamente (standalone script — não tem exports testáveis).
// Exceção: checkAgentContracts e checkMigrationConsistency (exportadas para testabilidade).
import { checkMigrationConsistency } from '../scripts/harness-validate'

describe('harness-validate migration mode', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(tmpdir(), `harness-test-${randomUUID()}`)
    await fs.mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('checkMigrationConsistency emits no failures when all missing slots have active plans', async () => {
    // Simula: AGENTS.md ausente + plan ativo para AGENTS.md
    const activeDir = path.join(tmpDir, 'docs/exec-plans/active')
    await fs.mkdir(activeDir, { recursive: true })
    await fs.writeFile(
      path.join(activeDir, '2026-05-14-agents-md-migration.md'),
      '<!-- migration-slot: AGENTS.md -->\n## Goal\nMigrate `AGENTS.md`\n',
      'utf-8',
    )

    const failures: { rule: string; message: string }[] = []
    const manifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration' as const,
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [
        { id: '2026-05-14-agents-md-migration', slot: 'AGENTS.md', path: 'docs/exec-plans/active/2026-05-14-agents-md-migration.md', status: 'active' as const },
      ],
    }

    await checkMigrationConsistency(failures, manifest, tmpDir, ['AGENTS.md'])
    expect(failures).toHaveLength(0)
  })

  it('checkMigrationConsistency emits error when missing slot has no active plan', async () => {
    const failures: { rule: string; message: string }[] = []
    const manifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration' as const,
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [],
    }

    await checkMigrationConsistency(failures, manifest, tmpDir, ['AGENTS.md'])
    expect(failures.length).toBeGreaterThan(0)
    expect(failures[0]?.rule).toBe('migration-consistency')
  })
})
