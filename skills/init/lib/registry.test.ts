import { describe, expect, test } from 'bun:test'
import { registry } from './registry'

describe('registry', () => {
  test('all step ids are unique', () => {
    const ids = registry.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('91-generate-populate-plan is the last step', () => {
    expect(registry.at(-1)?.id).toBe('91-generate-populate-plan')
  })

  test('91-generate-populate-plan comes after final-validation', () => {
    const finalIdx = registry.findIndex(s => s.id === 'final-validation')
    const populateIdx = registry.findIndex(s => s.id === '91-generate-populate-plan')
    expect(finalIdx).toBeGreaterThanOrEqual(0)
    expect(populateIdx).toBeGreaterThan(finalIdx)
  })
})
