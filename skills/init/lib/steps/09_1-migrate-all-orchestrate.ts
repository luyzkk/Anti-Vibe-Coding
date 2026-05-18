// skills/init/lib/steps/09_1-migrate-all-orchestrate.ts
import { orchestrateMigration } from '../migrate-orchestrator'
import { renderDryRunReport } from '../dry-run-renderer'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 herdado de fase-02.
// migrate.0 e migrate.all sao no-op quando args[0] !== 'migrate'.
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrateAllOrchestrateStep: Step = {
  id: 'migrate-all',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = ctx.flags['dry-run'] === true

    // 2026-05-17 (Luiz/dev): DI-5-1 desta fase — migrate.all SOMENTE roda em dry-run.
    // Em real mode eh NO-OP (migrate.1/2/3/4 individuais fazem o trabalho).
    // PRD CA-03, CA-10. SKILL.md linhas 57-75 (leitura literal: process.exit(0) em dry-run apenas).
    // Flag para revisao do dev: se migrate.all DEVE rodar em real mode tambem como forma atomica,
    // reverter para modelo exclusivo onde migrate.all roda e retorna skipRemaining em ambos os casos.
    if (!dryRun) {
      return { mutated: false, summary: '' }
    }

    const report = await orchestrateMigration(ctx.cwd, { dryRun: true })
    const reportText = renderDryRunReport(report)

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 73 (PRD R1, G1).
    // O '\n' inicial da string original eh preservado via '\n\n' antes de "Re-run".
    const summary = reportText + '\n\nRe-run without --dry-run to apply.'

    // 2026-05-17 (Luiz/dev): skipRemaining=true mapeia process.exit(0) do SKILL.md linha 74.
    // Pattern alinhado com reuseDiscoveryStep (Plano 02 fase-06). PRD MH-04, G6 do plano.
    return {
      mutated: false,
      summary,
      skipRemaining: true,
    }
  },
}
