// skills/architecture/__tests__/stack-aware-preface-wire.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 03 fase-02, CA-05 + CA-09 wire architecture.
// G1 do plano: bloco verbatim (delega ao helper getStackKnowledgePreface). G4: insertion-only diff.
// Architecture tem profile-aware-preface mas NAO tem stale-capabilities-check — anchor batch 1 style sem stale.
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('architecture SKILL.md stack-aware-preface wire-up', () => {
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

  it('positioned after profile-aware-preface:end and before first H1 (CA-10)', () => {
    expect(body).toContain('<!-- profile-aware-preface:end -->')
    const profileEnd = body.indexOf('<!-- profile-aware-preface:end -->')
    const stackStart = body.indexOf('<!-- stack-aware-preface:start -->')
    const firstH1 = body.search(/^# /m)
    expect(profileEnd).toBeLessThan(stackStart)
    expect(stackStart).toBeLessThan(firstH1)
  })
})
