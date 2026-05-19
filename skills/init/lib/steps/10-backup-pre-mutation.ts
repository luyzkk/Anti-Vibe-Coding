// 2026-05-19 (Luiz/dev): Plano 01 fase-04 — Step 10 reduzido a backup-pre-mutation leve.
// PRD MH-05: copia CLAUDE.md raiz para docs/_legacy/CLAUDE.md.bak antes de qualquer scaffold.
// Sem transformacao destrutiva, sem classificacao Akita, sem gerar docs/DESIGN.md.
// Esqueleto minimo — Plano 02 fase-03 expande para outros docs raiz + manifest do backup.
// Origem: arquivo foi 10-apply-merge-destructive.ts (linhagem preservada via git mv, D3 CONTEXT).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Step } from './types'
import { isDryRun } from '../dry-run-mode'

const LEGACY_DIR = 'docs/_legacy'
const CLAUDE_BACKUP_NAME = 'CLAUDE.md.bak'

export const backupPreMutationStep: Step = {
  id: '10-backup-pre-mutation',
  async run(ctx) {
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: 'dry-run: would back up CLAUDE.md to docs/_legacy/CLAUDE.md.bak (if present)',
      }
    }

    const claudePath = path.join(ctx.cwd, 'CLAUDE.md')
    const exists = await fs.access(claudePath).then(() => true).catch(() => false)
    if (!exists) {
      return { mutated: false, summary: 'backup-pre-mutation: CLAUDE.md raiz nao encontrado — skip' }
    }

    const legacyDir = path.join(ctx.cwd, LEGACY_DIR)
    await fs.mkdir(legacyDir, { recursive: true })
    const targetPath = path.join(legacyDir, CLAUDE_BACKUP_NAME)
    await fs.copyFile(claudePath, targetPath)

    return {
      mutated: true,
      summary: `backup-pre-mutation: CLAUDE.md -> ${LEGACY_DIR}/${CLAUDE_BACKUP_NAME}`,
    }
  },
}
