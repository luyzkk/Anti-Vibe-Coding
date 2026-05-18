// skills/init/lib/steps/helpers.test.ts
// 2026-05-17 (Luiz/dev): cobertura dos helpers DRY extraidos apos code-smell audit do Plano 04.
import { describe, expect, test } from 'bun:test'
import path from 'node:path'
import { isMigrateMode, isDryRun, resolvePluginRoot } from './helpers'

describe('isMigrateMode', () => {
  test('returns true when first positional arg is "migrate"', () => {
    expect(isMigrateMode(['migrate'])).toBe(true)
    expect(isMigrateMode(['migrate', '--dry-run'])).toBe(true)
  })

  test('returns false for empty args or non-migrate first arg', () => {
    expect(isMigrateMode([])).toBe(false)
    expect(isMigrateMode(['--dry-run'])).toBe(false)
    expect(isMigrateMode(['init'])).toBe(false)
  })
})

describe('isDryRun', () => {
  test('returns true only when dry-run flag is boolean true', () => {
    expect(isDryRun({ 'dry-run': true })).toBe(true)
  })

  test('returns false when flag is missing, false, or string value', () => {
    expect(isDryRun({})).toBe(false)
    expect(isDryRun({ 'dry-run': false })).toBe(false)
    expect(isDryRun({ 'dry-run': 'true' })).toBe(false)
    expect(isDryRun({ other: true })).toBe(false)
  })
})

describe('resolvePluginRoot', () => {
  test('honors CLAUDE_PLUGIN_ROOT when set', () => {
    const original = process.env.CLAUDE_PLUGIN_ROOT
    process.env.CLAUDE_PLUGIN_ROOT = '/custom/plugin/root'
    try {
      expect(resolvePluginRoot('/anywhere')).toBe('/custom/plugin/root')
    } finally {
      if (original === undefined) delete process.env.CLAUDE_PLUGIN_ROOT
      else process.env.CLAUDE_PLUGIN_ROOT = original
    }
  })

  test('falls back to 4 levels above stepFileDir when env unset', () => {
    const original = process.env.CLAUDE_PLUGIN_ROOT
    delete process.env.CLAUDE_PLUGIN_ROOT
    try {
      const stepDir = path.join('a', 'b', 'c', 'd', 'e')
      const expected = path.join(stepDir, '..', '..', '..', '..')
      expect(resolvePluginRoot(stepDir)).toBe(expected)
    } finally {
      if (original !== undefined) process.env.CLAUDE_PLUGIN_ROOT = original
    }
  })
})
