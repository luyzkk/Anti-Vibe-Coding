// 2026-05-11 (Luiz/dev): cobre RED da fase-04 + frontmatter contract.

import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { migrateLessons } from './migrate-lessons'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'migrate-lessons')

async function setupBackup(content: string): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  const backupDir = path.join(FIXTURE, '.planning.v5-backup')
  await fs.mkdir(backupDir, { recursive: true })
  await fs.writeFile(path.join(backupDir, 'lessons-learned.md'), content, 'utf8')
}

describe('migrateLessons', () => {
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('creates 1 compound note per lesson (3 lessons → 3 files)', async () => {
    await setupBackup(`
## 2026-03-23: bug A (CORRIGIDO)
**Sintoma:** s
**Fix:** f
**Prevencao:** p

### [Armadilha] grep -c quirk
**Regra:** r
**Contexto:** c

### [Arquitetura] hooks loading
**Regra:** r2
**Contexto:** c2
`)
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(report.status).toBe('completed')
    expect(report.written).toHaveLength(3)
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    expect(files.filter(f => f.endsWith('.md'))).toHaveLength(3)
  })

  it('writes complete YAML frontmatter (CA-29)', async () => {
    await setupBackup(`### [Armadilha] grep quirk\n**Regra:** r\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'compound', files[0]!), 'utf8')
    expect(body).toMatch(/^---\ntitle: /m)
    expect(body).toMatch(/^category: /m)
    expect(body).toMatch(/^tags: \[/m)
    expect(body).toMatch(/^created: 2026-04-21$/m)
    expect(body).toMatch(/\n---\n/)
  })

  it('includes Problem/Solution/Prevention sections', async () => {
    await setupBackup(`## 2026-03-23: bug X\n**Sintoma:** PROB\n**Fix:** SOL\n**Prevencao:** PREV\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'compound', files[0]!), 'utf8')
    expect(body).toContain('## Problem')
    expect(body).toContain('## Solution')
    expect(body).toContain('## Prevention')
    expect(body).toContain('PROB')
    expect(body).toContain('SOL')
    expect(body).toContain('PREV')
  })

  it('uses date from H2 header as filename prefix', async () => {
    await setupBackup(`## 2026-03-23: hooks bug\n**Fix:** x\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    expect(files[0]).toMatch(/^2026-03-23-hooks-bug\.md$/)
  })

  it('is idempotent — re-run skips existing files', async () => {
    await setupBackup(`## 2026-03-23: bug A\n**Fix:** f\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const second = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(second.skipped.some(s => s.reason === 'already-migrated')).toBe(true)
    expect(second.written).toHaveLength(0)
  })

  it('dryRun=true does not write files', async () => {
    await setupBackup(`## 2026-03-23: bug\n**Fix:** f\n`)
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21', dryRun: true })
    expect(report.status).toBe('dry-run')
    const exists = await fs.access(path.join(FIXTURE, 'docs', 'compound')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('returns skipped when no lessons-learned.md in backup', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning.v5-backup'), { recursive: true })
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(report.status).toBe('skipped')
    expect(report.entries).toBe(0)
  })

  it('strips BOM from source', async () => {
    await setupBackup('\uFEFF## 2026-03-23: bommed\n**Fix:** f\n')
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(report.written).toHaveLength(1)
  })
})
