// 2026-05-15 (Luiz/dev): lessons-learned-prefaces.test.ts — RF-SH-05 + CA-02
import { describe, expect, test } from 'bun:test'
import { LESSONS_LEARNED_PREFACE_BY_PROFILE, DEFAULT_LESSONS_LEARNED_PREFACE } from './lessons-learned-prefaces'

describe('lessons-learned-prefaces lookup', () => {
  test('returns nextjs-specific preface for nextjs-app-router profile', () => {
    const result = LESSONS_LEARNED_PREFACE_BY_PROFILE['nextjs-app-router']
    expect(result).toBeDefined()
    expect(result).toContain('App Router')
  })

  test('returns mvc-flat preface for mvc-flat profile', () => {
    const result = LESSONS_LEARNED_PREFACE_BY_PROFILE['mvc-flat']
    expect(result).toBeDefined()
    expect(result).toContain('MVC flat')
  })

  test('DEFAULT preserves v6.2 behavior — empty preface = no prepend (CA-02)', () => {
    expect(DEFAULT_LESSONS_LEARNED_PREFACE).toBe('')
  })
})
