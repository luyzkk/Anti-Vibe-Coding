/**
 * Smoke tests for universal principles integration (Plano 04 fase-06).
 *
 * These are textual TDD assertions — they read .md files directly and assert
 * that the required content blocks exist. No runtime code is involved.
 *
 * Principles tested:
 *   #1  — Context-First / 10 Questions Test (consultant, grill-me)
 *   #5  — Comment Provenance (prd-template.md, fase-template.md)
 *   #7  — Declarative-first specs (prd-template.md: Outcomes before Mecanismo)
 *   #9  — Fresh-context Review (verify-work/SKILL.md)
 *   #10 — YAGNI checklist (consultant/SKILL.md)
 */

import { describe, it, expect } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'

const SKILLS = path.join(import.meta.dir, '../..')

const consultantSkill = path.join(SKILLS, 'consultant/SKILL.md')
const grillMeSkill = path.join(SKILLS, 'grill-me/SKILL.md')
const prdTemplate = path.join(SKILLS, 'write-prd/templates/prd-template.md')
const faseTemplate = path.join(SKILLS, 'plan-feature/templates/fase-template.md')
const verifyWorkSkill = path.join(SKILLS, 'verify-work/SKILL.md')
const universalPrinciplesDocs = path.join(import.meta.dir, '../../../docs/universal-principles-v53.md')

// Pre-read files once
const consultant = fs.readFileSync(consultantSkill, 'utf8')
const grillMe = fs.readFileSync(grillMeSkill, 'utf8')
const prd = fs.readFileSync(prdTemplate, 'utf8')
const fase = fs.readFileSync(faseTemplate, 'utf8')
const verifyWork = fs.readFileSync(verifyWorkSkill, 'utf8')

describe('universal principles — #1 (10 Questions Test)', () => {
  it('consultant/SKILL.md contains literal "10 Questions Test"', () => {
    expect(consultant).toContain('10 Questions Test')
  })

  it('grill-me/SKILL.md references "10 Questions Test"', () => {
    expect(grillMe).toContain('10 Questions Test')
  })
})

describe('universal principles — #5 (Comment Provenance)', () => {
  it('prd-template.md contains literal "Comment Provenance"', () => {
    expect(prd).toContain('Comment Provenance')
  })

  it('fase-template.md contains literal "Comment Provenance"', () => {
    expect(fase).toContain('Comment Provenance')
  })

  it('fase-template.md contains an example comment with lineage format (YYYY-MM-DD)', () => {
    // Example: // 2026-05-04 (Luiz/dev): ...
    expect(fase).toMatch(/\/\/ \d{4}-\d{2}-\d{2} \(.+\):/)
  })
})

describe('universal principles — #7 (Declarative-first specs)', () => {
  it('prd-template.md contains section "Outcomes"', () => {
    expect(prd).toContain('Outcomes')
  })

  it('prd-template.md has "Outcomes" positioned before "Mecanismo"', () => {
    const outcomesIdx = prd.indexOf('Outcomes')
    const mecanismoIdx = prd.indexOf('Mecanismo')
    expect(outcomesIdx).toBeGreaterThan(-1)
    expect(mecanismoIdx).toBeGreaterThan(-1)
    expect(outcomesIdx).toBeLessThan(mecanismoIdx)
  })
})

describe('universal principles — #9 (Fresh-context Review)', () => {
  it('verify-work/SKILL.md contains literal "Fresh-context Review"', () => {
    expect(verifyWork).toContain('Fresh-context Review')
  })
})

describe('universal principles — #10 (YAGNI checklist)', () => {
  it('consultant/SKILL.md contains literal "YAGNI checklist"', () => {
    expect(consultant).toContain('YAGNI checklist')
  })
})

describe('universal principles — docs/universal-principles-v53.md exists and is complete', () => {
  it('docs/universal-principles-v53.md exists', () => {
    expect(fs.existsSync(universalPrinciplesDocs)).toBe(true)
  })

  it('docs/universal-principles-v53.md mentions Princípio 1 or 10 Questions Test', () => {
    const docs = fs.readFileSync(universalPrinciplesDocs, 'utf8')
    const hasPrinciple1 = docs.includes('Princípio 1') || docs.includes('10 Questions Test')
    expect(hasPrinciple1).toBe(true)
  })

  it('docs/universal-principles-v53.md mentions Princípio 5 or Comment Provenance', () => {
    const docs = fs.readFileSync(universalPrinciplesDocs, 'utf8')
    const hasPrinciple5 = docs.includes('Princípio 5') || docs.includes('Comment Provenance')
    expect(hasPrinciple5).toBe(true)
  })

  it('docs/universal-principles-v53.md mentions Princípio 7 or Declarative-first', () => {
    const docs = fs.readFileSync(universalPrinciplesDocs, 'utf8')
    const hasPrinciple7 = docs.includes('Princípio 7') || docs.includes('Declarative-first') || docs.includes('Declarative')
    expect(hasPrinciple7).toBe(true)
  })

  it('docs/universal-principles-v53.md mentions Princípio 9 or Fresh-context', () => {
    const docs = fs.readFileSync(universalPrinciplesDocs, 'utf8')
    const hasPrinciple9 = docs.includes('Princípio 9') || docs.includes('Fresh-context')
    expect(hasPrinciple9).toBe(true)
  })

  it('docs/universal-principles-v53.md mentions Princípio 10 or YAGNI', () => {
    const docs = fs.readFileSync(universalPrinciplesDocs, 'utf8')
    const hasPrinciple10 = docs.includes('Princípio 10') || docs.includes('YAGNI')
    expect(hasPrinciple10).toBe(true)
  })
})
