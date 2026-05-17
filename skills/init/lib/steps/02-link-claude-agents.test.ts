import { describe, test, expect } from 'bun:test'
import { runLinkClaudeStep } from './02-link-claude-agents'
import type { LinkResult } from '../symlink-fallback'

// 2026-05-17 (Luiz/dev): stub evita mock.module pollution (compound note 2026-05-16).
// LinkResult shape: { tier, targetPath, hookRegistered } — confirmado em symlink-fallback.ts.
const stubLinker =
  (tier: LinkResult['tier']): (() => Promise<LinkResult>) =>
  async () => ({
    tier,
    targetPath: '/tmp/CLAUDE.md',
    hookRegistered: tier === 'copy-with-hook',
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
