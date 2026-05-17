// 2026-05-16 (Luiz/dev): testes do parser inline da flag --refresh-knowledge — RF7, G6.
// DI-4: extraído em arquivo TS separado (não inline em SKILL.md) para testabilidade.
import { describe, it, expect } from 'bun:test'
import { parseRefreshFlag } from './parse-refresh-flag'

describe('parseRefreshFlag', () => {
  it('returns false when rawArgs is undefined', () => {
    expect(parseRefreshFlag(undefined)).toBe(false)
  })

  it('returns false when rawArgs is empty string', () => {
    expect(parseRefreshFlag('')).toBe(false)
  })

  it('returns false when flag is absent from args', () => {
    expect(parseRefreshFlag('--some-other-flag --another')).toBe(false)
  })

  it('returns true when flag is the only token', () => {
    expect(parseRefreshFlag('--refresh-knowledge')).toBe(true)
  })

  it('recognizes flag at beginning of args string', () => {
    expect(parseRefreshFlag('--refresh-knowledge --verbose')).toBe(true)
  })

  it('recognizes flag at end of args string', () => {
    expect(parseRefreshFlag('--verbose --refresh-knowledge')).toBe(true)
  })

  it('recognizes flag in any position (middle)', () => {
    expect(parseRefreshFlag('--a --refresh-knowledge --b')).toBe(true)
  })

  it('handles extra whitespace around the flag', () => {
    expect(parseRefreshFlag('  --refresh-knowledge  ')).toBe(true)
  })

  it('does not match partial flag names', () => {
    expect(parseRefreshFlag('--refresh')).toBe(false)
    expect(parseRefreshFlag('--refresh-knowledge-extra')).toBe(false)
  })
})
