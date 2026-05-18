// skills/init/lib/cross-upgrade-detector.test.ts
import { describe, it, expect } from 'bun:test'
import { detectCrossUpgrade } from './cross-upgrade-detector'

describe('detectCrossUpgrade', () => {
  it('returns null when manifestPluginVersion is null (greenfield)', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: null,
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 200,
      additiveOptIn: false,
      dryRun: false,
    })
    expect(result).toBeNull()
  })

  it('returns null when claudeMdLineCount is null (unreadable CLAUDE.md)', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: '6.3.2',
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: null,
      additiveOptIn: false,
      dryRun: false,
    })
    expect(result).toBeNull()
  })

  it('returns null when claudeMdLineCount is 40 or below (compact CLAUDE.md)', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: '6.3.2',
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 40,
      additiveOptIn: false,
      dryRun: false,
    })
    expect(result).toBeNull()
  })

  it('returns null when additiveOptIn is true', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: '6.3.2',
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 200,
      additiveOptIn: true,
      dryRun: false,
    })
    expect(result).toBeNull()
  })

  it('returns null when dryRun is true', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: '6.3.2',
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 200,
      additiveOptIn: false,
      dryRun: true,
    })
    expect(result).toBeNull()
  })

  it('returns null when version pair is not 6.3.x -> 6.4.x', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: '6.2.0',
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 200,
      additiveOptIn: false,
      dryRun: false,
    })
    expect(result).toBeNull()
  })

  it('returns warning for v6.3.x -> v6.4.x with inflated CLAUDE.md', () => {
    const result = detectCrossUpgrade({
      manifestPluginVersion: '6.3.2',
      currentPluginVersion: '6.4.0',
      claudeMdLineCount: 287,
      additiveOptIn: false,
      dryRun: false,
    })
    expect(result).not.toBeNull()
    expect(result?.shouldWarn).toBe(true)
    expect(result?.message).toContain('--additive-merge')
    expect(result?.message).toContain('ADR-0021')
    expect(result?.message).toContain('287')
  })
})
