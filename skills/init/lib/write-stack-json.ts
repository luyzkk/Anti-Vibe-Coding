// 2026-05-16 (Luiz/dev): writer multi-stack — Plano 02 fase-02. Schema final do PRD §Mecanismo (linha 96-101).
// G2 / DI-2: primary e secondary são nomes de pasta do matrix (não StackId interno).
// G5: anchor_files é lista crua de paths relativos — sem stack name.
// G10: primary: null não é erro (CA-06).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MultiStackResult, MatrixFolder } from './detect-multi-stack'
import { isMatrixFolder } from './stack-id-map'

// 2026-05-16 (Luiz/dev): schema final de .claude/stack.json — alinhado com PRD §Mecanismo (linha 96-101).
// H2.1 (2026-05-17): schema_version "1" adicionado como literal type. isValidStackJson rejeita JSON sem campo ou com versão != "1".
// Projetos existentes sem schema_version precisam rodar --refresh-knowledge para regenerar.
export interface StackJson {
  /** Schema version sentinel. Always "1" in v6.3.2+. Used to detect stale/incompatible stack.json. */
  schema_version: '1'
  primary: MatrixFolder | null
  secondary: MatrixFolder[]
  anchor_files: string[]
  /** ISO 8601 UTC com sufixo `Z`. Ex: `2026-05-16T12:34:56.789Z`. */
  detected_at: string
}

const STACK_JSON_REL_PATH = path.join('.claude', 'stack.json')
const STALE_TMP_MS = 5 * 60 * 1000 // 5 minutes

// M1.5: garbage-collect stale .tmp files (older than 5min) left by crashed processes.
// Pattern: <dest>.<pid>.<timestamp_ms>.tmp — uses timestamp from filename, not mtime,
// so tests can plant "old" files without needing to backdate the filesystem.
async function cleanStaleTmps(dest: string): Promise<void> {
  const dir = path.dirname(dest)
  const base = path.basename(dest)
  try {
    const entries = await fs.readdir(dir)
    const now = Date.now()
    for (const entry of entries) {
      if (!entry.startsWith(base) || !entry.endsWith('.tmp')) continue
      const fullPath = path.join(dir, entry)
      // Try to parse embedded timestamp: <base>.<pid>.<ts>.tmp
      const rest = entry.slice(base.length + 1, -4) // strip "<base>." prefix and ".tmp" suffix
      const parts = rest.split('.')
      const ts = parts.length >= 2 ? Number(parts[1]) : NaN
      const isStaleByName = !Number.isNaN(ts) && now - ts > STALE_TMP_MS
      // Fallback: if pattern doesn't match (legacy ".tmp"), use file mtime
      const isStale = isStaleByName || (Number.isNaN(ts) && await fs.stat(fullPath).then(s => now - s.mtimeMs > STALE_TMP_MS).catch(() => false))
      if (isStale) {
        await fs.unlink(fullPath).catch(() => { /* best-effort */ })
      }
    }
  } catch {
    // best-effort — dir may not exist yet
  }
}

// 2026-05-16 (Luiz/dev): atomic write — escreve em .tmp e renomeia. Evita arquivo parcialmente populado em caso de SIGINT.
// M1.5: tmp suffix inclui PID + timestamp para evitar colisão entre processos paralelos.
export async function writeStackJson(
  targetDir: string,
  result: MultiStackResult,
  now: Date = new Date(),
): Promise<{ path: string; written: StackJson }> {
  const dest = path.join(targetDir, STACK_JSON_REL_PATH)
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await cleanStaleTmps(dest)

  const payload: StackJson = {
    schema_version: '1',
    primary: result.primary,
    secondary: result.secondary,
    anchor_files: result.anchor_files,
    detected_at: now.toISOString(), // 2026-05-16 (Luiz/dev): ISO 8601 UTC — Date.toISOString() always returns Z suffix
  }

  const body = JSON.stringify(payload, null, 2) + '\n'
  await fs.writeFile(tmp, body, 'utf8')
  await fs.rename(tmp, dest)
  return { path: dest, written: payload }
}

/**
 * Type guard público para validação externa de stack.json.
 * Rejeita objetos sem `schema_version: "1"`, estrutura inválida, ou valores inesperados.
 * Use quando precisar validar dados carregados de disco sem passar por `readStackJson`.
 */
export function isValidStackJson(parsed: unknown): parsed is StackJson {
  if (typeof parsed !== 'object' || parsed === null) return false
  const c = parsed as Record<string, unknown>
  // H2.1: schema_version must be "1" — rejects pre-v6.3.2 files and future incompatible versions
  if (c.schema_version !== '1') return false
  if (typeof c.detected_at !== 'string') return false
  if (!Array.isArray(c.secondary)) return false
  if (!Array.isArray(c.anchor_files)) return false
  if (c.primary !== null && !isMatrixFolder(c.primary)) return false
  if (!c.secondary.every(isMatrixFolder)) return false
  if (!c.anchor_files.every((a) => typeof a === 'string')) return false
  return true
}

/**
 * Lê e parseia .claude/stack.json se existir. Retorna `null` se ausente ou inválido.
 * Usado por fase-04 (telemetria) e Plano 06 (preview de keywords).
 */
export async function readStackJson(targetDir: string): Promise<StackJson | null> {
  try {
    const body = await fs.readFile(path.join(targetDir, STACK_JSON_REL_PATH), 'utf8')
    const parsed: unknown = JSON.parse(body)
    if (!isValidStackJson(parsed)) return null
    return parsed
  } catch {
    return null
  }
}
