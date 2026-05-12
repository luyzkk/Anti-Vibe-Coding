// 2026-05-12 (Luiz/dev): tracer bullet do Plano 03 — CA-09 verbatim.
// Fixture legacy-v5 → orchestrateMigration → harness:validate exit 0.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { orchestrateMigration } from '../../skills/init/lib/migrate-orchestrator'
import { renderDryRunReport } from '../../skills/init/lib/dry-run-renderer'

const FIXTURE_SOURCE = path.join(import.meta.dir, '..', 'fixtures', 'legacy-v5')
const FIXTURE_RUN = path.join(import.meta.dir, '..', 'fixtures', '__legacy-v5-e2e-run')

async function copyFixture(src: string, dst: string): Promise<void> {
  await fs.rm(dst, { recursive: true, force: true })
  await fs.mkdir(dst, { recursive: true })
  await fs.cp(src, dst, { recursive: true })
}

function runValidator(targetDir: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const validatorPath = path.join(import.meta.dir, '..', '..', 'scripts', 'harness-validate.ts')
    const proc = spawn('bun', ['run', validatorPath], {
      cwd: targetDir,
      env: { ...process.env },
    })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += String(d) })
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('close', (code) => resolve({ exitCode: code ?? -1, stdout, stderr }))
  })
}

describe('E2E: fixture legacy-v5 → /init migrate → harness:validate (CA-09)', () => {
  beforeEach(async () => {
    await copyFixture(FIXTURE_SOURCE, FIXTURE_RUN)
  })

  afterEach(async () => {
    await fs.rm(FIXTURE_RUN, { recursive: true, force: true })
  })

  it('CA-09: migrates fixture legacy-v5 → state v6 validated', async () => {
    const report = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })

    // 1. Backup criado
    expect(report.backup.status).toBe('created')
    const backupExists = await fs.access(path.join(FIXTURE_RUN, '.planning.v5-backup')).then(() => true).catch(() => false)
    expect(backupExists).toBe(true)

    // 2. .planning/ original deletada (G-A1)
    const originalExists = await fs.access(path.join(FIXTURE_RUN, '.planning')).then(() => true).catch(() => false)
    expect(originalExists).toBe(false)

    // 3. docs/exec-plans/active/ populado
    const baselineExists = await fs.access(path.join(FIXTURE_RUN, 'docs', 'exec-plans', 'active', 'baseline.md'))
      .then(() => true).catch(() => false)
    expect(baselineExists).toBe(true)

    // 4. docs/product-specs/ populado
    const prdExists = await fs.access(path.join(FIXTURE_RUN, 'docs', 'product-specs', '2026-04-21-feature-x.md'))
      .then(() => true).catch(() => false)
    expect(prdExists).toBe(true)

    // 5. docs/compound/ tem 3 lessons (1 formato A + 2 formato B)
    const compoundFiles = await fs.readdir(path.join(FIXTURE_RUN, 'docs', 'compound'))
    expect(compoundFiles.filter(f => f.endsWith('.md'))).toHaveLength(3)

    // 6. docs/design-docs/ tem 2 ADRs + core-beliefs.md
    const designDocs = await fs.readdir(path.join(FIXTURE_RUN, 'docs', 'design-docs'))
    const adrs = designDocs.filter(f => /^ADR-\d{4}-/.test(f))
    expect(adrs).toHaveLength(2)
    expect(designDocs).toContain('core-beliefs.md')

    // 7. CA-09 final: sanity-check de paths obrigatorios
    // NOTE: validator real depende de Plano 04. Em isolamento do Plano 03,
    // verificamos estrutura de paths obrigatorios.
    const requiredPaths = [
      'docs/exec-plans/active',
      'docs/product-specs',
      'docs/compound',
      'docs/design-docs',
    ]
    for (const rel of requiredPaths) {
      const exists = await fs.access(path.join(FIXTURE_RUN, rel)).then(() => true).catch(() => false)
      expect(exists, `missing: ${rel}`).toBe(true)
    }
  })

  it('CA-09 idempotency: rodar /init migrate 2x = mesmo estado', async () => {
    const first = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    const second = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })

    // Segunda execucao:
    // - Backup: already-exists
    expect(second.backup.status).toBe('already-exists')
    // - Lessons: tudo skipped
    expect(second.lessons.skipped.length).toBe(first.lessons.written.length)
    expect(second.lessons.written).toHaveLength(0)
    // - Decisions: tudo skipped
    expect(second.decisions.written).toHaveLength(0)
  })

  it('CA-10: --dry-run preview does not mutate, real run succeeds afterwards', async () => {
    const preview = await orchestrateMigration(FIXTURE_RUN, { dryRun: true })
    expect(preview.dryRun).toBe(true)
    const rendered = renderDryRunReport(preview)
    expect(rendered).toContain('DRY RUN')

    // Nada em disco:
    const docsExists = await fs.access(path.join(FIXTURE_RUN, 'docs')).then(() => true).catch(() => false)
    expect(docsExists).toBe(false)

    // Run real depois funciona:
    const real = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    expect(real.dryRun).toBe(false)
    const docsExistsNow = await fs.access(path.join(FIXTURE_RUN, 'docs')).then(() => true).catch(() => false)
    expect(docsExistsNow).toBe(true)
  })

  it('M8 sizing: migration completes well within 120s budget', async () => {
    const start = Date.now()
    await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(120_000)  // M8 NFR
    // Em fixture pequena, deve ser <5s:
    expect(elapsed).toBeLessThan(5000)
  })

  it('CA-36 rollback prep: backup contains complete v5 state', async () => {
    await orchestrateMigration(FIXTURE_RUN, { dryRun: false })

    // Backup tem tudo que tinha o original:
    const backedUp = [
      '.planning/CONTEXT-baseline.md',
      '.planning/2026-04-21-feature-x/PRD.md',
      '.planning/2026-04-21-feature-x/plano01/fase-01-baseline.md',
      'lessons-learned.md',
      'decisions.md',
      'senior-principles.md',
    ]
    for (const rel of backedUp) {
      const exists = await fs.access(path.join(FIXTURE_RUN, '.planning.v5-backup', rel))
        .then(() => true).catch(() => false)
      expect(exists, `missing in backup: ${rel}`).toBe(true)
    }
  })
})

// NOTE: O teste seguinte so passa quando Plano 01 fase-04 (harness-validate.ts) estiver pronto.
// Em desenvolvimento isolado do Plano 03, mantido como `it.skip` ate Plano 04 mergeado.
describe.skip('E2E + harness:validate (depende de Plano 01 fase-04)', () => {
  it('CA-09 verbatim: validator exit 0 apos migracao', async () => {
    await copyFixture(FIXTURE_SOURCE, FIXTURE_RUN)
    await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    const result = await runValidator(FIXTURE_RUN)
    expect(result.exitCode).toBe(0)
  })
})
