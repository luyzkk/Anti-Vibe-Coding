import { describe, test, expect } from 'bun:test'
import { runLinkClaudeStep, linkClaudeAgentsStep } from './02-link-claude-agents'
import type { LinkResult } from '../symlink-fallback'
import type { StepContext } from './types'

const mkCtx = (flags: Record<string, unknown> = {}, cwd = '/tmp'): StepContext => ({
  cwd, args: [], flags: flags as Record<string, boolean | string>,
})

// 2026-05-17 (Luiz/dev): stub evita mock.module pollution (compound note 2026-05-16).
// LinkResult shape: { tier, targetPath, hookRegistered } — confirmado em symlink-fallback.ts.
const stubLinker =
  (tier: LinkResult['tier']): (() => Promise<LinkResult>) =>
  async () => ({
    tier,
    targetPath: '/tmp/CLAUDE.md',
    hookRegistered: tier === 'copy-with-hook',
  })

describe('linkClaudeAgentsStep (additive-merge branch)', () => {
  test('with --additive-merge: legacy v6.3.x behavior — returns additive summary', async () => {
    const report = await linkClaudeAgentsStep.run(mkCtx({ 'additive-merge': true }))
    expect(report.summary).toMatch(/additive-merge.*v6\.3\.x/)
    expect(report.mutated).toBe(true)
  })

  test('with --additive-merge + --dry-run: simulates without mutating', async () => {
    const report = await linkClaudeAgentsStep.run(mkCtx({ 'additive-merge': true, 'dry-run': true }))
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/dry-run/)
  })

  // 2026-05-19 (Luiz/dev): Plano 01 fase-03 — Step 11 (move-docs-with-stub) removido.
  // Este teste verificava o conteudo do arquivo deletado. Plano 05 fase-04 reescreve os testes E2E/unit.
  test.skip('Step 11 does NOT branch on additive-merge flag', async () => {
    const src = await import('node:fs').then((m) => m.promises.readFile('skills/init/lib/steps/11-move-docs-with-stub.ts', 'utf8'))
    expect(src).not.toMatch(/additive-merge/)
  })
})

describe('linkClaudeAgentsStep', () => {
  test('symlink tier: single log line', async () => {
    const r = await runLinkClaudeStep('/tmp', stubLinker('symlink'))
    expect(r.summary).toBe('Linked via tier: symlink')
    expect(r.mutated).toBe(true)
  })

  test('hardlink tier: single log line', async () => {
    const r = await runLinkClaudeStep('/tmp', stubLinker('hardlink'))
    expect(r.summary).toBe('Linked via tier: hardlink')
    expect(r.mutated).toBe(true)
  })

  test('copy-with-hook tier: two-line summary (CA-08)', async () => {
    const r = await runLinkClaudeStep('/tmp', stubLinker('copy-with-hook'))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('Linked via tier: copy-with-hook')
    expect(lines[1]).toBe(
      'Hook registered in .claude/settings.local.json \u2014 CLAUDE.md will re-sync on edits to AGENTS.md',
    )
  })
})
