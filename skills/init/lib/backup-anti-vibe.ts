// 2026-05-18 (Luiz/dev): manifest canonico D29 — 4 funcoes pub + idempotencia RNF-04.
// Contrato com planos 04/05: NUNCA renomear campos do manifest (G3).
// DI-2: readGitSha usa fs.readFile direto, nao child_process — funciona sem `git` no PATH.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

// ── Constants ─────────────────────────────────────────────────────────────────

const BACKUP_ROOT_REL = '.anti-vibe/backup'
const TS_FOLDER_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/

// ── Types ─────────────────────────────────────────────────────────────────────

export type BackupAction = 'overwrite' | 'move' | 'transform'

export type BackupManifestEntry = {
  readonly originalPath: string  // relativo ao cwd
  readonly backupPath: string    // relativo ao backup root
  readonly sha256: string
  readonly action: BackupAction
}

export type BackupManifest = {
  readonly timestamp: string  // ISO 8601 com Z (UTC)
  readonly files: ReadonlyArray<BackupManifestEntry>
  readonly gitSha: string | null
}

export type CreateBackupInput = {
  readonly cwd: string
  readonly files: ReadonlyArray<{
    readonly originalPath: string
    readonly action: BackupAction
  }>
  /** Injetavel em testes para determinismo. Default: () => new Date() */
  readonly clock?: () => Date
}

export type CreateBackupResult = {
  readonly backupDir: string  // path absoluto: `{cwd}/.anti-vibe/backup/{ts}/`
  readonly manifest: BackupManifest
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Formata Date para nome de pasta path-safe: `2026-05-18T14-30-00Z` (sem milissegundos). */
function formatTimestampPathSafe(date: Date): string {
  // toISOString() retorna "2026-05-18T14:30:00.000Z"
  // Remover milissegundos, trocar ":" por "-", manter "T" e "Z"
  return date.toISOString()
    .replace(/\.\d{3}Z$/, 'Z')  // remove .000Z, appends Z
    .replace(/:/g, '-')           // ":" → "-" (G5 Windows)
}

/**
 * Le gitSha via fs.readFile direto (sem child_process).
 * Suporta: ref normal, detached HEAD, ausencia de .git.
 * G6: ausencia de .git → null silencioso.
 */
async function readGitSha(cwd: string): Promise<string | null> {
  const headPath = path.join(cwd, '.git', 'HEAD')
  let headContent: string
  try {
    headContent = await fs.readFile(headPath, 'utf8')
  } catch {
    return null  // .git nao existe — silencioso (G6)
  }

  const trimmed = headContent.trim()

  // Detached HEAD: ja e um sha (40 chars hex)
  if (/^[0-9a-f]{40}$/i.test(trimmed)) {
    return trimmed
  }

  // Ref normal: "ref: refs/heads/main"
  const refMatch = trimmed.match(/^ref:\s+(.+)$/)
  if (!refMatch) return null

  const refName = refMatch[1] ?? ''
  if (!refName) return null
  const refPath = path.join(cwd, '.git', refName)
  try {
    const refContent = await fs.readFile(refPath, 'utf8')
    return refContent.trim() || null
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Computa SHA-256 via stream (sem carregar em memoria). Retorna hex digest 64 chars. */
export async function computeSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = (await import('node:fs')).createReadStream(filePath)

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve())
    stream.on('error', reject)
  })

  return hash.digest('hex')
}

/**
 * Retorna o diretorio de backup mais recente (lexicografico = cronologico) ou null.
 * Filtra por regex de timestamp path-safe.
 */
export async function getLatestBackupDir(cwd: string): Promise<string | null> {
  const root = path.join(cwd, BACKUP_ROOT_REL)

  try {
    await fs.access(root)
  } catch {
    return null
  }

  const entries = await fs.readdir(root)
  const valid = entries.filter((e) => TS_FOLDER_REGEX.test(e)).sort()

  if (valid.length === 0) return null
  const last = valid[valid.length - 1]
  return last !== undefined ? path.join(root, last) : null
}

