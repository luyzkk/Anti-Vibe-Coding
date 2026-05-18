import { expect, test, describe } from 'bun:test'
import type { MergeProposal, TransformAction, MoveAction, BlockedAction } from './merge-proposal-types'

// Type-only tests — verify structural contracts compile and discriminated union kinds are correct.
// No runtime logic exists in this module, so tests focus on shape compliance.

describe('merge-proposal-types', () => {
  test('MoveAction has correct discriminant kind', () => {
    const action: MoveAction = {
      kind: 'move',
      source: 'OLD.md',
      target: 'docs/SECURITY.md',
      orphan: false,
    }
    expect(action.kind).toBe('move')
  })

  test('BlockedAction has correct discriminant kind and reason', () => {
    const action: BlockedAction = {
      kind: 'blocked',
      source: 'SECRET.md',
      reason: 'secret-detected',
      secretKind: 'aws-key',
    }
    expect(action.kind).toBe('blocked')
    expect(action.reason).toBe('secret-detected')
  })

  test('TransformAction has correct discriminant kind and target', () => {
    const action: TransformAction = {
      kind: 'transform',
      source: 'CLAUDE.md',
      target: 'CLAUDE_MD_MIRROR',
      blocks: [{ heading: '## Security', destination: 'docs/SECURITY.md' }],
    }
    expect(action.kind).toBe('transform')
    expect(action.target).toBe('CLAUDE_MD_MIRROR')
  })

  test('MergeProposal aggregates all action kinds', () => {
    const proposal: MergeProposal = {
      transforms: [],
      moves: [],
      blocked: [],
    }
    expect(proposal.transforms).toHaveLength(0)
    expect(proposal.moves).toHaveLength(0)
    expect(proposal.blocked).toHaveLength(0)
  })
})
