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

  // 2026-09-01 (Luiz/dev): CA-02 do PRD — hoje nenhum dos dois tipos e coberto pelas 5 regexes.
  test('detecta token do GitHub (ghp_)', () => {
    const matches = scanSecrets('const gh = "ghp_A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz"')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('github-token')
    expect(matches[0]?.redactedSample).toBe('ghp_***')
  })

  test('detecta segredo generico de alta entropia', () => {
    const matches = scanSecrets('const token = "aZ9kQ2mX7pL4vB8nR1tY6wE3sD5gH0jF"')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('high-entropy')
  })

  // Guarda de PRIORIDADE (G4 do README): o token GitHub tambem casa com o shape de entropia.
  // A regra especifica precisa vencer, e usedRanges precisa suprimir a duplicata.
  test('token do GitHub NAO e reportado duas vezes (especifica vence generica)', () => {
    const matches = scanSecrets('gh = ghp_A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('github-token')
  })

  // Guarda de FALSO POSITIVO — espelha o precedente 'NAO confunde sk_test_ com sk_live_'.
  // Sem esta guarda a heuristica de entropia inunda qualquer arquivo .ts real.
  test('codigo TypeScript comum NAO dispara high-entropy', () => {
    const content = [
      'import { writeDiscoveryArtifact } from "../discovery-store"',
      'export async function listCandidateFilesRecursively(rootDirectory: string) {',
      '  const identifierWithoutDigitsIsNotASecret = true',
      '}',
    ].join('\n')
    expect(scanSecrets(content)).toHaveLength(0)
  })

  test('hash hexadecimal minusculo NAO dispara high-entropy', () => {
    // Checksums do plugin-manifest.json e SHAs de commit: sem uppercase, charset pobre.
    const matches = scanSecrets('checksum: 9f2c4a7b1e6d8035af41c9b27e50d3a6f8c1b4e792d05a63')
    expect(matches).toHaveLength(0)
  })

  // 2026-09-01 (Luiz/dev): guarda da corrida sequencial — BUG-01 da fase-01.
  // Entropia de Shannon mede DIVERSIDADE de caracteres, nao imprevisibilidade. Medido:
  // 'abc...xyz0123456789' (zero aleatoriedade) = 5.17 bits/char, ACIMA do secret real
  // aleatorio da linha 81 (5.00). Nenhum limiar separa os dois — o falso positivo pontua
  // mais alto que o verdadeiro positivo. So um segundo eixo resolve. PRD §RF-02.
  test('sequencia monotonica NAO dispara high-entropy apesar da entropia alta', () => {
    // Charset misto (passa hasMixedCharset) e entropia 4.91 (acima do limiar 4.0) — este
    // candidato SO e barrado pela corrida sequencial. Sem o guard, o teste falha.
    const matches = scanSecrets('const seq = "abcdefghij0123456789ABCDEFGHIJ"')
    expect(matches).toHaveLength(0)
  })
})