/**
 * Le e valida manifest.json de um backup dir.
 * Lanca erro descritivo se malformado (G3 campos canonicos).
 */
export async function readBackupManifest(backupDir: string): Promise<BackupManifest> {
  const manifestPath = path.join(backupDir, 'manifest.json')
  let raw: string
  try {
    raw = await fs.readFile(manifestPath, 'utf8')
  } catch {
    throw new Error(`Backup manifest at ${manifestPath} is malformed: file not found`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Backup manifest at ${manifestPath} is malformed: invalid JSON`)
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Backup manifest at ${manifestPath} is malformed: not an object`)
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj['timestamp'] !== 'string') {
    throw new Error(`Backup manifest at ${manifestPath} is malformed: missing string field 'timestamp'`)
  }
  if (!Array.isArray(obj['files'])) {
    throw new Error(`Backup manifest at ${manifestPath} is malformed: 'files' must be array`)
  }
  if (obj['gitSha'] !== null && typeof obj['gitSha'] !== 'string') {
    throw new Error(`Backup manifest at ${manifestPath} is malformed: 'gitSha' must be string or null`)
  }

  return parsed as BackupManifest
}

/**
 * Cria backup canonico com manifest JSON.
 * G4 idempotencia: se ultimo backup ja contem os mesmos originalPath + sha256,
 * retorna backupDir existente SEM criar pasta nova.
 */
export async function createBackup(input: CreateBackupInput): Promise<CreateBackupResult> {
  const { cwd, files, clock = () => new Date() } = input

  // 1. Computar sha256 de cada arquivo (necessario para idempotencia)
  const computedShas = new Map<string, string>()
  for (const file of files) {
    const sha = await computeSha256(path.join(cwd, file.originalPath))
    computedShas.set(file.originalPath, sha)
  }

  // 2. Idempotencia (G4): checar ultimo backup existente
  const latestDir = await getLatestBackupDir(cwd)
  if (latestDir !== null) {
    let latestManifest: BackupManifest
    try {
      latestManifest = await readBackupManifest(latestDir)
    } catch {
      // Manifest corrompido — ignorar e criar novo
      latestManifest = { timestamp: '', files: [], gitSha: null }
    }

    if (latestManifest.files.length === files.length) {
      const latestIndex = new Map(latestManifest.files.map((f) => [f.originalPath, f.sha256]))
      const allMatch = files.every((f) => latestIndex.get(f.originalPath) === computedShas.get(f.originalPath))

      if (allMatch) {
        return { backupDir: latestDir, manifest: latestManifest }
      }
    }
  }

  // 3. Gerar timestamp path-safe e criar backupDir
  const ts = formatTimestampPathSafe(clock())
  const backupDir = path.join(cwd, BACKUP_ROOT_REL, ts)
  await fs.mkdir(backupDir, { recursive: true })

  // 4. Copiar cada arquivo mantendo estrutura de subpastas
  const entries: BackupManifestEntry[] = []
  for (const file of files) {
    const sha256 = computedShas.get(file.originalPath)!
    const destPath = path.join(backupDir, file.originalPath)
    await fs.mkdir(path.dirname(destPath), { recursive: true })
    await fs.copyFile(path.join(cwd, file.originalPath), destPath)

    entries.push({
      originalPath: file.originalPath,
      backupPath: file.originalPath,  // relativo ao backup root (mesmo caminho)
      sha256,
      action: file.action,
    })
  }

  // 5. Resolver gitSha (sem child_process, G6)
  const gitSha = await readGitSha(cwd)

  // 6. Escrever manifest.json
  const manifest: BackupManifest = {
    timestamp: clock().toISOString(),
    files: entries,
    gitSha,
  }

  await fs.writeFile(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  )

  return { backupDir, manifest }
}
