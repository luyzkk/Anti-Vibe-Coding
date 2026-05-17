// skills/tdd-workflow/__tests__/stack-aware-preface-wire.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 03 fase-02, CA-05 + CA-09 wire greenfield.
// G1 verbatim. G2: greenfield — anchor = fechamento do frontmatter, antes do primeiro H1.
import { describe, it, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('tdd-workflow SKILL.md stack-aware-preface wire-up', () => {
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

  it('preface appears between frontmatter close and first H1 (greenfield positional, CA-10)', () => {
    const startIdx = body.indexOf('<!-- stack-aware-preface:start -->')
    const firstH1Idx = body.search(/^# /m)
    const frontmatterCloseIdx = body.indexOf('---', 4)
    expect(startIdx).toBeGreaterThan(-1)
    expect(firstH1Idx).toBeGreaterThan(-1)
    expect(frontmatterCloseIdx).toBeGreaterThan(-1)
    expect(startIdx).toBeGreaterThan(frontmatterCloseIdx)
    expect(startIdx).toBeLessThan(firstH1Idx)
  })
})
