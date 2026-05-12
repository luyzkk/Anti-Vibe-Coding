// 2026-05-11 (Luiz/dev): valida parser isolado.

import { describe, it, expect } from 'bun:test'
import { parseDecisions } from './parse-decisions'

describe('parseDecisions', () => {
  it('parses bracket-form heading: ### [Nome]: Escolha', () => {
    const body = `### [Sistema de Versionamento]: Manifest com Checksums\n**Data:** 2026-03-23\n**Alternativas consideradas:** ...`
    const entries = parseDecisions(body)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.title).toBe('Sistema de Versionamento')
    expect(entries[0]!.chosen).toBe('Manifest com Checksums')
    expect(entries[0]!.date).toBe('2026-03-23')
  })

  it('extracts justification block', () => {
    const body = `### [X]: y\n**Justificativa:** ABC linha 1\nlinha 2\n\n**Risco conhecido:** DEF`
    const entries = parseDecisions(body)
    expect(entries[0]!.justification).toContain('ABC linha 1')
    expect(entries[0]!.risk).toBe('DEF')
  })

  it('extracts reversibility', () => {
    const body = `### [X]: y\n**Reversibilidade:** Reversível`
    const entries = parseDecisions(body)
    expect(entries[0]!.reversibility).toBe('Reversível')
  })

  it('parses multiple decisions in same file', () => {
    const body = `### [A]: 1\n**Data:** 2026-01-01\n\n### [B]: 2\n**Data:** 2026-02-02\n`
    const entries = parseDecisions(body)
    expect(entries).toHaveLength(2)
    expect(entries[0]!.title).toBe('A')
    expect(entries[1]!.title).toBe('B')
  })

  it('returns empty array for body without decisions', () => {
    expect(parseDecisions('# Just a header\nText.\n')).toHaveLength(0)
  })

  it('handles missing date gracefully', () => {
    const body = `### [X]: y\n**Justificativa:** abc`
    const entries = parseDecisions(body)
    expect(entries[0]!.date).toBe('')
  })
})
