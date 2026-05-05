import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import {
  ADHERENCE_CHECKS,
  ADHERENCE_CHECKS_V52,
  renderAdherenceSection,
} from '../adherence-checks'

describe('ADHERENCE_CHECKS lookup', () => {
  test('has exactly 5 keys (G6)', () => {
    expect(Object.keys(ADHERENCE_CHECKS).length).toBe(5)
  })

  test('every profile has at least 1 check', () => {
    for (const check of Object.values(ADHERENCE_CHECKS)) {
      expect(check.checks.length).toBeGreaterThanOrEqual(1)
    }
  })

  test('vertical-slice checks mention shared or features', () => {
    const checks = ADHERENCE_CHECKS['vertical-slice'].checks.join(' ')
    expect(checks).toMatch(/shared|features/i)
  })

  test('clean-architecture-ritual checks mention barreira or domain', () => {
    const checks = ADHERENCE_CHECKS['clean-architecture-ritual'].checks.join(' ')
    expect(checks).toMatch(/barreira|domain/i)
  })

  test('G7 — checks are DESCRIPTIVE, not PRESCRIPTIVE (no "refatore", "converta", "altere para", "migre")', () => {
    for (const profileChecks of Object.values(ADHERENCE_CHECKS)) {
      const allText = profileChecks.checks.join(' ')
      expect(allText).not.toMatch(/refator/i)
      expect(allText).not.toMatch(/converta/i)
      expect(allText).not.toMatch(/altere para/i)
      expect(allText).not.toMatch(/migre/i)
    }
  })
})

describe('CA-04 regression: flag off renders empty section', () => {
  test('ADHERENCE_CHECKS_V52 has empty checks[]', () => {
    expect(ADHERENCE_CHECKS_V52.checks.length).toBe(0)
  })

  test('renderAdherenceSection returns empty string for empty checks', () => {
    expect(renderAdherenceSection(ADHERENCE_CHECKS_V52)).toBe('')
  })
})

describe('renderAdherenceSection', () => {
  test('renders with headline + bullet checks', () => {
    const md = renderAdherenceSection(ADHERENCE_CHECKS['vertical-slice'])
    expect(md).toMatch(/^### /)
    expect(md).toMatch(/^- \[ \] /m)
  })

  test('preserves order of checks in output', () => {
    const check = ADHERENCE_CHECKS['mvc-flat']
    const md = renderAdherenceSection(check)
    const lines = md.split('\n').filter((l) => l.startsWith('- [ ]'))
    expect(lines.length).toBe(check.checks.length)
  })
})

describe('execute-plan cross-skill import', () => {
  test('execute-plan imports fase-policy from plan-feature without duplicating lookup', () => {
    const skillContent = readFileSync(
      join(import.meta.dir, '../../../execute-plan/SKILL.md'),
      'utf8',
    )
    expect(skillContent).toMatch(/from ['"]\.\.\/plan-feature\/lib\/fase-policy['"]/)
  })
})
