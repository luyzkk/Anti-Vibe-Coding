import { describe, it, expect } from 'bun:test'
import { INIT_SUBAGENT_IDS, type InitSubagentId } from './init-subagent-ids'

describe('INIT_SUBAGENT_IDS', () => {
  it('exports all 9 canonical subagent_id entries with non-empty string values', () => {
    const expectedKeys = [
      'secretsScan',
      'discoverDocs',
      'classifyBlocks',
      'proposeMerge',
      'applyMerge',
      'moveDocs',
      'detectDrift',
      'populatePlanGen',
      'rollback',
    ] as const

    expect(Object.keys(INIT_SUBAGENT_IDS)).toHaveLength(9)

    for (const key of expectedKeys) {
      const value = INIT_SUBAGENT_IDS[key]
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    }

    // Type-level check: InitSubagentId must be a union of all literal values
    const _typeCheck: InitSubagentId = INIT_SUBAGENT_IDS.secretsScan
    expect(_typeCheck).toBe('init-secrets-scan')

    // Spot-check literals
    expect(INIT_SUBAGENT_IDS.secretsScan).toBe('init-secrets-scan')
    expect(INIT_SUBAGENT_IDS.discoverDocs).toBe('init-discover-existing-docs')
    expect(INIT_SUBAGENT_IDS.classifyBlocks).toBe('init-classify-blocks')
    expect(INIT_SUBAGENT_IDS.proposeMerge).toBe('init-propose-merge')
    expect(INIT_SUBAGENT_IDS.applyMerge).toBe('init-apply-merge')
    expect(INIT_SUBAGENT_IDS.moveDocs).toBe('init-move-docs')
    expect(INIT_SUBAGENT_IDS.detectDrift).toBe('init-drift-detect')
    expect(INIT_SUBAGENT_IDS.populatePlanGen).toBe('init-populate-plan-gen')
    expect(INIT_SUBAGENT_IDS.rollback).toBe('init-rollback')
  })
})
