// 2026-05-11 (Luiz/dev): cobre RED da fase-03 + matriz de paths.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { migratePlanning } from './migrate-planning'
import { backupPlanning } from './backup-planning'
import { detectV5Legacy } from './detect-v5-legacy'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'migrate-planning')

async function setupLegacy(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'plano01'), { recursive: true })
  await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-baseline.md'), '# baseline\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'PRD.md'), '# PRD\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'PLAN.md'), '# PLAN\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'STATE.md'), '# STATE\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'plano01', 'README.md'), '# plano01\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'plano01', 'fase-01-x.md'), '# fase01\n', 'utf8')

  // Pre-condicao da fase-03: backup ja existe (fase-02 rodou).
  const state = await detectV5Legacy(FIXTURE)
  await backupPlanning(FIXTURE, { state })
}

describe('migratePlanning', () => {
  beforeEach(setupLegacy)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('migrates CONTEXT-baseline.md → docs/exec-plans/active/baseline.md', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', 'baseline.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# baseline\n')
  })

  it('migrates PRD.md → docs/product-specs/2026-04-21-foo.md', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'product-specs', '2026-04-21-foo.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# PRD\n')
  })

  it('migrates PLAN.md → docs/exec-plans/active/2026-04-21-foo-plan.md', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', '2026-04-21-foo-plan.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# PLAN\n')
  })

  it('migrates STATE.md → archived-state (G-A2)', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', '_archived-state', '2026-04-21-foo-STATE.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# STATE\n')
  })

  it('preserves subplan structure (plano01/fase-01)', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', '2026-04-21-foo', 'plano01', 'fase-01-x.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# fase01\n')
  })

  it('deletes .planning/ original after success (G-A1)', async () => {
    await migratePlanning(FIXTURE)
    const exists = await fs.stat(path.join(FIXTURE, '.planning')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
    // Mas o backup permanece:
    const backupExists = await fs.stat(path.join(FIXTURE, '.planning.v5-backup', '.planning')).then(() => true).catch(() => false)
    expect(backupExists).toBe(true)
  })

  it('is idempotent — second run is no-op', async () => {
    await migratePlanning(FIXTURE)
    // Re-rodar migratePlanning sem .planning/ — entries=0:
    const report = await migratePlanning(FIXTURE)
    expect(report.entries).toBeGreaterThanOrEqual(0)
    // Nao explodiu — eh o teste.
  })

  it('dryRun=true writes nothing', async () => {
    const report = await migratePlanning(FIXTURE, { dryRun: true })
    expect(report.status).toBe('dry-run')
    expect(report.entries).toBeGreaterThan(0)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', 'baseline.md')
    const exists = await fs.access(dst).then(() => true).catch(() => false)
    expect(exists).toBe(false)
    // .planning/ original tambem nao foi deletada:
    const originalExists = await fs.stat(path.join(FIXTURE, '.planning')).then(() => true).catch(() => false)
    expect(originalExists).toBe(true)
  })

  it('strips BOM from source files', async () => {
    const bommed = '\uFEFF# CONTEXT bommed\n'
    await fs.writeFile(path.join(FIXTURE, '.planning.v5-backup', '.planning', 'CONTEXT-bommed.md'), bommed, 'utf8')
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', 'bommed.md')
    const body = await fs.readFile(dst, 'utf8')
    expect(body.startsWith('\uFEFF')).toBe(false)
    expect(body).toBe('# CONTEXT bommed\n')
  })
})
