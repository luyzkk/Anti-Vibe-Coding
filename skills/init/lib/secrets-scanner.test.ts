import { expect, test, describe } from 'bun:test'
import { scanSecrets } from './secrets-scanner'

describe('scanSecrets', () => {
  test('detecta AWS access key', () => {
    const matches = scanSecrets('credential = AKIAIOSFODNN7EXAMPLE')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('aws-key')
    expect(matches[0]?.lineNumber).toBe(1)
    expect(matches[0]?.redactedSample).toBe('AKIA***')
  })

  test('NAO confunde sk_test_ com sk_live_', () => {
    const matches = scanSecrets('STRIPE_TEST=sk_test_1234567890ABCDEFGHIJKLMN')
    expect(matches).toHaveLength(0)
  })

  test('detecta Stripe live key', () => {
    const matches = scanSecrets('STRIPE_LIVE=sk_live_1234567890ABCDEFGHIJKLMN')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('stripe-live')
  })

  test('detecta postgres URL com credenciais', () => {
    const matches = scanSecrets('DB=postgres://user:pass@db.example.com:5432/app')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('postgres-url')
  })

  test('detecta email', () => {
    const matches = scanSecrets('Contato: comunidadeartebox@gmail.com')
    expect(matches.some((m) => m.kind === 'email')).toBe(true)
  })

  test('detecta JWT token', () => {
    const matches = scanSecrets(
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    )
    expect(matches.some((m) => m.kind === 'jwt')).toBe(true)
  })

  test('fixture limpa retorna array vazio', () => {
    const matches = scanSecrets('# Markdown puro sem segredos.\n\nApenas texto.')
    expect(matches).toHaveLength(0)
  })

  test('multiplos matches em linhas distintas preservam lineNumber correto', () => {
    const content = [
      'safe line',
      'aws=AKIAIOSFODNN7EXAMPLE',
      'safe line',
      'stripe=sk_live_1234567890ABCDEFGHIJKLMN',
    ].join('\n')
    const matches = scanSecrets(content)
    expect(matches).toHaveLength(2)
    expect(matches[0]?.lineNumber).toBe(2)
    expect(matches[1]?.lineNumber).toBe(4)
  })

  test('multiplos matches na mesma linha sao todos capturados', () => {
    const content = 'a@b.com e c@d.com no mesmo paragrafo'
    const matches = scanSecrets(content)
    expect(matches.filter((m) => m.kind === 'email')).toHaveLength(2)
  })

  test('redactedSample nunca expoe mais de 4 chars do segredo', () => {
    const matches = scanSecrets('STRIPE=sk_live_1234567890ABCDEFGHIJKLMN')
    expect(matches[0]?.redactedSample.length).toBeLessThanOrEqual(7) // 4 + '***'
    expect(matches[0]?.redactedSample.endsWith('***')).toBe(true)
  })
})
