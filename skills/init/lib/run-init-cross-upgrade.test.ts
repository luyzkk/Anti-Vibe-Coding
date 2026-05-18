// skills/init/lib/run-init-cross-upgrade.test.ts
import { describe, it, expect } from 'bun:test'
import { detectCrossUpgrade } from './cross-upgrade-detector'

// Integration tests — verify the detector produces the correct output
// used by the dispatcher in run-init.ts.
describe('cross-upgrade integration', () => {
  it('returns warning message for v6.3.x -> v6.4.x with inflated CLAUDE.md', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: '6.3.2',
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 287,
      additiveOptIn: false,
      dryRun: false,
    })
    expect(result).not.toBeNull()
    expect(result?.message).toContain('--additive-merge')
    expect(result?.message).toContain('ADR-0021')
  })

  it('returns null for greenfield (no manifest)', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: null,
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 200,
      additiveOptIn: false,
      dryRun: false,
    })
    expect(result).toBeNull()
  })
})
