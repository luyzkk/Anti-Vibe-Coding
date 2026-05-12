// 2026-05-12 (Luiz/dev): TDD RED — renderExecPlan D18 (CA-18) contagem + ordem exata de secoes
import { describe, it, expect } from 'bun:test'
import { renderExecPlan, type ExecPlanInput } from './exec-plan-template'
import { EXEC_PLAN_SECTIONS_FULL, EXEC_PLAN_SECTIONS_QUICK } from './exec-plan-sections'

describe('renderExecPlan (mode: full)', () => {
  it('renders all 10 sections in canonical order', () => {
    // 2026-05-12 (Luiz/dev): RED anchor — conta H2 e compara com EXEC_PLAN_SECTIONS_FULL (CA-18)
    const output = renderExecPlan({ mode: 'full', title: 'Test Feature' })
    const h2Matches = Array.from(output.matchAll(/^## (.+)$/gm)).map((m) => m[1])
    expect(h2Matches).toHaveLength(10)
    expect(h2Matches).toEqual([...EXEC_PLAN_SECTIONS_FULL])
  })

  it('generates valid frontmatter with title, mode, status, created', () => {
    // 2026-05-12 (Luiz/dev): 03-G2 herdado — frontmatter status:active + created:YYYY-MM-DD
    const output = renderExecPlan({ mode: 'full', title: 'My Plan' })
    expect(output).toMatch(/^---\n/)
    expect(output).toContain('title: "My Plan"')
    expect(output).toContain('mode: full')
    expect(output).toContain('status: active')
    expect(output).toMatch(/created: \d{4}-\d{2}-\d{2}/)
  })

  it('includes title heading', () => {
    const output = renderExecPlan({ mode: 'full', title: 'Feature X' })
    expect(output).toContain('# Exec Plan: Feature X')
  })

  it('renders Goal from input if provided', () => {
    const output = renderExecPlan({ mode: 'full', title: 'X', goal: 'Ship the thing' })
    const goalSection = extractSection(output, 'Goal')
    expect(goalSection).toContain('- Ship the thing')
  })

  it('renders Goal with placeholder if not provided', () => {
    const output = renderExecPlan({ mode: 'full', title: 'X' })
    const goalSection = extractSection(output, 'Goal')
    expect(goalSection).toContain('<!-- preencher -->')
  })

  it('renders Assumptions as bullet list', () => {
    const output = renderExecPlan({
      mode: 'full',
      title: 'X',
      assumptions: ['A1', 'A2'],
    })
    const sec = extractSection(output, 'Assumptions')
    expect(sec).toContain('- A1')
    expect(sec).toContain('- A2')
  })

  it('renders Risks as bullet list', () => {
    const output = renderExecPlan({
      mode: 'full',
      title: 'X',
      risks: ['High risk', 'Medium risk'],
    })
    const sec = extractSection(output, 'Risks')
    expect(sec).toContain('- High risk')
    expect(sec).toContain('- Medium risk')
  })

  it('renders Review Checklist as checkbox list', () => {
    const output = renderExecPlan({
      mode: 'full',
      title: 'X',
      reviewChecklist: ['Run tests', 'Check lint'],
    })
    const sec = extractSection(output, 'Review Checklist')
    expect(sec).toContain('- [ ] Run tests')
    expect(sec).toContain('- [ ] Check lint')
  })

  it('Validation Log uses during-execution placeholder', () => {
    const output = renderExecPlan({ mode: 'full', title: 'X' })
    const sec = extractSection(output, 'Validation Log')
    expect(sec).toContain('<!-- preencher durante execucao')
  })

  it('Compound Opportunity uses iterate placeholder', () => {
    const output = renderExecPlan({ mode: 'full', title: 'X' })
    const sec = extractSection(output, 'Compound Opportunity')
    expect(sec).toContain('<!-- preencher ao /iterate')
  })

  it('Lessons Captured uses iterate placeholder', () => {
    const output = renderExecPlan({ mode: 'full', title: 'X' })
    const sec = extractSection(output, 'Lessons Captured')
    expect(sec).toContain('<!-- preencher ao /iterate')
  })

  it('Exit Criteria renders as checkboxes if provided', () => {
    const output = renderExecPlan({
      mode: 'full',
      title: 'X',
      exitCriteria: ['All tests pass', 'No lint errors'],
    })
    const sec = extractSection(output, 'Exit Criteria')
    expect(sec).toContain('- [ ] All tests pass')
    expect(sec).toContain('- [ ] No lint errors')
  })
})

describe('renderExecPlan (mode: quick)', () => {
  it('renders exactly 7 sections in canonical quick order', () => {
    // 2026-05-12 (Luiz/dev): modo quick — 7 secoes sem Assumptions/Risks/Review Checklist
    const output = renderExecPlan({ mode: 'quick', title: 'Quick Task' })
    const h2Matches = Array.from(output.matchAll(/^## (.+)$/gm)).map((m) => m[1])
    expect(h2Matches).toHaveLength(7)
    expect(h2Matches).toEqual([...EXEC_PLAN_SECTIONS_QUICK])
  })

  it('does not include Assumptions, Risks, or Review Checklist', () => {
    const output = renderExecPlan({ mode: 'quick', title: 'Quick' })
    expect(output).not.toContain('## Assumptions')
    expect(output).not.toContain('## Risks')
    expect(output).not.toContain('## Review Checklist')
  })
})

/** Extract content of a named H2 section up to the next H2 */
function extractSection(content: string, name: string): string {
  const pattern = new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = content.match(pattern)
  return match?.[1] ?? ''
}
