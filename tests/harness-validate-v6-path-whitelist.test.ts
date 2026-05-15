import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

// Testa a regra `v6-path-whitelist` em scripts/harness-validate.ts (nao no .tpl —
// regra e plugin-only). Cada caso monta um fixture isolado em os.tmpdir() com o
// scaffold minimo de required-files + skills/templates contendo (ou nao) violacoes.

const SCRIPT = path.join(import.meta.dir, '..', 'scripts', 'harness-validate.ts')

const MINIMAL_AGENTS = `# Agent

This is the agent index.

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)
- [docs/MERGE_GATES.md](./docs/MERGE_GATES.md)
- [docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md)
- [docs/review-checklists/](./docs/review-checklists/)
- [docs/smoke-flows/](./docs/smoke-flows/)
`

const QUALITY_SCORE_HEADER = `# Quality Score

| Area | Score | Notes | Next Action |
|------|-------|-------|-------------|
| placeholder | 5 | seed row | none |
`

async function runValidator(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', SCRIPT], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += String(d) })
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

async function setupMinimalFixture(fixture: string): Promise<void> {
  const files: ReadonlyArray<readonly [string, string]> = [
    ['AGENTS.md', MINIMAL_AGENTS],
    ['ARCHITECTURE.md', '# Architecture\n'],
    ['CLAUDE.md', MINIMAL_AGENTS],
    ['README.md', '# Project\n'],
    ['package.json', '{"name":"x","version":"0.0.1"}'],
    ['.github/pull_request_template.md', '# PR\n'],
    ['docs/DESIGN.md', '# Design\n'],
    ['docs/FRONTEND.md', '# Frontend\n'],
    ['docs/PLANS.md', '# Plans\n'],
    ['docs/PRODUCT_SENSE.md', '# Product Sense\n'],
    ['docs/QUALITY_SCORE.md', QUALITY_SCORE_HEADER],
    ['docs/MERGE_GATES.md', '# Merge Gates\n'],
    ['docs/RELIABILITY.md', '# Reliability\n'],
    ['docs/SECURITY.md', '# Security\n'],
    ['docs/COMPOUND_ENGINEERING.md', '# Compound\n'],
    ['docs/review-checklists/index.md', '# Review Checklists\n'],
    ['docs/smoke-flows/index.md', '# Smoke Flows\n'],
    ['docs/STATE.md', '# State\n'],
    ['docs/design-docs/index.md', '# Design Docs\n'],
    ['docs/design-docs/core-beliefs.md', '# Core Beliefs\n'],
    ['docs/exec-plans/active/README.md', '# Active Plans\n'],
    ['docs/exec-plans/completed/README.md', '# Completed Plans\n'],
    ['docs/exec-plans/tech-debt-tracker.md', '# Tech Debt\n'],
    ['docs/generated/db-schema.md', '# DB Schema\n'],
    ['docs/product-specs/index.md', '# Product Specs\n'],
    ['docs/references/README.md', '# References\n'],
    ['scripts/harness-validate.ts', '// placeholder — script real e invocado via SCRIPT absoluto\n'],
    ['scripts/compound-check.ts', '// placeholder\n'],
  ]
  for (const [rel, body] of files) {
    const full = path.join(fixture, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, body, 'utf8')
  }
}

describe('harness-validate v6-path-whitelist', () => {
  let fixture: string

  beforeEach(async () => {
    fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-v6-whitelist-'))
    await setupMinimalFixture(fixture)
  })

  afterEach(async () => {
    await fs.rm(fixture, { recursive: true, force: true })
  })

  it('passes when no skills/ or templates/ directories exist (plugin-only check)', async () => {
    const r = await runValidator(fixture)
    expect(r.code).toBe(0)
  })

  it('passes when skills/ contains no .planning/ references', async () => {
    await fs.mkdir(path.join(fixture, 'skills/foo'), { recursive: true })
    await fs.writeFile(
      path.join(fixture, 'skills/foo/SKILL.md'),
      '---\nname: foo\n---\n\n# Foo\n\nWrite to docs/exec-plans/active/{slug}.md\n',
      'utf8',
    )
    const r = await runValidator(fixture)
    expect(r.code).toBe(0)
  })

  it('fails when skills/<offender>/SKILL.md references .planning/', async () => {
    await fs.mkdir(path.join(fixture, 'skills/offender'), { recursive: true })
    await fs.writeFile(
      path.join(fixture, 'skills/offender/SKILL.md'),
      '---\nname: offender\n---\n\n# Offender\n\nWrite to .planning/{date}-{slug}/PRD.md\n',
      'utf8',
    )
    const r = await runValidator(fixture)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('v6-path-whitelist')
    expect(r.stderr).toContain('skills/offender/SKILL.md')
  })

  it('passes when whitelisted file (skills/init/**) references .planning/', async () => {
    await fs.mkdir(path.join(fixture, 'skills/init'), { recursive: true })
    await fs.writeFile(
      path.join(fixture, 'skills/init/SKILL.md'),
      '---\nname: init\n---\n\n# Init\n\nMigrate .planning/ to docs/exec-plans/active/\n',
      'utf8',
    )
    const r = await runValidator(fixture)
    expect(r.code).toBe(0)
  })

  it('passes when whitelisted file (skills/lib/legacy-*.md) references .planning/', async () => {
    await fs.mkdir(path.join(fixture, 'skills/lib'), { recursive: true })
    await fs.writeFile(
      path.join(fixture, 'skills/lib/legacy-migrator.md'),
      '# Legacy Migrator\n\nReads from .planning/ then writes to docs/exec-plans/\n',
      'utf8',
    )
    const r = await runValidator(fixture)
    expect(r.code).toBe(0)
  })

  it('passes when whitelisted Step 0 file (plan-feature SKILL.md) references .planning/', async () => {
    await fs.mkdir(path.join(fixture, 'skills/plan-feature'), { recursive: true })
    await fs.writeFile(
      path.join(fixture, 'skills/plan-feature/SKILL.md'),
      '---\nname: plan-feature\n---\n\n# Plan Feature\n\nStep 0: detect .planning/ legacy and offer migration\n',
      'utf8',
    )
    const r = await runValidator(fixture)
    expect(r.code).toBe(0)
  })

  it('fails when templates/<file>.md references .planning/', async () => {
    await fs.mkdir(path.join(fixture, 'templates'), { recursive: true })
    await fs.writeFile(
      path.join(fixture, 'templates/SUMMARY.md'),
      '# Summary\n\n**Plan:** `.planning/PLAN-{name}.md`\n',
      'utf8',
    )
    const r = await runValidator(fixture)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('v6-path-whitelist')
    expect(r.stderr).toContain('templates/SUMMARY.md')
  })

  it('ignores .planning.v5-backup (different namespace)', async () => {
    await fs.mkdir(path.join(fixture, 'skills/foo'), { recursive: true })
    await fs.writeFile(
      path.join(fixture, 'skills/foo/SKILL.md'),
      '---\nname: foo\n---\n\n# Foo\n\nBackup goes to .planning.v5-backup/ (not v5 active path)\n',
      'utf8',
    )
    const r = await runValidator(fixture)
    expect(r.code).toBe(0)
  })
})
