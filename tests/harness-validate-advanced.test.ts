import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'harness-advanced')
const SCRIPT_SRC = path.join(
  import.meta.dir, '..',
  'skills/init/assets/templates/scripts/harness-validate.ts.tpl',
)

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

const MINIMAL_AGENTS = `# Agent

This is the agent index.

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)
`

async function setupValidFixture(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  const all: ReadonlyArray<readonly [string, string]> = [
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
  ]
  for (const [rel, body] of all) {
    const full = path.join(FIXTURE, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, body, 'utf8')
  }
  await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
  // harness-validate.ts deve ser auto-referenciado como required
  await fs.copyFile(SCRIPT_SRC, path.join(FIXTURE, 'scripts', 'harness-validate.ts'))
  // compound-check.ts placeholder
  await fs.writeFile(path.join(FIXTURE, 'scripts', 'compound-check.ts'), '// placeholder\n', 'utf8')
}

describe('harness-validate advanced', () => {
  beforeEach(setupValidFixture)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('exits 0 on minimally valid full scaffold', async () => {
    const r = await runValidator(FIXTURE)
    if (r.code !== 0) {
      console.log('STDERR:', r.stderr)
    }
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('required files')
  })

  it('CA-27 (regressao do minimal): exits 1 when AGENTS.md > 40 lines', async () => {
    const fat = '# Agent\n'
      + Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
      + '\n[ARCHITECTURE.md](./ARCHITECTURE.md)\n[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)\n[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)\n'
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), fat, 'utf8')
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('40 lines or fewer')
  })

  it('CA-28: exits 1 on orphan active plan', async () => {
    const plan = `# Plan: test feature

## Exit Criteria
- [x] All tests pass
- [x] Lint clean

## Validation Log
harness:validate ✅
`
    await fs.writeFile(path.join(FIXTURE, 'docs/exec-plans/active/2026-05-12-feat.md'), plan, 'utf8')
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('orphan-active-plan')
    expect(r.stderr).toContain('2026-05-12-feat.md')
  })

  it('does NOT flag plan with pending work as orphan', async () => {
    const plan = `# Plan: test feature

## Exit Criteria
- [x] One done

## Remaining work
- [ ] Other thing
`
    await fs.writeFile(path.join(FIXTURE, 'docs/exec-plans/active/2026-05-12-pending.md'), plan, 'utf8')
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(0)
  })

  it('exits 1 on broken relative link in any .md', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'docs/DESIGN.md'),
      '# Design\n\nSee [missing](./does-not-exist.md).\n',
      'utf8',
    )
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('broken-link')
    expect(r.stderr).toContain('does-not-exist.md')
  })

  it('exits 1 when AGENTS.md missing required link to ARCHITECTURE.md', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'AGENTS.md'),
      '# Agent\n\n- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)\n- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)\n',
      'utf8',
    )
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('agents-links')
    expect(r.stderr).toContain('ARCHITECTURE.md')
  })

  it('G10: ignores files under _archived/ when checking links', async () => {
    await fs.mkdir(path.join(FIXTURE, 'docs/compound/_archived'), { recursive: true })
    await fs.writeFile(
      path.join(FIXTURE, 'docs/compound/_archived/old.md'),
      '# Old\n\n[gone](./missing.md)\n',
      'utf8',
    )
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(0) // _archived nao crawla
  })
})
