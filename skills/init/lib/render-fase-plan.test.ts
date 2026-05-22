// skills/init/lib/render-fase-plan.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-01 — RED test antes do GREEN do renderer.
// Snapshot fixa as 10 H2 na ordem literal da ADR-0022.

import { describe, test, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { renderFasePlan, extractH2Sections, type FasePlanInput } from './render-fase-plan'

const SAMPLE: FasePlanInput = {
  docPath: 'docs/SECURITY.md',
  schemaVersion: 1,
  goal: 'Document the security posture: auth, secrets handling, data classification.',
  scope: {
    in: ['Auth model', 'Secrets handling'],
    out: ['Pentest reports (lives elsewhere)'],
  },
  assumptions: ['Project has auth in scope'],
  risks: [{ risk: 'Secrets leaked to logs', mitigation: 'Use redactor in logger' }],
  waves: [
    { name: 'Wave 1 — Discovery', items: ['grep `process.env`', 'list auth middlewares'] },
    { name: 'Wave 2 — Write sections', items: ['Write H2: Auth Flow', 'Write H2: Secrets'] },
  ],
  reviewChecklist: ['No real secrets in examples', 'Auth flow links to source'],
  compoundOpportunity: 'Auth misconfigurations belong in docs/compound/ as a gotcha note.',
  exitCriteria: ['harness:validate passes for docs/SECURITY.md', 'Zero placeholders'],

  guidanceFile: 'skills/init/assets/populate-guidance/docs-security-md.md',
  detectionSignals: ['process.env\\.', 'JWT_SECRET', 'cors\\(', 'helmet\\('],
  mustCover: {
    'Auth Flow': ['provider', 'session lifecycle', 'refresh strategy'],
    'Secrets': ['where stored', 'rotation policy', 'access audit'],
  },
  linkTargets: ['docs/ARCHITECTURE.md#components', 'docs/MERGE_GATES.md'],
  stackVariants: {
    rails: 'See devise + rails-secrets conventions',
    nextjs: 'See next-auth + env.local conventions',
    'node-ts': 'See dotenv-safe + custom JWT conventions',
  },
  validationCommand: 'bun run harness:validate',
  dependsOn: [],
}

describe('renderFasePlan (FasePlanInput v1)', () => {
  test('emits H2 in the exact order from ADR-0022 (Andre parity)', () => {
    const md = renderFasePlan(SAMPLE)
    const h2s = extractH2Sections(md)

    expect(h2s).toEqual([
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
      '## Final Report Contract',
    ])
  })

  test('Validation Log / Lessons Captured render as placeholders', () => {
    const md = renderFasePlan(SAMPLE)
    expect(md).toContain('<!-- preencher durante execucao: comando + resultado -->')
    expect(md).toContain('<!-- preencher ao /iterate: links para docs/compound/ -->')
  })

  test('Final Report Contract is hardcoded (NOT a field on FasePlanInput)', () => {
    const md = renderFasePlan(SAMPLE)
    expect(md).toContain('## Final Report Contract')
    expect(md).toContain('Files added')
    expect(md).toContain('Files customized')
    expect(md).toContain('Files unchanged')
    expect(md).toContain('Unresolved TODOs')
    expect(md).toContain('Validation result')
    expect(md).toContain('First plan path')
  })

  test('guidanceFile / detectionSignals / linkTargets / stackVariants render in header / dedicated blocks', () => {
    const md = renderFasePlan(SAMPLE)
    expect(md).toContain('**Guidance file:**')
    expect(md).toContain('skills/init/assets/populate-guidance/docs-security-md.md')
    expect(md).toContain('**Detection signals (grep before writing):**')
    expect(md).toContain('**Required outbound links:**')
    expect(md).toContain('**Stack variants:**')
  })

  test('matches golden snapshot (byte-stable)', async () => {
    const goldenPath = path.join(import.meta.dir, '__golden__', 'fase-plan-sample.md')
    const expected = await fs.readFile(goldenPath, 'utf-8')
    const actual = renderFasePlan(SAMPLE)
    expect(actual).toBe(expected)
  })
})
