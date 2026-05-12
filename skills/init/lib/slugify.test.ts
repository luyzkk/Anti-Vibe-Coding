// 2026-05-12 (Luiz/dev): pre-flight para fases 04+05 paralelas — slug helper compartilhado.

import { describe, it, expect } from 'bun:test'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('strips diacritics (NFD)', () => {
    expect(slugify('Decisão Crítica')).toBe('decisao-critica')
  })

  it('collapses non-alphanumeric runs into single dash', () => {
    expect(slugify('foo!@#$bar   baz')).toBe('foo-bar-baz')
  })

  it('strips leading and trailing dashes', () => {
    expect(slugify('  --foo--  ')).toBe('foo')
  })

  it('respects maxLen and trims trailing dashes after cut', () => {
    const long = 'a-very-long-title-that-keeps-going-and-going-and-going-x'
    const out = slugify(long, 30)
    expect(out.length).toBeLessThanOrEqual(30)
    expect(out.endsWith('-')).toBe(false)
  })

  it('returns empty string for input that normalizes to nothing', () => {
    expect(slugify('---')).toBe('')
    expect(slugify('')).toBe('')
  })
})
