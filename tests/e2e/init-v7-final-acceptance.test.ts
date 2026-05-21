// tests/e2e/init-v7-final-acceptance.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-05 — contrato vivo dos CAs do PRD init-refactor-v7.
// Cobre CA-01..CA-09 (9 testes nomeados) + 1 NFR perf.

import { test, expect, describe, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'

describe('e2e: init v7 — acceptance criteria suite (PRD CA-01..CA-09)', () => {
  let cwd: string

  afterEach(async () => {
    if (cwd) await fs.rm(cwd, { recursive: true, force: true })
  })

  test('CA-01: greenfield Node-TS init creates 16 PLAN.md + .github files + 4 AVC docs', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })

    // 16 PLAN.md em docs/exec-plans/active/{date}-populate-*/
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const populateDirs = (await fs.readdir(activeDir)).filter((e) => e.includes('-populate-'))
    expect(populateDirs.length).toBe(16)

    // 4 docs extras AVC presentes (RF-12)
    for (const doc of ['docs/MERGE_GATES.md', 'docs/CODE_STYLE.md', 'docs/STATE.md', '.claude/CLAUDE.md']) {
      const stat = await fs.stat(path.join(cwd, doc)).catch(() => null)
      expect(stat?.isFile(), `${doc} should exist`).toBe(true)
    }

    // 2 .github files
    for (const gh of ['.github/workflows/harness.yml', '.github/pull_request_template.md']) {
      const stat = await fs.stat(path.join(cwd, gh)).catch(() => null)
      expect(stat?.isFile(), `${gh} should exist`).toBe(true)
    }
  })

  test('CA-02: pre-existing .claude/CLAUDE.md is byte-identical after init (NEVER overwritten)', async () => {
    cwd = await copyFixtureToTmp('v7-with-claude-md')
    const before = await fs.readFile(path.join(cwd, '.claude/CLAUDE.md'), 'utf8')
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })
    const after = await fs.readFile(path.join(cwd, '.claude/CLAUDE.md'), 'utf8')
    expect(after).toBe(before)
  })

  test('CA-03: planning migrated to .claude/legacy-manifest.json with entries', async () => {
    // 2026-05-21 (Luiz/dev): reusa fixture com .planning/ legacy.
    cwd = await copyFixtureToTmp('v7-with-legacy')
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })

    const manifestPath = path.join(cwd, '.claude/legacy-manifest.json')
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as { legacy: unknown[] }
    expect(Array.isArray(manifest.legacy)).toBe(true)
    expect(manifest.legacy.length).toBeGreaterThan(0)
  })

  test('CA-04: Rails greenfield → FRONTEND plan contains app/views and app/assets', async () => {
    cwd = await copyFixtureToTmp('v7-populate-rails')
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })

    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const frontendDir = (await fs.readdir(activeDir)).find((d) =>
      d.endsWith('populate-docs-frontend-md'),
    )
    expect(frontendDir).toBeDefined()
    const content = await fs.readFile(path.join(activeDir, frontendDir!, 'PLAN.md'), 'utf8')
    expect(content).toContain('app/views')
    expect(content).toContain('app/assets')
    expect(content).not.toContain('src/components')
  })

  test('CA-05: greenfield without legacy → manifest.legacy is empty array', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })

    const manifestPath = path.join(cwd, '.claude/legacy-manifest.json')
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as { legacy: unknown[] }
    expect(manifest.legacy).toEqual([])
  })

  test('CA-06: delivery-loop asks BEFORE modifying AGENTS.md (interactive contract)', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')

    // 2026-05-21 (Luiz/dev): inject askUser stub que captura estado de AGENTS.md no momento do prompt.
    // CA-06: AGENTS.md ja existe (Step 5 escreveu) mas SEM secao Delivery Loop ainda.
    let agentsMdAtAskTime: string | null = null
    const askUser = async (_prompt: string): Promise<string> => {
      try {
        agentsMdAtAskTime = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
      } catch {
        agentsMdAtAskTime = ''
      }
      return 'N'
    }

    await runInit([], { cwd, askUser, log: () => {} })

    expect(agentsMdAtAskTime).not.toBeNull()
    expect(agentsMdAtAskTime).not.toContain('## Delivery Loop')
    // Apos init (answer='N'), AGENTS.md continua sem Delivery Loop
    const after = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(after).not.toContain('## Delivery Loop')
  })

  test('CA-07: every generated PLAN.md has exactly 10 H2 sections in canonical order', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })

    const EXPECTED = [
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
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const dirs = (await fs.readdir(activeDir)).filter((e) => e.includes('-populate-'))
    for (const dir of dirs) {
      const content = await fs.readFile(path.join(activeDir, dir, 'PLAN.md'), 'utf8')
      const sections = content.split('\n').filter((l) => l.startsWith('## '))
      expect(sections, `Plan ${dir} sections`).toEqual(EXPECTED)
    }
  })

  test('CA-08: re-run is blocked by reentry-gate (DR-1)', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })

    // 2026-05-21 (Luiz/dev): runInit retorna { kind: 'aborted', code, reason } — NAO lanca (DI-Plano04-fase05).
    // Code 10 reservado para reentry-gate (01-reentry-gate.ts linha 23).
    const result = await runInit([], { cwd, askUser: async () => 'N', log: () => {} })
    expect(result.kind).toBe('aborted')
    expect((result as { kind: 'aborted'; code: number }).code).toBe(10)
  })

  test('CA-09: zero refs to deleted v6.7 step names in skills/init/lib/', async () => {
    // 2026-05-21 (Luiz/dev): grep-gate inline — defesa em profundidade.
    // O script scripts/grep-deleted-steps.ts faz a mesma verificacao em CI.
    const { $ } = await import('bun')
    const scriptPath = path.join(import.meta.dir, '..', '..', 'scripts', 'grep-deleted-steps.ts')
    const result = await $`bun ${scriptPath}`.quiet().nothrow()
    expect(result.exitCode).toBe(0)
  })

  test('NFR Performance: init completes in < 30s on Node greenfield fixture', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    const start = performance.now()
    await runInit([], { cwd, askUser: async () => 'N', log: () => {} })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(30_000)
  })
})
