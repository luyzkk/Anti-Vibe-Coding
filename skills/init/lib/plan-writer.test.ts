import { describe, it, expect } from 'bun:test'
import { writeMigrationPlan, slotToSlug } from './plan-writer'

describe('plan-writer', () => {
  it('module exists and exports writeMigrationPlan', () => {
    expect(typeof writeMigrationPlan).toBe('function')
  })

  it('module exists and exports slotToSlug', () => {
    expect(typeof slotToSlug).toBe('function')
  })
})
