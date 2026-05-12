// 2026-05-12 (Luiz/dev): 06-A1 — lock global em ~/.claude/cache/state-md-last-run.json
// chave por projectRoot — projetos paralelos não se bloqueiam mutuamente
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'state-md-last-run.json')

type LockEntry = { timestamp_ms: number }
type LockFile = Record<string, LockEntry>

/**
 * Retorna true se deve PULAR (chamada recente < ttlMs).
 * Side-effect: atualiza lock com timestamp atual se retornar false.
 *
 * @example
 *   if (shouldSkipByRateLimit(projectRoot, 30_000)) return
 *   // proceed with regeneration
 */
export function shouldSkipByRateLimit(projectRoot: string, ttlMs: number): boolean {
  const key = path.resolve(projectRoot)
  const now = Date.now()

  let lock: LockFile = {}
  if (fs.existsSync(LOCK_PATH)) {
    try {
      lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf-8')) as LockFile
    } catch {
      lock = {}
    }
  }

  const entry = lock[key]
  const last = entry != null ? entry.timestamp_ms : 0
  if (now - last < ttlMs) {
    return true // skip
  }

  lock[key] = { timestamp_ms: now }
  const dir = path.dirname(LOCK_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf-8')
  return false
}
