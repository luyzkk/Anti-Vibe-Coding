// 2026-05-19 (Luiz/dev): Plano 04 fase-02 — backup pre-6.5.0 antes de mutacao (MH-07, CA-03).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { isDryRun } from '../dry-run-mode'
import type { Step } from './types'
import type { AuditLogWriter } from '../audit-log'

const LEGACY_ROOT = 'docs/_legacy/pre-6.5.0'

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Backup completo de docs/ antes de re-popular projetos < 6.5.0 (PRD MH-07, CA-03).
 * Idempotente: segunda execucao sufixa com `-{timestamp}`.
 *
 * G6 do plano: docs/_legacy/pre-6.5.0 esta DENTRO de docs/. fs.cp rejeita src -> subdir de si
 * mesmo no nivel de path check (antes do filter). Solucao: copiar docs/ para tmpdir fora do cwd,
 * excluindo _legacy manualmente, depois mover para o destino final.
 */
export const backupPre650Step: Step = {
  id: '00_3-backup-pre-6_5_0',
  async run(ctx) {
    const flags = ctx.flags as Record<string, string | boolean>
    if (flags['__reentryMode'] !== 're-populate') {
      return { mutated: false, summary: 'skipped (reentry mode is not re-populate)' }
    }

    const srcDir = path.join(ctx.cwd, 'docs')
    if (!(await pathExists(srcDir))) {
      return { mutated: false, summary: 'skipped (docs/ does not exist — nothing to back up)' }
    }

    let dstDir = path.join(ctx.cwd, LEGACY_ROOT)
    if (await pathExists(dstDir)) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      dstDir = path.join(ctx.cwd, `${LEGACY_ROOT}-${ts}`)
    }

    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: `dry-run: would copy ${path.relative(ctx.cwd, srcDir)} -> ${path.relative(ctx.cwd, dstDir)}`,
      }
    }

    // Copy docs/ -> tmpdir (outside cwd to avoid fs.cp "subdirectory of self" path check),
    // excluding _legacy to prevent recursive inclusion (G6).
    const legacySegment = path.join('docs', '_legacy')
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-pre650-'))
    try {
      await fs.cp(srcDir, tmp, {
        recursive: true,
        filter: (source: string) => !source.includes(legacySegment),
      })
      await fs.mkdir(path.dirname(dstDir), { recursive: true })
      await fs.rename(tmp, dstDir)
    } catch {
      // rename across filesystems fails — fall back to cp then rm
      await fs.cp(tmp, dstDir, { recursive: true })
      await fs.rm(tmp, { recursive: true, force: true })
    }

    const writer = flags['__auditLog'] as unknown as AuditLogWriter | undefined
    await writer?.append({
      subagent_id: 'init.backup-pre-6_5_0',
      input_paths: [srcDir],
      output_struct: { dst: path.relative(ctx.cwd, dstDir) },
      duration_ms: 0,
      retry_count: 0,
    })

    return {
      mutated: true,
      summary: `backup completo: docs/ -> ${path.relative(ctx.cwd, dstDir)}`,
    }
  },
}
