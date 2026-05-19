import { describe, it, expect } from 'bun:test'
import { compareSemver } from './semver-compare'

describe('compareSemver', () => {
  it('returns 1 when 6.4.10 > 6.4.9 (numeric, not lexicographic)', () => {
    expect(compareSemver('6.4.10', '6.4.9')).toBe(1)
  })

  it('returns 0 when versions are equal', () => {
    expect(compareSemver('6.5.0', '6.5.0')).toBe(0)
  })

  it('returns -1 when a < b', () => {
    expect(compareSemver('6.4.1', '6.5.0')).toBe(-1)
  })

  it('treats absent patch as 0', () => {
    expect(compareSemver('6.5', '6.5.0')).toBe(0)
  })

  it('compares major versions correctly', () => {
    expect(compareSemver('7.0.0', '6.5.0')).toBe(1)
    expect(compareSemver('5.9.9', '6.0.0')).toBe(-1)
  })

  it('ignores pre-release suffix', () => {
    expect(compareSemver('6.5.0-alpha', '6.5.0')).toBe(0)
  })
})
