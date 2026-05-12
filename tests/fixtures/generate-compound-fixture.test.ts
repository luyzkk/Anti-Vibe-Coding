// 2026-05-12 (Luiz/dev): testes do gerador de fixture 100-docs — Plano 04 fase-04.
// Verifica que generate-compound-fixture.ts cria estrutura completa e valida.
import { describe, it, expect, afterAll } from 'bun:test'
import { promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'

const GENERATOR = path.resolve(import.meta.dir, 'generate-compound-fixture.ts')
const FIXTURE_DIR = path.resolve(import.meta.dir, 'compound-100-docs-test-run')

afterAll(async () => {
  // G3: cleanup com retry-once em Windows.
  try {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true })
  } catch {
    await new Promise<void>((r) => setTimeout(r, 150))
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true })
  }
})

async function runGenerator(): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', GENERATOR, FIXTURE_DIR], { stdio: 'pipe' })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

describe('generate-compound-fixture', () => {
  it('exits 0 and reports generated counts', async () => {
    const result = await runGenerator()
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('100 compound notes')
    expect(result.stdout).toContain('20 active plans')
    expect(result.stdout).toContain('20 ADRs')
  }, 30_000)

  it('creates all 25 required-files for harness-validate', async () => {
    const requiredFiles = [
      'AGENTS.md',
      'ARCHITECTURE.md',
      'CLAUDE.md',
      'README.md',
      'package.json',
      '.github/pull_request_template.md',
      'docs/DESIGN.md',
      'docs/FRONTEND.md',
      'docs/PLANS.md',
      'docs/PRODUCT_SENSE.md',
      'docs/QUALITY_SCORE.md',
      'docs/RELIABILITY.md',
      'docs/SECURITY.md',
      'docs/COMPOUND_ENGINEERING.md',
      'docs/STATE.md',
      'docs/design-docs/index.md',
      'docs/design-docs/core-beliefs.md',
      'docs/exec-plans/active/README.md',
      'docs/exec-plans/completed/README.md',
      'docs/exec-plans/tech-debt-tracker.md',
      'docs/generated/db-schema.md',
      'docs/product-specs/index.md',
      'docs/references/README.md',
      'scripts/harness-validate.ts',
      'scripts/compound-check.ts',
    ]
    for (const rel of requiredFiles) {
      const exists = await fs.stat(path.join(FIXTURE_DIR, rel)).then(() => true).catch(() => false)
      expect(exists, `required file missing: ${rel}`).toBe(true)
    }
  }, 5_000)

  it('creates exactly 100 compound notes in docs/compound/', async () => {
    const compoundDir = path.join(FIXTURE_DIR, 'docs/compound')
    const entries = await fs.readdir(compoundDir)
    const notes = entries.filter((e) => e.endsWith('.md') && e !== 'README.md')
    expect(notes.length).toBe(100)
  }, 5_000)

  it('creates exactly 20 active plans with pending tasks (not orphans)', async () => {
    const activeDir = path.join(FIXTURE_DIR, 'docs/exec-plans/active')
    const entries = await fs.readdir(activeDir)
    const plans = entries.filter((e) => e.endsWith('.md') && e !== 'README.md')
    expect(plans.length).toBe(20)

    // Verify each has `- [ ]` so orphan detector won't flag them.
    for (const plan of plans) {
      const content = await fs.readFile(path.join(activeDir, plan), 'utf8')
      expect(content, `plan ${plan} should have pending task`).toContain('- [ ]')
    }
  }, 10_000)

  it('is idempotent (second run produces same structure)', async () => {
    const result2 = await runGenerator()
    expect(result2.code).toBe(0)
    const compoundDir = path.join(FIXTURE_DIR, 'docs/compound')
    const entries = await fs.readdir(compoundDir)
    const notes = entries.filter((e) => e.endsWith('.md') && e !== 'README.md')
    expect(notes.length).toBe(100)
  }, 30_000)
})
