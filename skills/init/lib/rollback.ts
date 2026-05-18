// 2026-05-18 (Luiz/dev): impl completa — MH-07 + CA-06 + CA-10 + D10 + D24 + D29

import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  getLatestBackupDir,
  readBackupManifest,
  computeSha256,
  type BackupManifest,
  type BackupManifestEntry,
} from './backup-anti-vibe'
import type { StepResult } from './steps/types'
import { INIT_SUBAGENT_IDS } from './init-subagent-ids'
import type { AuditLogWriter } from './audit-log'

export type RollbackResult = {
  readonly restored: ReadonlyArray<string>
  readonly skipped: ReadonlyArray<string>
  readonly errors: ReadonlyArray<{ readonly path: string; readonly message: string }>
  readonly adrPath: string | null
  readonly backupDir: string | null
  readonly userCancelled: boolean
}

export type ExecuteRollbackOptions = {
  readonly cwd: string
  readonly askUser?: (prompt: string, options: readonly string[]) => Promise<string>
  readonly log?: (line: string) => void
}

export async function executeRollback(opts: ExecuteRollbackOptions): Promise<RollbackResult> {
  const log = opts.log ?? console.log

  // 1. Localizar backup mais recente
  const backupDir = await getLatestBackupDir(opts.cwd)
  if (backupDir === null) {
    return {
      restored: [],
      skipped: [],
      errors: [{ path: '.', message: 'no backup found' }],
      adrPath: null,
      backupDir: null,
      userCancelled: false,
    }
  }

  // 2. Ler manifest D29
  let manifest: BackupManifest
  try {
    manifest = await readBackupManifest(backupDir)
  } catch (e) {
    return {
      restored: [],
      skipped: [],
      errors: [{ path: backupDir, message: `Backup integrity check failed: invalid manifest schema (${e instanceof Error ? e.message : String(e)})` }],
      adrPath: null,
      backupDir,
      userCancelled: false,
    }
  }

  // 3. Validar checksums de TODOS os arquivos ANTES de restaurar (CA-10)
  for (const entry of manifest.files) {
    const backupPath = path.join(backupDir, entry.backupPath)
    let currentSha: string
    try {
      currentSha = await computeSha256(backupPath)
    } catch {
      return {
        restored: [],
        skipped: [],
        errors: [{ path: entry.originalPath, message: `Backup integrity check failed: ${entry.backupPath} not accessible` }],
        adrPath: null,
        backupDir,
        userCancelled: false,
      }
    }
    if (currentSha !== entry.sha256) {
      return {
        restored: [],
        skipped: [],
        errors: [{ path: entry.originalPath, message: `Backup integrity check failed: ${entry.backupPath} sha256 mismatch (expected ${entry.sha256}, got ${currentSha})` }],
        adrPath: null,
        backupDir,
        userCancelled: false,
      }
    }
  }

  // 4. Perguntar confirmacao ao dev
  const prompt = `Will restore ${manifest.files.length} files from backup ${path.basename(backupDir)}.\nConfirm rollback?`
  if (opts.askUser !== undefined) {
    const answer = await opts.askUser(prompt, ['Confirm', 'Cancel'])
    if (answer !== 'Confirm') {
      return {
        restored: [],
        skipped: manifest.files.map((f) => f.originalPath),
        errors: [],
        adrPath: null,
        backupDir,
        userCancelled: true,
      }
    }
  } else {
    log('No askUser injected — proceeding with rollback non-interactively.')
  }

  // 5. Restaurar cada arquivo
  const restored: string[] = []
  const errors: Array<{ path: string; message: string }> = []
  for (const entry of manifest.files) {
    try {
      await restoreEntry(backupDir, entry, opts.cwd)
      restored.push(entry.originalPath)
    } catch (e) {
      errors.push({ path: entry.originalPath, message: e instanceof Error ? e.message : String(e) })
    }
  }

  // 6. Escrever ADR
  let adrPath: string | null = null
  if (errors.length === 0) {
    try {
      adrPath = await writeRollbackAdr({
        cwd: opts.cwd,
        backupTimestamp: manifest.timestamp,
        gitSha: manifest.gitSha,
        restoredFiles: restored,
      })
    } catch (e) {
      errors.push({
        path: 'docs/design-docs/ADR-*-rollback-init-*.md',
        message: `ADR write failed: ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

  return { restored, skipped: [], errors, adrPath, backupDir, userCancelled: false }
}

// 2026-05-18 (Luiz/dev): restoreEntry suporta 3 actions do schema D29
async function restoreEntry(backupDir: string, entry: BackupManifestEntry, cwd: string): Promise<void> {
  const backupAbs = path.join(backupDir, entry.backupPath)
  const originalAbs = path.join(cwd, entry.originalPath)

  await fs.mkdir(path.dirname(originalAbs), { recursive: true })

  if (entry.action === 'overwrite' || entry.action === 'transform' || entry.action === 'move') {
    // 2026-05-18 (Luiz/dev): para 'move', restora conteudo no originalPath (stub residual permanece — D29 nao tem campo movedTo, limitacao conhecida v6.4.0).
    await fs.copyFile(backupAbs, originalAbs)
    return
  }

  throw new Error(`unknown action: ${entry.action}`)
}

// 2026-05-18 (Luiz/dev): writeRollbackAdr — G9 do plano05: pega MAIOR numero existente + 1.
async function writeRollbackAdr(input: {
  cwd: string
  backupTimestamp: string
  gitSha: string | null
  restoredFiles: ReadonlyArray<string>
}): Promise<string> {
  const adrDir = path.join(input.cwd, 'docs', 'design-docs')
  await fs.mkdir(adrDir, { recursive: true })

  const existing = await listExistingAdrs(adrDir)
  const maxNum = existing.reduce((max, n) => Math.max(max, n), 0)
  const nextNum = String(maxNum + 1).padStart(4, '0')

  // 2026-05-18 (Luiz/dev): import.meta.dir = skills/init/lib; um nivel acima = skills/init
  const templatePath = path.join(
    import.meta.dir,
    '..',
    'assets',
    'snippets',
    'rollback-adr-template.md',
  )
  const template = await fs.readFile(templatePath, 'utf8')

  const today = new Date().toISOString().slice(0, 10)
  const restoredList = input.restoredFiles.map((p) => `- ${p}`).join('\n')
  const rendered = template
    .replaceAll('{NUMBER}', nextNum)
    .replaceAll('{date}', today)
    .replaceAll('{backup_ts}', input.backupTimestamp)
    .replaceAll('{git_sha}', input.gitSha ?? 'null')
    .replaceAll('{N}', String(input.restoredFiles.length))
    .replaceAll('{restored_files_list}', restoredList)

  const adrPath = path.join(adrDir, `ADR-${nextNum}-rollback-init-${today}.md`)
  await fs.writeFile(adrPath, rendered, 'utf8')
  return adrPath
}

async function listExistingAdrs(adrDir: string): Promise<number[]> {
  try {
    const files = await fs.readdir(adrDir)
    return files
      .map((f) => {
        const m = f.match(/^ADR-(\d{4})-/)
        return m !== null ? parseInt(m[1] ?? '0', 10) : null
      })
      .filter((n): n is number => n !== null && !Number.isNaN(n))
  } catch {
    return []
  }
}

// ── Legacy: runRollback (dispatcher bridge to executeRollback) ─────────────────

export type RunRollbackOptions = {
  readonly cwd: string
  readonly log?: (line: string) => void
  readonly askUser?: (prompt: string, options: readonly string[]) => Promise<string>
  /** 2026-05-18 (Luiz/dev): Plano 06 fase-01 — writer injetado pelo dispatcher para CA-14. */
  readonly auditWriter?: AuditLogWriter
}

/**
 * Dispatcher bridge — chamado pelo run-init.ts quando flag --rollback esta presente.
 * Delega para executeRollback e adapta RollbackResult para StepResult.
 */
export async function runRollback(opts: RunRollbackOptions): Promise<StepResult> {
  const startMs = performance.now()
  const log = opts.log ?? console.log
  const execOpts: ExecuteRollbackOptions = opts.askUser !== undefined
    ? { cwd: opts.cwd, log, askUser: opts.askUser }
    : { cwd: opts.cwd, log }
  const result = await executeRollback(execOpts)

  await opts.auditWriter?.append({
    subagent_id: INIT_SUBAGENT_IDS.rollback,
    input_paths: [opts.cwd],
    output_struct: {
      restoredCount: result.restored.length,
      errorCount: result.errors.length,
      userCancelled: result.userCancelled,
      adrPath: result.adrPath,
      backupDir: result.backupDir,
    },
    duration_ms: Math.round(performance.now() - startMs),
    retry_count: 0,
  })

  if (result.userCancelled) {
    log('[rollback] cancelled by user.')
    return { kind: 'ok', report: { mutated: false, summary: 'rollback cancelled' } }
  }
  if (result.errors.length > 0) {
    log(`[rollback] ${result.errors.length} error(s):`)
    for (const e of result.errors) {
      log(`  ${e.path}: ${e.message}`)
    }
    return { kind: 'aborted', code: 1, reason: result.errors[0]?.message ?? 'rollback failed' }
  }
  log(`[rollback] restored ${result.restored.length} files. ADR: ${result.adrPath ?? '(none)'}`)
  return { kind: 'ok', report: { mutated: true, summary: `rollback restored ${result.restored.length} files` } }
}
