// 2026-05-19 (Luiz/dev): Step 10 leve — backup CLAUDE.md raiz antes de scaffold.
// PRD MH-05: sem extracao Akita; conteudo Akita sera sintetizado pela LLM no PLAN
// populate (Step 91, Plano 03). Destino fixo: docs/_legacy/CLAUDE.md.bak.
// G-local: NAO usar createBackup (helper para .anti-vibe/backup/{ts}/) — aqui o destino
// e simples e estavel, sem manifest JSON. Comportamento de falha: warning + prosseguir.
// Origem: arquivo foi 10-apply-merge-destructive.ts (linhagem via git mv, D3 CONTEXT).
// Plano 02 fase-03 (MH-05): try/catch + audit-log opcional adicionados ao skeleton do Plano 01 fase-04.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Step, StepContext, StepReport } from './types'
import { isDryRun } from '../dry-run-mode'
import type { AuditLogWriter } from '../audit-log'

const CLAUDE_FILENAME = 'CLAUDE.md'
const LEGACY_DIR_REL = path.join('docs', '_legacy')
const BACKUP_FILENAME = 'CLAUDE.md.bak'

export const backupPreMutationStep: Step = {
  id: '10-backup-pre-mutation',

  async run(ctx: StepContext): Promise<StepReport> {
    const claudeMdPath = path.join(ctx.cwd, CLAUDE_FILENAME)

    // Greenfield: CLAUDE.md ausente — skip silencioso
    const exists = await fs.access(claudeMdPath).then(() => true).catch(() => false)
    if (!exists) {
      return { mutated: false, summary: 'init-backup: CLAUDE.md ausente, skip' }
    }

    // Dry-run: nao escreve nada
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: 'init-backup: dry-run — would copy CLAUDE.md to docs/_legacy/CLAUDE.md.bak',
      }
    }

    const legacyDir = path.join(ctx.cwd, LEGACY_DIR_REL)
    const destPath = path.join(legacyDir, BACKUP_FILENAME)

    try {
      await fs.mkdir(legacyDir, { recursive: true })
      await fs.copyFile(claudeMdPath, destPath)
    } catch (err) {
      // G-local: permission denied / FS error — warning, NAO abortar init
      const message = err instanceof Error ? err.message : String(err)
      const writer = ctx.flags['__auditLog'] as AuditLogWriter | undefined
      await writer?.append({
        subagent_id: 'init-backup-pre-mutation',
        input_paths: [claudeMdPath],
        output_struct: { error: message, destPath },
        duration_ms: 0,
        retry_count: 0,
      })
      return {
        mutated: false,
        summary: `init-backup: write failed — ${message}. Init prossegue sem backup.`,
      }
    }

    return {
      mutated: true,
      summary: `init-backup: CLAUDE.md -> docs/_legacy/CLAUDE.md.bak`,
    }
  },
}
