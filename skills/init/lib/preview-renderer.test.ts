import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { renderMergePreview, type MergePreview } from './preview-renderer'

describe('renderMergePreview', () => {
  it('renders representative fixture matching golden snapshot', async () => {
    // 2026-05-18 (Luiz/dev): fixture replicando UX Flow item 6 do PRD — CA-07 + CA-13
    const fixture: MergePreview = {
      claudeMd: {
        originalLines: 287,
        finalLines: 36,
        akitaBlocks: [
          { title: 'Code Style', target: 'docs/DESIGN.md (secao Code Style)' },
          { title: 'Tests', target: 'docs/DESIGN.md (secao Tests)' },
          { title: 'Security', target: 'docs/SECURITY.md' },
          { title: 'Environment', target: 'ARCHITECTURE.md (secao Environment)' },
        ],
      },
      docMoves: [
        { from: 'docs/ARQUITETURA.md', to: 'docs/ARCHITECTURE.md', action: 'move' },
        { from: 'docs/STRIPE_INTEGRATION.md', to: 'docs/references/STRIPE_INTEGRATION.md', action: 'move' },
        { from: 'CONTRIBUTING.md', to: 'docs/references/CONTRIBUTING.md', action: 'move' },
        { from: '.claude/memory/notes.md', to: 'docs/compound/2026-05-18-notes-import.md', action: 'reference' },
      ],
      blockedBySecrets: [
        { path: 'docs/STRIPE_INTEGRATION.md', reason: "contem 'sk_live_*' — move bloqueado ate aprovacao manual" },
      ],
      backupTimestamp: '2026-05-18-143000',
    }
    const goldenPath = path.join(import.meta.dir, 'steps', '__golden__', 'preview-renderer', 'aggregated-diff.txt')
    const expected = await fs.readFile(goldenPath, 'utf8')
    const actual = renderMergePreview(fixture)
    expect(actual.trim()).toBe(expected.trim())
  })

  it('omits docMoves section when empty', () => {
    const empty: MergePreview = {
      claudeMd: { originalLines: 100, finalLines: 36, akitaBlocks: [] },
      docMoves: [],
      blockedBySecrets: [],
      backupTimestamp: '2026-05-18-143000',
    }
    const output = renderMergePreview(empty)
    expect(output).not.toContain('Docs existentes')
    expect(output).toContain('CLAUDE.md (existente, 100 linhas)')
  })

  it('omits secrets section when empty', () => {
    const noSecrets: MergePreview = {
      claudeMd: { originalLines: 100, finalLines: 36, akitaBlocks: [] },
      docMoves: [{ from: 'a.md', to: 'b.md', action: 'move' }],
      blockedBySecrets: [],
      backupTimestamp: '2026-05-18-143000',
    }
    const output = renderMergePreview(noSecrets)
    expect(output).not.toContain('Secrets detectados')
  })
})
