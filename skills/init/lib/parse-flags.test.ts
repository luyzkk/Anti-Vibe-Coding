// skills/init/lib/parse-flags.test.ts
import { describe, test, expect } from 'bun:test'
import { parseFlags } from './parse-flags'

describe('parseFlags', () => {
  test('separates flags from positional args', () => {
    const r = parseFlags(['migrate', '--dry-run', 'extra'])
    expect(r.args).toEqual(['migrate', 'extra'])
    expect(r.flags).toEqual({ 'dry-run': true })
  })

  test('handles --key=value', () => {
    const r = parseFlags(['--mode=fast'])
    expect(r.flags).toEqual({ mode: 'fast' })
  })

  test('returns empty for empty argv', () => {
    const r = parseFlags([])
    expect(r.args).toEqual([])
    expect(r.flags).toEqual({})
  })

  test('parseFlags recognizes --rollback as boolean flag', () => {
    const result = parseFlags(['--rollback'])
    expect(result.args).toEqual([])
    expect(result.flags.rollback).toBe(true)
  })

  test('parseFlags --rollback coexists with other flags', () => {
    const result = parseFlags(['--rollback', '--dry-run'])
    expect(result.flags.rollback).toBe(true)
    expect(result.flags['dry-run']).toBe(true)
  })
})
