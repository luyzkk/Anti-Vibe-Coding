// skills/init/lib/steps/11-migrate-2-planning.ts
// 2026-05-17 (Luiz/dev): Step migrate.2 — envelopa migratePlanning (helper preservado).
// Plano 03 fase-03. PRD MH-05, CA-07. SKILL.md linhas 132-156 (intocado).
import { migratePlanning } from '../migrate-planning'
import { AbortError } from './abort-error'
import type { Step } from './types'
import { isDryRun, isMigrateMode } from './helpers'

export const migrate2PlanningStep: Step = {
  id: 'migrate-2-planning',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = isDryRun(ctx.flags)
    const report = await migratePlanning(ctx.cwd, { dryRun })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 143-146 (PRD R1, G1).
    // console.log('key:', value) produz 'key: value' — replicado com concatenacao '+'.
    const lines = [
      'Migration: ' + report.status,
      '  entries: ' + report.entries,
      '  written: ' + report.written.length,
      '  skipped: ' + report.skipped.length,
    ]

    // 2026-05-17 (Luiz/dev): DI-3-1 desta fase — se ha conflicts, as 4 linhas de relatorio
    // + 2 linhas de CONFLICT viram a reason inteira da AbortError (PRD MH-05, CA-07).
    // Dispatcher emite e.reason via log — as 4 linhas nao se perdem no caso de conflict.
    // SKILL.md linha 149: c.target (path absoluto). SKILL.md linha 150: wording byte-identico.
    if (report.conflicts.length > 0) {
      const conflictLines = [
        '  CONFLICTS: ' + report.conflicts.map((c) => c.target).join(', '),
        '  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.',
      ]
      const reason = lines.concat(conflictLines).join('\n')
      throw new AbortError({ code: 1, reason })
    }

    // 2026-05-17 (Luiz/dev): mutated=true somente quando status='completed' (algo foi escrito).
    // dry-run retorna status='dry-run' → mutated=false. partial nunca chega aqui (conflicts>0 acima).
    return {
      mutated: report.status === 'completed',
      summary: lines.join('\n'),
    }
  },
}
