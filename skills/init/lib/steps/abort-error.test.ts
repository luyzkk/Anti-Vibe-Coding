// skills/init/lib/steps/abort-error.test.ts
import { describe, test, expect } from 'bun:test'
import { AbortError } from './abort-error'

describe('AbortError', () => {
  test('carries code and reason', () => {
    const err = new AbortError({ code: 1, reason: 'needs migration' })
    expect(err.code).toBe(1)
    expect(err.reason).toBe('needs migration')
    expect(err.message).toBe('needs migration')
  })

  test('is catchable as AbortError (instanceof)', () => {
    try {
      throw new AbortError({ code: 2, reason: 'conflict' })
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      expect(e).toBeInstanceOf(Error)
      if (e instanceof AbortError) {
        expect(e.code).toBe(2)
      }
    }
  })

  test('name is AbortError (for serialization/logging)', () => {
    const err = new AbortError({ code: 1, reason: 'x' })
    expect(err.name).toBe('AbortError')
  })
})
