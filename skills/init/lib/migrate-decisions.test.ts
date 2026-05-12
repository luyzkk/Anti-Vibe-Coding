// 2026-05-11 (Luiz/dev): cobre RED da fase-05 + numbering monotonico.

import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { migrateDecisions } from './migrate-decisions'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'migrate-decisions')

async function setupBackup(decisionsContent: string, seniorContent?: string): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  const backupDir = path.join(FIXTURE, '.planning.v5-backup')
  await fs.mkdir(backupDir, { recursive: true })
  await fs.writeFile(path.join(backupDir, 'decisions.md'), decisionsContent, 'utf8')
  if (seniorContent) {
    await fs.writeFile(path.join(backupDir, 'senior-principles.md'), seniorContent, 'utf8')
  }
}

describe('migrateDecisions', () => {
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('creates ADR-0001 for first decision', async () => {
    await setupBackup(`### [Versionamento]: Manifest\n**Data:** 2026-03-23\n**Justificativa:** x\n`)
    const report = await migrateDecisions(FIXTURE)
    expect(report.status).toBe('completed')
    expect(report.written).toHaveLength(1)
    expect(report.written[0]).toMatch(/ADR-0001-versionamento\.md$/)
  })

  it('numbers monotonically across multiple decisions', async () => {
    await setupBackup(`### [A]: 1\n**Data:** 2026-01-01\n\n### [B]: 2\n**Data:** 2026-02-02\n\n### [C]: 3\n**Data:** 2026-03-03\n`)
    const report = await migrateDecisions(FIXTURE)
    expect(report.written).toHaveLength(3)
    expect(report.written[0]).toMatch(/ADR-0001-a\.md$/)
    expect(report.written[1]).toMatch(/ADR-0002-b\.md$/)
    expect(report.written[2]).toMatch(/ADR-0003-c\.md$/)
  })

  it('continues numbering from highest existing ADR (G7)', async () => {
    await setupBackup(`### [Z]: 9\n**Data:** 2026-04-04\n`)
    // Pre-existing ADR-0005 do destino (cenario de re-run parcial):
    await fs.mkdir(path.join(FIXTURE, 'docs', 'design-docs'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'docs', 'design-docs', 'ADR-0005-existing.md'), '---\n', 'utf8')
    const report = await migrateDecisions(FIXTURE)
    expect(report.written[0]).toMatch(/ADR-0006-z\.md$/)  // 5+1
  })

  it('writes complete frontmatter (CA-15 contract)', async () => {
    await setupBackup(`### [V]: m\n**Data:** 2026-03-23\n**Justificativa:** j\n**Risco conhecido:** r\n**Reversibilidade:** Reversível\n`)
    await migrateDecisions(FIXTURE)
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'design-docs'))
    const adr = files.find(f => f.endsWith('.md') && f.startsWith('ADR-'))!
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'design-docs', adr), 'utf8')
    expect(body).toMatch(/^id: ADR-\d{4}$/m)
    expect(body).toMatch(/^title: /m)
    expect(body).toMatch(/^status: accepted$/m)
    expect(body).toMatch(/^date: 2026-03-23$/m)
    expect(body).toMatch(/^tags: \[/m)
  })

  it('includes Context/Decision/Consequences sections', async () => {
    await setupBackup(`### [V]: m\n**Justificativa:** J\n**Risco conhecido:** R\n**Reversibilidade:** Reversível\n`)
    await migrateDecisions(FIXTURE)
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'design-docs'))
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'design-docs', files[0]!), 'utf8')
    expect(body).toContain('## Context')
    expect(body).toContain('## Decision')
    expect(body).toContain('## Consequences')
    expect(body).toContain('Reversível')
  })

  it('is idempotent — re-run skips by slug', async () => {
    await setupBackup(`### [V]: m\n**Data:** 2026-03-23\n`)
    await migrateDecisions(FIXTURE)
    const second = await migrateDecisions(FIXTURE)
    expect(second.skipped.some(s => s.reason === 'already-migrated')).toBe(true)
    expect(second.written).toHaveLength(0)
  })

  it('migrates senior-principles.md → core-beliefs.md (G-A3)', async () => {
    await setupBackup(`### [V]: m\n`, '# Senior Principles\n\nContent here.\n')
    const report = await migrateDecisions(FIXTURE)
    expect(report.coreBeliefs).toBe('created')
    const cb = await fs.readFile(path.join(FIXTURE, 'docs', 'design-docs', 'core-beliefs.md'), 'utf8')
    expect(cb).toContain('Senior Principles')
  })

  it('skips core-beliefs if senior-principles.md absent (G-A3)', async () => {
    await setupBackup(`### [V]: m\n`)
    const report = await migrateDecisions(FIXTURE)
    expect(report.coreBeliefs).toBe('skipped')
  })

  it('dryRun=true writes nothing', async () => {
    await setupBackup(`### [V]: m\n`)
    const report = await migrateDecisions(FIXTURE, { dryRun: true })
    expect(report.status).toBe('dry-run')
    const exists = await fs.access(path.join(FIXTURE, 'docs', 'design-docs')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('returns skipped when decisions.md absent', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning.v5-backup'), { recursive: true })
    const report = await migrateDecisions(FIXTURE)
    expect(report.status).toBe('skipped')
  })
})
