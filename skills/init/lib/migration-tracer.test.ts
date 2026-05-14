import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runMigrationTracer } from './migration-tracer'

async function createMigrationFixture(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-tracer-'))

  await fs.mkdir(path.join(dir, 'docs'), { recursive: true })
  await fs.mkdir(path.join(dir, 'docs', 'design-docs'), { recursive: true })
  await fs.writeFile(path.join(dir, 'docs', 'ARCHITECTURE.md'), '# Architecture\n\nConteudo existente.')
  await fs.writeFile(path.join(dir, 'docs', 'API.md'), '# API Docs\n\nEndpoints.')
  await fs.writeFile(path.join(dir, 'docs', 'design-docs', 'ADR-001-escolha-de-framework.md'), '# ADR-001')
  await fs.writeFile(path.join(dir, 'docs', 'design-docs', 'ADR-002-banco-de-dados.md'), '# ADR-002')
  await fs.writeFile(path.join(dir, 'docs', 'DEPLOYMENT.md'), '# Deploy guide')
  await fs.writeFile(path.join(dir, 'docs', 'ONBOARDING.md'), '# Onboarding')

  return dir
}

describe('runMigrationTracer', () => {
  let fixture: string

  beforeEach(async () => {
    fixture = await createMigrationFixture()
  })

  afterEach(async () => {
    await fs.rm(fixture, { recursive: true, force: true })
  })

  it('returns ok status for a migration-mode repo', async () => {
    const result = await runMigrationTracer(fixture)
    expect(result.status).toBe('ok')
  })

  it('creates migration plan file in docs/exec-plans/active/', async () => {
    const result = await runMigrationTracer(fixture)
    expect(result.planPath).toBeTruthy()
    const exists = await fs.access(result.planPath!).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('migration plan has all 10 sections from new-plan.ts template', async () => {
    const result = await runMigrationTracer(fixture)
    const content = await fs.readFile(result.planPath!, 'utf8')
    const requiredSections = [
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
    ]
    for (const section of requiredSections) {
      expect(content).toContain(section)
    }
  })

  it('writes .anti-vibe-manifest.json with initMode migration', async () => {
    const result = await runMigrationTracer(fixture)
    expect(result.manifestPath).toBeTruthy()
    const raw = await fs.readFile(result.manifestPath!, 'utf8')
    const manifest = JSON.parse(raw)
    expect(manifest.initMode).toBe('migration')
  })

  it('manifest includes installedAt ISO timestamp', async () => {
    const result = await runMigrationTracer(fixture)
    const raw = await fs.readFile(result.manifestPath!, 'utf8')
    const manifest = JSON.parse(raw)
    expect(typeof manifest.installedAt).toBe('string')
    expect(new Date(manifest.installedAt).getFullYear()).toBeGreaterThanOrEqual(2026)
  })

  it('returns wrong-mode error when project is not in migration mode', async () => {
    const greenDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-green-'))
    try {
      const result = await runMigrationTracer(greenDir)
      expect(result.status).toBe('wrong-mode')
      if (result.status === 'wrong-mode') {
        expect(result.detectedMode).not.toBe('migration')
      }
    } finally {
      await fs.rm(greenDir, { recursive: true, force: true })
    }
  })
})
