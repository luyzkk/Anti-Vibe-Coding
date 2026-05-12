// 2026-05-12 (Luiz/dev): TDD RED — constantes canonicas D18 (CA-18) para validacao de secoes
import { describe, it, expect } from 'bun:test'
import {
  EXEC_PLAN_SECTIONS_FULL,
  EXEC_PLAN_SECTIONS_QUICK,
  type ExecPlanMode,
} from './exec-plan-sections'

describe('EXEC_PLAN_SECTIONS_FULL', () => {
  it('contains exactly 10 sections', () => {
    // 2026-05-12 (Luiz/dev): CA-18 verbatim — exatamente 10 secoes harmonizadas
    expect(EXEC_PLAN_SECTIONS_FULL).toHaveLength(10)
  })

  it('sections in exact canonical order (case-sensitive)', () => {
    // 2026-05-12 (Luiz/dev): G7 — ordem exata case-sensitive; validador Plano 04 depende disso
    expect(EXEC_PLAN_SECTIONS_FULL[0]).toBe('Goal')
    expect(EXEC_PLAN_SECTIONS_FULL[1]).toBe('Scope')
    expect(EXEC_PLAN_SECTIONS_FULL[2]).toBe('Assumptions')
    expect(EXEC_PLAN_SECTIONS_FULL[3]).toBe('Risks')
    expect(EXEC_PLAN_SECTIONS_FULL[4]).toBe('Execution Steps')
    expect(EXEC_PLAN_SECTIONS_FULL[5]).toBe('Review Checklist')
    expect(EXEC_PLAN_SECTIONS_FULL[6]).toBe('Validation Log')
    expect(EXEC_PLAN_SECTIONS_FULL[7]).toBe('Compound Opportunity')
    expect(EXEC_PLAN_SECTIONS_FULL[8]).toBe('Lessons Captured')
    expect(EXEC_PLAN_SECTIONS_FULL[9]).toBe('Exit Criteria')
  })
})

describe('EXEC_PLAN_SECTIONS_QUICK', () => {
  it('contains exactly 7 sections', () => {
    // 2026-05-12 (Luiz/dev): Plano 05 A5 — 7 secoes para mini-planos (omite Assumptions/Risks/Review Checklist)
    expect(EXEC_PLAN_SECTIONS_QUICK).toHaveLength(7)
  })

  it('contains exactly Goal, Scope, Execution Steps, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria', () => {
    // 2026-05-12 (Luiz/dev): quick omite Assumptions, Risks, Review Checklist (overhead para tasks pequenas)
    expect(EXEC_PLAN_SECTIONS_QUICK[0]).toBe('Goal')
    expect(EXEC_PLAN_SECTIONS_QUICK[1]).toBe('Scope')
    expect(EXEC_PLAN_SECTIONS_QUICK[2]).toBe('Execution Steps')
    expect(EXEC_PLAN_SECTIONS_QUICK[3]).toBe('Validation Log')
    expect(EXEC_PLAN_SECTIONS_QUICK[4]).toBe('Compound Opportunity')
    expect(EXEC_PLAN_SECTIONS_QUICK[5]).toBe('Lessons Captured')
    expect(EXEC_PLAN_SECTIONS_QUICK[6]).toBe('Exit Criteria')
  })
})

describe('ExecPlanMode', () => {
  it('accepts full and quick as valid modes', () => {
    // 2026-05-12 (Luiz/dev): type guard — compila sem erro se ExecPlanMode eh union 'full'|'quick'
    const full: ExecPlanMode = 'full'
    const quick: ExecPlanMode = 'quick'
    expect(full).toBe('full')
    expect(quick).toBe('quick')
  })
})
