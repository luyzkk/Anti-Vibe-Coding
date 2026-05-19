import { describe, expect, test } from 'bun:test'
import { registry } from './registry'
import { proposeMergeBatchStep } from './steps/09-propose-merge-batch'
import { classifyBlocksHybridStep } from './steps/08-classify-blocks-hybrid'
import { applyMergeDestructiveStep } from './steps/10-apply-merge-destructive'
import { moveDocsWithStubStep } from './steps/11-move-docs-with-stub'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'

describe('registry', () => {
  test('all step ids are unique', () => {
    const ids = registry.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // 2026-05-19 (Luiz/dev): MH-01 / CA-07 — Step 91 deve PRECEDER Step 90 (Bug C).
  test('final-validation is the last step', () => {
    expect(registry.at(-1)?.id).toBe('final-validation')
  })

  test('91-generate-populate-plan comes BEFORE final-validation', () => {
    const finalIdx = registry.findIndex(s => s.id === 'final-validation')
    const populateIdx = registry.findIndex(s => s.id === '91-generate-populate-plan')
    expect(populateIdx).toBeGreaterThanOrEqual(0)
    expect(finalIdx).toBeGreaterThan(populateIdx)
  })

  test('positions propose-merge-batch immediately after classify-blocks-hybrid', () => {
    const i08 = registry.indexOf(classifyBlocksHybridStep)
    const i09 = registry.indexOf(proposeMergeBatchStep)
    expect(i09).toBe(i08 + 1)
  })

  test('positions apply-merge-destructive IMMEDIATELY BEFORE link-claude-agents (D23 reorder)', () => {
    const i10 = registry.indexOf(applyMergeDestructiveStep)
    const i02 = registry.indexOf(linkClaudeAgentsStep)
    expect(i10).toBeGreaterThan(-1)
    expect(i02).toBeGreaterThan(-1)
    expect(i10).toBe(i02 - 1)
  })
})
