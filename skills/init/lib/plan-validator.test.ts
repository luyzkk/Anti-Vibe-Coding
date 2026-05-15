import { describe, it, expect } from 'bun:test'
import { validateMigrationPlan, REQUIRED_PLAN_SECTIONS } from './plan-validator'

describe('validateMigrationPlan', () => {
  it('module exists and exports validateMigrationPlan', () => {
    expect(typeof validateMigrationPlan).toBe('function')
  })

  it('REQUIRED_PLAN_SECTIONS tem 10 elementos', () => {
    expect(REQUIRED_PLAN_SECTIONS.length).toBe(10)
  })

  it('retorna valid:true para plan com 10 secoes corretas', () => {
    const content = [
      '## Goal', 'test',
      '## Scope', 'test',
      '## Assumptions', 'test',
      '## Risks', 'test',
      '## Execution Steps', 'test',
      '## Review Checklist', 'test',
      '## Validation Log', 'test',
      '## Compound Opportunity', 'test',
      '## Lessons Captured', 'test',
      '## Exit Criteria', 'test',
    ].join('\n')
    const result = validateMigrationPlan(content)
    expect(result.valid).toBe(true)
    expect(result.missingSections).toEqual([])
  })

  it('retorna valid:false quando secao Goal ausente', () => {
    const content = [
      '## Scope', 'test',
      '## Assumptions', 'test',
    ].join('\n')
    const result = validateMigrationPlan(content)
    expect(result.valid).toBe(false)
    expect(result.missingSections).toContain('Goal')
  })

  it('detecta secao com nome errado (case-sensitive)', () => {
    const content = [
      '## goal',
      '## Scope', 'test',
    ].join('\n')
    const result = validateMigrationPlan(content)
    expect(result.missingSections).toContain('Goal')
  })
})
