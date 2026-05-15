// 2026-05-15 (Luiz/dev): security-prefaces.test.ts — RF-MH-05 + CA-01 + CA-02
import { describe, expect, test } from 'bun:test'
import { SECURITY_PREFACE_BY_PROFILE, DEFAULT_SECURITY_PREFACE } from './security-prefaces'

describe('security-prefaces lookup', () => {
  test('returns nextjs-specific preface for nextjs-app-router profile', () => {
    const result = SECURITY_PREFACE_BY_PROFILE['nextjs-app-router']
    expect(result).toBeDefined()
    expect(result).toContain('App Router')
    expect(result).toContain('Server Actions')
  })

  test('returns mvc-flat preface for mvc-flat profile', () => {
    const result = SECURITY_PREFACE_BY_PROFILE['mvc-flat']
    expect(result).toBeDefined()
    expect(result).toContain('MVC flat')
  })

  test('falls back to default when profile not in table (clean-architecture-ritual)', () => {
    const result = SECURITY_PREFACE_BY_PROFILE['clean-architecture-ritual'] ?? DEFAULT_SECURITY_PREFACE
    expect(result).toBe(DEFAULT_SECURITY_PREFACE)
  })

  test('DEFAULT preserves v6.2 behavior — empty preface = no prepend (CA-02)', () => {
    expect(DEFAULT_SECURITY_PREFACE).toBe('')
  })
})
