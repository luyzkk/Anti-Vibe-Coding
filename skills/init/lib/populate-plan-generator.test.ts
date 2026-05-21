// skills/init/lib/populate-plan-generator.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — RED-GREEN do renderer puro.
// renderAndrePlan: input estruturado → markdown com 10 secoes H2 (CA-07 do PRD init-refactor-v7).

import { test, expect, describe } from 'bun:test'
import { renderAndrePlan, extractH2Sections, type AndrePlanInput } from './populate-plan-generator'

const SAMPLE_INPUT: AndrePlanInput = {
  docPath: 'docs/SECURITY.md',
  goal: 'Document the security posture: auth, secrets, dependencies, OWASP top 10 coverage.',
  scope: {
    in: ['Auth flow', 'Secret management', 'CSP headers'],
    out: ['Pentest results', 'Compliance audit'],
  },
  assumptions: ['Project uses middleware-based auth', '.env.example exists in repo root'],
  risks: [
    { risk: 'Auth spread across multiple layers', mitigation: 'Wave 1 maps all auth touchpoints first' },
  ],
  waves: [
    { name: 'Wave 1 — Discovery', items: ['Read src/middleware.ts', 'Read src/lib/auth/'] },
    { name: 'Wave 2 — Write sections', items: ['Write ## Auth Flow', 'Write ## Secret Storage'] },
  ],
  reviewChecklist: ['No secrets in markdown', 'All claims linked to code'],
  compoundOpportunity: 'If auth pattern is novel, capture in docs/compound/.',
  exitCriteria: ['harness:validate passes', 'docs/SECURITY.md has no placeholders'],
}

describe('renderAndrePlan', () => {
  test('emits 10 H2 sections in canonical order (CA-07)', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(extractH2Sections(md)).toEqual([
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
    ])
  })

  test('includes H1 with docPath', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md.startsWith('# Populate: docs/SECURITY.md\n')).toBe(true)
  })

  test('renders Waves as H3 inside ## Execution Steps', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('### Wave 1 — Discovery')
    expect(md).toContain('### Wave 2 — Write sections')
  })

  test('renders Risks as markdown table', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('| Risco | Mitigacao |')
    expect(md).toContain('| Auth spread across multiple layers |')
  })

  test('Review Checklist uses checkbox syntax', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('- [ ] No secrets in markdown')
  })

  test('renders Scope with In/Out sub-blocks', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('**In:**')
    expect(md).toContain('**Out:**')
    expect(md).toContain('- Auth flow')
    expect(md).toContain('- Pentest results')
  })

  test('Validation Log + Lessons Captured emit empty placeholder comments', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('<!-- preencher durante execucao: comando + resultado -->')
    expect(md).toContain('<!-- preencher ao /iterate: links para docs/compound/ -->')
  })
})

describe('extractH2Sections', () => {
  test('returns only ## lines (ignores ### and #)', () => {
    const md = '# Title\n\n## A\n\n### Sub\n\n## B\n'
    expect(extractH2Sections(md)).toEqual(['## A', '## B'])
  })
})
