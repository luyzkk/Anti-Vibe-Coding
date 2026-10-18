// skills/api-design/__tests__/stack-aware-preface-wire.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 03 fase-01, CA-05 + CA-09 wire api-design.
// G1 do plano: bloco verbatim (delega ao helper getStackKnowledgePreface). G4: insertion-only diff.
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('api-design SKILL.md stack-aware-preface wire-up', () => {
  const skillPath = join(import.meta.dir, '..', 'SKILL.md')
  const body = readFileSync(skillPath, 'utf8')

  it('contains stack-aware-preface block markers', () => {
    expect(body).toContain('<!-- stack-aware-preface:start -->')
    expect(body).toContain('<!-- stack-aware-preface:end -->')
  })

  it('preface block delegates to getStackKnowledgePreface helper (D11)', () => {
    const start = body.indexOf('<!-- stack-aware-preface:start -->')
    const end = body.indexOf('<!-- stack-aware-preface:end -->')
    const block = body.slice(start, end)
    expect(block).toContain('getStackKnowledgePreface')
    expect(block).toContain('../security/lib/stack-aware-preface')
  })

  // 2026-10-18 (Luiz/dev): 8.0 fatia 4 — o bloco de perfil (Modo Dual) saiu: ele nunca ligou num projeto real.
  it('no longer carries the profile-aware block, and the stack preface sits before the first H1', () => {
    expect(body).not.toContain('profile-aware-preface')
    expect(body.indexOf('<!-- stack-aware-preface:end -->')).toBeLessThan(body.search(/^# /m))
    expect(body.indexOf('<!-- stack-aware-preface:end -->')).toBeLessThan(
      body.indexOf('<!-- stale-capabilities-check:start -->'),
    )
  })
})
