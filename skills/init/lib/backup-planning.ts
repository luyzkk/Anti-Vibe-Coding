// 2026-05-11 (Luiz/dev): backup ATOMICO idempotente — R2/R14, M8.
// .planning/ + 3 .md legados copiados para .planning.v5-backup/.
// Rename atomico via diretorio temporario .planning.v5-backup.tmp/.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LegacyState } from './detect-v5-legacy'
import { copyRecursive } from './copy-recursive'

export const BACKUP_DIR = '.planning.v5-backup'
const TMP_DIR = '.planning.v5-backup.tmp'
const LOCK_FILE = '.planning.v5-backup.lock'

export type BackupResult = {
  status: 'created' | 'already-exists' | 'dry-run'
  backupPath: string
  filesCopied: number
}

export type BackupOptions = {
  dryRun?: boolean
  /** State da fase-01 — evita re-stat dos artefatos. */
  state: LegacyState
}

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

/**
 * Cria backup atomico em .planning.v5-backup/.
 * - Se diretorio destino ja existe: no-op (idempotente).
 * - Operacao: copia para .planning.v5-backup.tmp/ → rename final.
 * - Lock file impede execucoes concorrentes.
 * - dryRun: nao toca disco, retorna count estimado.
 */
export async function backupPlanning(
  targetDir: string,
  options: BackupOptions,
): Promise<BackupResult> {
  const backupPath = path.join(targetDir, BACKUP_DIR)
  const tmpPath = path.join(targetDir, TMP_DIR)
  const lockPath = path.join(targetDir, LOCK_FILE)

  // Idempotencia: backup ja foi feito.
  if (await exists(backupPath)) {
    return { status: 'already-exists', backupPath, filesCopied: 0 }
  }

  // Lock concorrencia: outro processo esta no meio do backup?
  if (await exists(lockPath)) {
    throw new Error(
      `Backup lock present at ${lockPath} — another /init may be running. ` +
      `If stale, delete manually and re-run.`,
    )
  }

  // Estimate files (necessario tanto para dryRun quanto para log).
  let filesCopied = 0
  for (const id of options.state.artifacts) {
    const src = options.state.paths[id]
    if (!src) continue
    const stat = await fs.stat(src)
    filesCopied += stat.isDirectory() ? await countFiles(src) : 1
  }

  if (options.dryRun) {
    return { status: 'dry-run', backupPath, filesCopied }
  }

  // Cria lock antes de qualquer side effect.
  await fs.writeFile(lockPath, `pid=${process.pid}\nstarted=${new Date().toISOString()}\n`, 'utf8')

  try {
    // Limpa qualquer tmp orfao de execucao anterior.
    await fs.rm(tmpPath, { recursive: true, force: true })
    await fs.mkdir(tmpPath, { recursive: true })

    // Copia cada artefato detectado em fase-01.
    for (const id of options.state.artifacts) {
      const src = options.state.paths[id]
      if (!src) continue
      const dst = path.join(tmpPath, path.basename(src))
      await copyRecursive(src, dst)
    }

    // RENAME ATOMICO — ponto de virada. Tudo ou nada.
    await fs.rename(tmpPath, backupPath)

    return { status: 'created', backupPath, filesCopied }
  } finally {
    // Lock sempre removido (mesmo em erro).
    await fs.rm(lockPath, { force: true }).catch(() => { /* swallow */ })
  }
}

async function countFiles(dir: string): Promise<number> {
  let n = 0
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      n += await countFiles(path.join(dir, e.name))
    } else {
      n += 1
    }
  }
  return n
}
