// 2026-05-23 (Luiz/dev): validacao estrutural da fixture — PRD DC-5 / Wave 2 Plano 01 fase-04
// Garante que a fixture satisfaz os requisitos minimos de contagem (>= 6 valid, >= 8 invalid)
// e que cada campo obrigatorio esta presente nos casos invalidos.
import { describe, expect, test } from 'bun:test'
import { POSITIVE_OBSERVATIONS_FIXTURE } from './positive-observations.fixture'

describe('POSITIVE_OBSERVATIONS_FIXTURE — validacao estrutural', () => {
  test('fixture.valid tem >= 6 casos', () => {
    expect(POSITIVE_OBSERVATIONS_FIXTURE.valid.length).toBeGreaterThanOrEqual(6)
  })

  test('fixture.invalid tem >= 8 casos', () => {
    expect(POSITIVE_OBSERVATIONS_FIXTURE.invalid.length).toBeGreaterThanOrEqual(8)
  })

  test('cada caso invalido tem campo "reason" nao-vazio', () => {
    for (const c of POSITIVE_OBSERVATIONS_FIXTURE.invalid) {
      expect(typeof c.reason).toBe('string')
      expect(c.reason.length).toBeGreaterThan(0)
    }
  })

  test('cada caso invalido tem campo "input" (string, pode ser vazia)', () => {
    for (const c of POSITIVE_OBSERVATIONS_FIXTURE.invalid) {
      expect(typeof c.input).toBe('string')
    }
  })
})
