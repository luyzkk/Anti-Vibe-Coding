// 2026-05-23 (Luiz/dev): testes anti-generico — PRD DC-5 / Wave 2 Plano 01 fase-04
import { describe, expect, test } from 'bun:test'
import { validatePositiveObservation, validatePositiveObservations } from './positive-observations-validator'
import { POSITIVE_OBSERVATIONS_FIXTURE } from './__fixtures__/positive-observations.fixture'

describe('validatePositiveObservation — testes anti-generico (DC-5)', () => {
  describe('rejeita tautologias (regex blacklist)', () => {
    const tautologias = [
      'no issues found',
      'looks fine',
      'everything is ok',
      'tudo certo',
      'codigo limpo',
      'tudo ok',
      'No Issues Found.',
      'Looks fine to me',
      'Everything is fine',
    ]
    test.each(tautologias)('rejeita "%s"', (input) => {
      const result = validatePositiveObservation(input)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/tautologia|generic/i)
    })
  })

  describe('aceita observacoes com citacao de arquivo:linha', () => {
    const validas = [
      'src/auth/middleware.ts:42 usa bcrypt com saltRounds=12',
      'src/api/users/route.ts:88 valida payload com zod antes de tocar DB',
      'lib/jwt.ts:15 verifica assinatura JWT (nao apenas decode)',
      'scripts/build.py:120 escapa input antes do shell subprocess',
    ]
    test.each(validas)('aceita "%s"', (input) => {
      const result = validatePositiveObservation(input)
      expect(result.valid).toBe(true)
    })
  })

  describe('aceita observacoes com citacao de simbolo/funcao', () => {
    const validas = [
      'A funcao `hashPassword` em auth.ts usa bcrypt com saltRounds=12 (acima do minimo OWASP)',
      'O middleware `requireAdmin` valida role antes de cada rota /api/admin',
      'Class `JwtVerifier` rejeita tokens com alg=none corretamente',
    ]
    test.each(validas)('aceita "%s"', (input) => {
      const result = validatePositiveObservation(input)
      expect(result.valid).toBe(true)
    })
  })

  describe('rejeita strings vazias ou banais', () => {
    test('rejeita string vazia', () => {
      expect(validatePositiveObservation('').valid).toBe(false)
    })
    test('rejeita string curta sem citacao', () => {
      expect(validatePositiveObservation('ok').valid).toBe(false)
    })
    test('rejeita afirmacao generica sem citacao', () => {
      expect(validatePositiveObservation('a aplicacao parece segura').valid).toBe(false)
    })
  })
})

describe('fixture coverage — POSITIVE_OBSERVATIONS_FIXTURE', () => {
  describe('todos os casos VALIDOS da fixture passam na validacao', () => {
    test.each([...POSITIVE_OBSERVATIONS_FIXTURE.valid])('valido: "%s"', (input) => {
      const result = validatePositiveObservation(input)
      expect(result.valid).toBe(true)
    })
  })

  describe('todos os casos INVALIDOS da fixture sao rejeitados', () => {
    test.each(POSITIVE_OBSERVATIONS_FIXTURE.invalid.map((c) => [c.input, c.reason] as const))(
      'invalido: "%s" (%s)',
      (input) => {
        const result = validatePositiveObservation(input)
        expect(result.valid).toBe(false)
      },
    )
  })
})

describe('validatePositiveObservations (array) — enforce length >= 1', () => {
  test('rejeita array vazio', () => {
    const result = validatePositiveObservations([])
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/length|empty|>=\s*1/i)
  })
  test('rejeita array com 1 item invalido', () => {
    const result = validatePositiveObservations(['no issues found'])
    expect(result.valid).toBe(false)
  })
  test('aceita array com >= 1 item valido', () => {
    const result = validatePositiveObservations([
      'src/auth/middleware.ts:42 usa bcrypt com saltRounds=12',
    ])
    expect(result.valid).toBe(true)
  })
})
