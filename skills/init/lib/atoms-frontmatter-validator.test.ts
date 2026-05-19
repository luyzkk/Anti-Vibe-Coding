// 2026-05-18 (Luiz/dev): stub — os testes reais estao em atoms-frontmatter-schema.test.ts.
// Este arquivo existe para satisfazer o TDD gate (red phase anchor).
// RF4 + CA-10.
import { describe, it, expect } from 'bun:test'
import { validateAtomFrontmatter } from './atoms-frontmatter-validator'

describe('validateAtomFrontmatter — exported', () => {
  it('exports validateAtomFrontmatter function', () => {
    expect(typeof validateAtomFrontmatter).toBe('function')
  })
})
