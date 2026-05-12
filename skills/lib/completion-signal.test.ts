// 2026-05-12 (Luiz/dev): suite de testes para completion-signal — D33/S12/CA-47
import { describe, it, expect } from 'bun:test'
import { renderCompletionSignal, extractCompletionSignal } from './completion-signal'

describe('renderCompletionSignal', () => {
  it('returns parseable YAML block with required fields', () => {
    const block = renderCompletionSignal({
      skill: 'grill-me',
      status: 'complete',
      outputs: ['./.planning/foo/CONTEXT.md'],
      next_suggested: '/write-prd',
      blocks_for_user: [],
    })
    expect(block.startsWith('```yaml\n')).toBe(true)
    expect(block.endsWith('```')).toBe(true)
    const parsed = extractCompletionSignal(block)
    expect(parsed).not.toBeNull()
    expect(parsed?.skill).toBe('grill-me')
    expect(parsed?.status).toBe('complete')
    expect(parsed?.outputs).toEqual(['./.planning/foo/CONTEXT.md'])
    expect(parsed?.next_suggested).toBe('/write-prd')
  })

  it('rejects status=complete with non-empty blocks_for_user', () => {
    expect(() =>
      renderCompletionSignal({
        skill: 'foo',
        status: 'complete',
        outputs: [],
        next_suggested: null,
        blocks_for_user: ['precisa de input X'],
      })
    ).toThrow(/blocks_for_user vazio/)
  })

  it('truncates blocks_for_user strings longer than 80 chars', () => {
    const longInput = 'x'.repeat(120)
    const block = renderCompletionSignal({
      skill: 'foo',
      status: 'blocked',
      outputs: [],
      next_suggested: null,
      blocks_for_user: [longInput],
    })
    const parsed = extractCompletionSignal(block)
    const firstBlock = parsed?.blocks_for_user[0]
    expect(firstBlock).toBeDefined()
    // noUncheckedIndexedAccess: narrow before use
    if (firstBlock !== undefined) {
      expect(firstBlock.length).toBeLessThanOrEqual(80)
      expect(firstBlock.endsWith('...')).toBe(true)
    }
  })

  it('accepts null next_suggested', () => {
    const block = renderCompletionSignal({
      skill: 'lessons-learned',
      status: 'complete',
      outputs: ['./docs/compound/2026-05-11-foo.md'],
      next_suggested: null,
      blocks_for_user: [],
    })
    const parsed = extractCompletionSignal(block)
    expect(parsed?.next_suggested).toBeNull()
  })
})

describe('extractCompletionSignal', () => {
  it('returns null when no yaml block present', () => {
    expect(extractCompletionSignal('plain text output')).toBeNull()
  })

  it('extracts last yaml block when multiple present', () => {
    const output = `
some output

\`\`\`yaml
skill: didactic-example
status: complete
outputs: []
next_suggested: null
blocks_for_user: []
\`\`\`

more output

\`\`\`yaml
skill: actual-signal
status: complete
outputs: ['./foo.md']
next_suggested: null
blocks_for_user: []
\`\`\`
`
    const parsed = extractCompletionSignal(output)
    expect(parsed?.skill).toBe('actual-signal')
  })

  it('returns null on malformed yaml', () => {
    expect(extractCompletionSignal('```yaml\nnot: valid: yaml:\n```')).toBeNull()
  })
})
