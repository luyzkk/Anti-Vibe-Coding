// 2026-05-15 (Luiz/dev): system-design-prefaces.test.ts — RF-MH-05 + CA-01 + CA-02
import { describe, expect, test } from 'bun:test'
import { SYSTEM_DESIGN_PREFACE_BY_PROFILE, DEFAULT_SYSTEM_DESIGN_PREFACE } from './system-design-prefaces'

describe('system-design-prefaces lookup', () => {
  test('returns nextjs-specific preface for nextjs-app-router profile', () => {
    const result = SYSTEM_DESIGN_PREFACE_BY_PROFILE['nextjs-app-router']
    expect(result).toBeDefined()
    expect(result).toContain('App Router')
    expect(result).toContain('Vercel')
  })

  test('returns mvc-flat preface for mvc-flat profile', () => {
    const result = SYSTEM_DESIGN_PREFACE_BY_PROFILE['mvc-flat']
    expect(result).toBeDefined()
    expect(result).toContain('MVC flat')
  })

  test('falls back to default when profile not in table (clean-architecture-ritual)', () => {
    const result = SYSTEM_DESIGN_PREFACE_BY_PROFILE['clean-architecture-ritual'] ?? DEFAULT_SYSTEM_DESIGN_PREFACE
    expect(result).toBe(DEFAULT_SYSTEM_DESIGN_PREFACE)
  })

  test('DEFAULT preserves v6.2 behavior — empty preface = no prepend (CA-02)', () => {
    expect(DEFAULT_SYSTEM_DESIGN_PREFACE).toBe('')
  })
})
