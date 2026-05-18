import type { StepResult } from './steps/types'

export type RunRollbackOptions = {
  readonly cwd: string
  readonly log?: (line: string) => void
  readonly askUser?: (prompt: string, options: readonly string[]) => Promise<string>
}

/**
 * 2026-05-18 (Luiz/dev): stub. Body completo eh entregue pelo Plano 05 fase-04
 * (le .anti-vibe/backup/{latest}/manifest.json, valida checksums, restaura,
 * registra ADR). Aqui apenas garantimos que o dispatcher detecta a flag e
 * invoca o helper sem quebrar contrato. PRD D24 (flag, nao skill separada),
 * D21 (dispatcher imutavel).
 */
export async function runRollback(opts: RunRollbackOptions): Promise<StepResult> {
  const log = opts.log ?? console.log
  log('[rollback] stub — real implementation lands in Plano 05 fase-04')
  return {
    kind: 'aborted',
    code: 1,
    reason: 'Rollback not yet implemented (Plano 05 fase-04)',
  }
}
