// skills/init/lib/compound-imported-constants.test.ts
import { describe, it, expect } from 'bun:test'
import {
  MAX_SLUG_LENGTH,
  OUTPUT_DIR_SUBPATH,
  formatEntryIndex,
  quoteYamlString,
  redactSecrets,
} from './compound-imported-constants'

describe('compound-imported-constants', () => {
  it('exposes MAX_SLUG_LENGTH = 60', () => {
    expect(MAX_SLUG_LENGTH).toBe(60)
  })

  it('exposes OUTPUT_DIR_SUBPATH = docs/compound/_imported', () => {
    expect(OUTPUT_DIR_SUBPATH).toBe('docs/compound/_imported')
  })

  it('formatEntryIndex pads to 4 chars with leading zeros', () => {
    expect(formatEntryIndex(1)).toBe('0001')
    expect(formatEntryIndex(42)).toBe('0042')
    expect(formatEntryIndex(9999)).toBe('9999')
  })

  it('quoteYamlString wraps in double quotes and escapes inner quotes', () => {
    expect(quoteYamlString('foo')).toBe('"foo"')
    expect(quoteYamlString('he said "hi"')).toBe('"he said \\"hi\\""')
    expect(quoteYamlString('process: critical')).toBe('"process: critical"')
  })

  it('quoteYamlString escapes backslashes before quotes', () => {
    expect(quoteYamlString('back\\slash')).toBe('"back\\\\slash"')
  })

  it('redactSecrets replaces GitHub PAT (ghp_...) with [REDACTED]', () => {
    const input = 'token=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 end'
    expect(redactSecrets(input)).toBe('token=[REDACTED] end')
  })

  it('redactSecrets replaces OpenAI-style sk- keys with [REDACTED]', () => {
    const input = 'sk-abc123DEF456ghi789JKL012mno345PQR678'
    expect(redactSecrets(input)).toBe('[REDACTED]')
  })

  it('redactSecrets handles AWS access keys, Slack tokens, Bearer headers', () => {
    expect(redactSecrets('AKIAIOSFODNN7EXAMPLE')).toBe('[REDACTED]')
    expect(redactSecrets('xoxp-1234567890-abcdef')).toBe('[REDACTED]')
    expect(redactSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(
      'Authorization: [REDACTED]',
    )
  })

  it('redactSecrets leaves plain text untouched', () => {
    const input = 'apenas texto normal sem segredos'
    expect(redactSecrets(input)).toBe(input)
  })
})
