import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'validator')

async function runValidator(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/harness-validate.ts')], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += String(d) })
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

describe('harness-validate (minimal)', () => {
  beforeEach(async () => {
    await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
    // copiar validator real
    await fs.copyFile(
      path.join(import.meta.dir, '..', 'skills/init/assets/templates/scripts/harness-validate.ts.tpl'),
      path.join(FIXTURE, 'scripts/harness-validate.ts')
    )
  })

  afterEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
  })

  it('exits 1 when AGENTS.md has 50 lines (CA-27)', async () => {
    const lines = Array.from({ length: 50 }, (_, i) => `# Line ${i}`).join('\n')
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), lines, 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'ARCHITECTURE.md'), '# Architecture\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), lines, 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('40 lines or fewer')
  })

  it('exits 0 when AGENTS.md is small and all required files exist', async () => {
    // 2026-05-12 (Luiz/dev): GT-03 — validator expandido para 25 required-files em Plano 04 fase-03.
    // Fixture atualizada para incluir todos os arquivos obrigatorios.
    const agentsContent = '# Agent\n\n- [ARCHITECTURE.md](./ARCHITECTURE.md)\n- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)\n- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)\n'
    const files: ReadonlyArray<readonly [string, string]> = [
      ['AGENTS.md', agentsContent],
      ['ARCHITECTURE.md', '# Architecture\n'],
      ['CLAUDE.md', agentsContent],
      ['README.md', '# Project\n'],
      ['package.json', '{"name":"x","version":"0.0.1"}'],
      ['.github/pull_request_template.md', '# PR\n'],
      ['docs/DESIGN.md', '# Design\n'],
      ['docs/FRONTEND.md', '# Frontend\n'],
      ['docs/PLANS.md', '# Plans\n'],
      ['docs/PRODUCT_SENSE.md', '# Product Sense\n'],
      ['docs/QUALITY_SCORE.md', '# Quality Score\n'],
      ['docs/RELIABILITY.md', '# Reliability\n'],
      ['docs/SECURITY.md', '# Security\n'],
      ['docs/COMPOUND_ENGINEERING.md', '# Compound\n'],
      ['docs/STATE.md', '# State\n'],
      ['docs/design-docs/index.md', '# Design Docs\n'],
      ['docs/design-docs/core-beliefs.md', '# Core Beliefs\n'],
      ['docs/exec-plans/active/README.md', '# Active Plans\n'],
      ['docs/exec-plans/completed/README.md', '# Completed Plans\n'],
      ['docs/exec-plans/tech-debt-tracker.md', '# Tech Debt\n'],
      ['docs/generated/db-schema.md', '# DB Schema\n'],
      ['docs/product-specs/index.md', '# Product Specs\n'],
      ['docs/references/README.md', '# References\n'],
      ['scripts/compound-check.ts', '// placeholder\n'],
    ]
    for (const [rel, body] of files) {
      const full = path.join(FIXTURE, rel)
      await fs.mkdir(path.dirname(full), { recursive: true })
      await fs.writeFile(full, body, 'utf8')
    }

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Harness validation passed')
  })

  it('exits 1 when ARCHITECTURE.md is missing', async () => {
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), '# Agent\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), '# Agent\n', 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('Missing required file: ARCHITECTURE.md')
  })
})
