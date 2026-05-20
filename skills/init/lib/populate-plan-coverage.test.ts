// 2026-05-19 (Luiz/dev): Plano 05 fase-04 do PRD populate-plan-andre-port (SH-4).

import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { computeAuditCoverage, MIN_EXPECTED_PHASES } from './populate-plan-coverage'
import type { StackAwareInputPaths, CanonicalDoc } from './stack-aware-input-paths'
import type { PopulatePlanOutputV2, PopulatePlanPhase } from './populate-plan-generator'
import { stackAwareInputPaths } from './stack-aware-input-paths'
import { generatePopulatePlanV2 } from './populate-plan-generator'

const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'stack-aware')

function mockPlan(phaseCount: number): PopulatePlanOutputV2 {
  const phases: PopulatePlanPhase[] = Array.from({ length: phaseCount }, (_, i) => ({
    fase: i + 1,
    docCanonico: `dummy-${i}.md`,
    inputsDocs: [],
    inputsCode: [],
    instrucaoLLM: { fontes: ['dummy'], secoes: ['dummy'], honestidade: 'dummy' },
    criterioDone: '',
  }))
  return {
    planIndexMarkdown: '',
    phaseFiles: new Map(),
    relativeFolderPath: '',
    phases,
  }
}

describe('computeAuditCoverage', () => {
  it('Map vazio retorna 0/0', () => {
    const result = computeAuditCoverage(new Map(), mockPlan(0))
    expect(result.docsCoveredByStack).toBe(0)
    expect(result.docsWithoutCodeEvidence).toBe(0)
    expect(result.phasesCreatedVsExpected.created).toBe(0)
    expect(result.phasesCreatedVsExpected.minExpected).toBe(MIN_EXPECTED_PHASES)
  })

  it('todas as keys cobertas (exists: true em pelo menos 1 path)', () => {
    const stackPaths: StackAwareInputPaths = new Map<CanonicalDoc, ReadonlyArray<{path: string; exists: boolean}>>([
      ['ARCHITECTURE.md', [{ path: 'a.ts', exists: true }]],
      ['AGENTS.md', [{ path: 'b.ts', exists: true }, { path: 'c.ts', exists: false }]],
    ])
    const result = computeAuditCoverage(stackPaths, mockPlan(12))
    expect(result.docsCoveredByStack).toBe(2)
    expect(result.docsWithoutCodeEvidence).toBe(0)
  })

  it('todas as keys sem evidencia (exists: false ou lista vazia)', () => {
    const stackPaths: StackAwareInputPaths = new Map<CanonicalDoc, ReadonlyArray<{path: string; exists: boolean}>>([
      ['ARCHITECTURE.md', [{ path: 'a.ts', exists: false }]],
      ['AGENTS.md', []],
    ])
    const result = computeAuditCoverage(stackPaths, mockPlan(0))
    expect(result.docsCoveredByStack).toBe(0)
    expect(result.docsWithoutCodeEvidence).toBe(2)
  })

  it('mistura — 1 coberta + 1 sem evidencia', () => {
    const stackPaths: StackAwareInputPaths = new Map<CanonicalDoc, ReadonlyArray<{path: string; exists: boolean}>>([
      ['ARCHITECTURE.md', [{ path: 'a.ts', exists: true }]],
      ['AGENTS.md', [{ path: 'b.ts', exists: false }]],
    ])
    const result = computeAuditCoverage(stackPaths, mockPlan(2))
    expect(result.docsCoveredByStack).toBe(1)
    expect(result.docsWithoutCodeEvidence).toBe(1)
  })

  it('phasesCreatedVsExpected reflete plan.phases.length sem regressao', () => {
    const result = computeAuditCoverage(new Map(), mockPlan(15))
    expect(result.phasesCreatedVsExpected.created).toBe(15)
    expect(result.phasesCreatedVsExpected.minExpected).toBe(12)
  })

  it('integration: fixture Next.js+Supabase tem docsCoveredByStack >= 4', async () => {
    // 2026-05-19 (Luiz/dev): integration test — apos Plano 04 fase-01 (8 docs novos cobertos),
    // fixture nextjs-supabase tem >= 4 docs com paths reais (ARCHITECTURE, SECURITY, RELIABILITY +
    // outros que tocam src/app/page.tsx, package.json).
    const cwd = path.join(FIXTURES, 'nextjs-supabase')
    const stackPaths = await stackAwareInputPaths(cwd, 'nextjs')
    const plan = await generatePopulatePlanV2({
      cwd,
      projectName: 'fixture',
      manifest: [],
      stackPaths,
    })
    const result = computeAuditCoverage(stackPaths, plan)
    expect(result.docsCoveredByStack).toBeGreaterThanOrEqual(4)
    expect(result.phasesCreatedVsExpected.created).toBeGreaterThanOrEqual(12)
  })
})
