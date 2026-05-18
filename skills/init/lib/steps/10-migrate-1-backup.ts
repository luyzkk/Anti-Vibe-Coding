// skills/init/lib/steps/10-migrate-1-backup.ts
import { detectV5Legacy } from '../detect-v5-legacy'
import { backupPlanning } from '../backup-planning'
import { AbortError } from './abort-error'
import type { Step } from './types'
import { isDryRun, isMigrateMode } from './helpers'

export const migrate1BackupStep: Step = {
  id: 'migrate-1-backup',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): no-op silencioso quando nao em modo migrate.
    // Preserva CA-01 (greenfield nao vai a SKILL.md linhas 102-128).
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    // 2026-05-17 (Luiz/dev): dry-run honrado — backupPlanning aceita dryRun: true
    // e retorna status='dry-run' sem tocar disco. PRD CA-03, MH-04.
    const dryRun = isDryRun(ctx.flags)

    const state = await detectV5Legacy(ctx.cwd)

    let result: Awaited<ReturnType<typeof backupPlanning>>
    try {
      result = await backupPlanning(ctx.cwd, { state, dryRun })
    } catch (err) {
      // 2026-05-17 (Luiz/dev): PRD CA-07 — backup falha (lock/permission/disk) aborta /init.
      // Preserva mensagem do helper como reason (byte-identico ao stdout antes da refatoracao).
      const reason = err instanceof Error ? err.message : String(err)
      throw new AbortError({ code: 1, reason })
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 116-121 (PRD R1, G1).
    if (result.status === 'created') {
      return {
        mutated: true,
        summary: 'Backup ' + result.filesCopied + ' files → ' + result.backupPath,
      }
    }
    if (result.status === 'already-exists') {
      return {
        mutated: false,
        summary: 'Backup already present at ' + result.backupPath + ' — proceeding (idempotent).',
      }
    }
    // status === 'dry-run' — SKILL.md linha 122 comenta "count logged, nothing written".
    // O dry-run report renderer (fase-05) consome esse retorno; aqui apenas no-op visivel.
    return { mutated: false, summary: '' }
  },
}
