// 2026-05-15 (Luiz/dev): decision-registry-prefaces.test.ts — RF-SH-05 + CA-02
import { describe, expect, test } from 'bun:test'
import { DECISION_REGISTRY_PREFACE_BY_PROFILE, DEFAULT_DECISION_REGISTRY_PREFACE } from './decision-registry-prefaces'

describe('decision-registry-prefaces lookup', () => {
  test('returns nextjs-specific preface for nextjs-app-router profile', () => {
    const result = DECISION_REGISTRY_PREFACE_BY_PROFILE['nextjs-app-router']
    expect(result).toBeDefined()
    expect(result).toContain('App Router')
  })

  test('returns mvc-flat preface for mvc-flat profile', () => {
    const result = DECISION_REGISTRY_PREFACE_BY_PROFILE['mvc-flat']
    expect(result).toBeDefined()
    expect(result).toContain('MVC flat')
  })

  test('DEFAULT preserves v6.2 behavior — empty preface = no prepend (CA-02)', () => {
    expect(DEFAULT_DECISION_REGISTRY_PREFACE).toBe('')
  })
})
