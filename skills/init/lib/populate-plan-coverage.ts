// 2026-05-19 (Luiz/dev): Plano 05 fase-04 do PRD populate-plan-andre-port (SH-4).
// Helper isolado para contagens de cobertura — Step 91 consome no audit log.
// G7 do README plano 05: tratar Map vazio como "uncovered todos" (defensivo — sinaliza erro upstream).

import type { StackAwareInputPaths } from './stack-aware-input-paths'
import type { PopulatePlanOutputV2 } from './populate-plan-generator'

/** Minimo esperado de fases por CA-01 do PRD populate-plan-andre-port. */
export const MIN_EXPECTED_PHASES = 12 as const

export type AuditCoverage = {
  /** Docs canonicos com >= 1 path real (`exists: true`). */
  readonly docsCoveredByStack: number
  /** Docs canonicos com 0 paths reais (todos `exists: false` ou lista vazia). */
  readonly docsWithoutCodeEvidence: number
  /** Comparativo: fases criadas vs minimo esperado. */
  readonly phasesCreatedVsExpected: {
    readonly created: number
    readonly minExpected: typeof MIN_EXPECTED_PHASES
  }
}

/**
 * Calcula 3 metricas de cobertura do plano populate gerado.
 *
 * - `docsCoveredByStack`: keys do `stackPaths` com pelo menos 1 path `exists: true`.
 * - `docsWithoutCodeEvidence`: keys do `stackPaths` com lista vazia OU todos `exists: false`.
 * - `phasesCreatedVsExpected`: `plan.phases.length` vs `MIN_EXPECTED_PHASES`.
 *
 * Map vazio (`stackPaths.size === 0`) e tratado como erro upstream — retorna ambas contagens 0.
 * Em runtime, stack `null` ou greenfield resultam em Map com keys do `GENERIC_CANDIDATES` (>=1 key).
 */
export function computeAuditCoverage(
  stackPaths: StackAwareInputPaths,
  plan: PopulatePlanOutputV2,
): AuditCoverage {
  let covered = 0
  let uncovered = 0
  for (const [, paths] of stackPaths) {
    if (paths.length === 0) {
      uncovered++
      continue
    }
    const hasReal = paths.some(p => p.exists)
    if (hasReal) covered++
    else uncovered++
  }
  return {
    docsCoveredByStack: covered,
    docsWithoutCodeEvidence: uncovered,
    phasesCreatedVsExpected: {
      created: plan.phases.length,
      minExpected: MIN_EXPECTED_PHASES,
    },
  }
}
