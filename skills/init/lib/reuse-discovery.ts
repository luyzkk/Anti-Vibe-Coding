import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AgentsLog } from './audit-log'

// 2026-05-15 (Luiz/dev): FRESH_THRESHOLD_MS = 24h — alinhado com PRD §Decisão #3 (hardcoded, não configurável via JSON)
export const FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

/**
 * Detecta `--reuse-discovery` em ARGUMENTS da skill /init.
 * Mirror do pattern `parseDryRunFlag` em Step migrate.0 (skills/init/SKILL.md:47-53).
 */
export function parseReuseDiscoveryFlag(args: string[]): { reuseDiscovery: boolean } {
  return { reuseDiscovery: args.includes('--reuse-discovery') || args.includes('--refresh') }
}

/**
 * Le discovery/agents-log.json e retorna o campo `started_at`.
 * Retorna null se: arquivo ausente, JSON inválido, ou campo `started_at` ausente/não-string.
 * Fallback seguro — nunca lança.
 */
export async function readLastInitTimestamp(projectRoot: string): Promise<string | null> {
  const logPath = path.join(projectRoot, 'discovery', 'agents-log.json')
  try {
    const raw = await fs.readFile(logPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AgentsLog>
    if (typeof parsed.started_at === 'string') return parsed.started_at
    return null
  } catch {
    return null
  }
}

/**
 * Formata mensagem de warning quando o atalho nao pode ser usado.
 * Distingue dois subcasos para diagnostico (RF-SH-02):
 *   - cachedAt === null: "no previous init detected — running full init"
 *   - cachedAt presente mas stale: "stale (XXh ago) — running full init"
 */
export function formatStaleMessage(cachedAt: string | null): string {
  if (cachedAt === null) {
    return '[reuse-discovery] no previous init detected — running full init'
  }
  const parsed = Date.parse(cachedAt)
  if (Number.isNaN(parsed)) {
    return '[reuse-discovery] previous init timestamp unreadable — running full init'
  }
  const ageHours = Math.floor((Date.now() - parsed) / (60 * 60 * 1000))
  return `[reuse-discovery] stale (${ageHours}h ago) — running full init`
}

/**
 * Decide se o cache de discovery anterior pode ser reusado.
 * Retorna true APENAS quando cachedAt é ISO válido E Date.now() - cachedAt < thresholdMs.
 * Retorna false em todos os outros casos (null, string vazia, ISO inválido, >=threshold).
 *
 * @param cachedAt ISO timestamp do ultimo init (ou null)
 * @param thresholdMs Override opcional para o threshold (default: FRESH_THRESHOLD_MS).
 *                    Permite injecao para test e env var override (RF-CH-01).
 *
 * Contrato publico estavel — consumido por PRD v6.3.0-adaptive-coaching / plano05/fase-01.
 */
export function shouldReuseDiscovery(cachedAt: string | null, thresholdMs: number = FRESH_THRESHOLD_MS): boolean {
  if (cachedAt === null || cachedAt === '') return false
  const parsed = Date.parse(cachedAt)
  if (Number.isNaN(parsed)) return false
  return Date.now() - parsed < thresholdMs
}

/**
 * Resolve o threshold em ms a partir de env var override (RF-CH-01).
 * Se `envValue` for parseavel como numero finito positivo, retorna `envValue * 60 * 60 * 1000`.
 * Caso contrario (undefined, vazio, NaN, negativo, zero), retorna FRESH_THRESHOLD_MS default.
 */
export function resolveThresholdMs(envValue: string | undefined): number {
  if (envValue === undefined || envValue === '') return FRESH_THRESHOLD_MS
  const hours = Number(envValue)
  if (!Number.isFinite(hours) || hours <= 0) return FRESH_THRESHOLD_MS
  return hours * 60 * 60 * 1000
}

// 2026-05-15 (Luiz/dev): loader pattern — unknown return lets mocks assign freely (covariant); internal cast is safe given runtime contract — PRD v6.3.0 §RF-CH-01 / DEC-2 option 3
type ParityAuditModule = {
  inspectToolRegistry: (projectRoot: string) => Promise<unknown>
  computeParityGaps: (snapshot: unknown, taskType: string | null) => Promise<unknown>
  writeParityGaps: (output: unknown, projectRoot: string) => Promise<string>
}

type RegenerateResult =
  | { regenerated: false; reason: 'parity-audit-unavailable' | 'error' }
  | { regenerated: true; reason: 'success' }

// 2026-05-15 (Luiz/dev): graceful degradation — if parity-audit module unavailable, skip silently — PRD v6.3.0 §RF-CH-01 / DEC-2 option 3
export async function tryRegenerateParityGaps(
  projectRoot: string,
  // loader returns unknown (covariant) so test mocks with narrow return types stay assignable
  loader: () => Promise<unknown>,
): Promise<RegenerateResult> {
  let raw: unknown
  try {
    raw = await loader()
  } catch {
    return { regenerated: false, reason: 'parity-audit-unavailable' }
  }
  if (raw === null || raw === undefined) return { regenerated: false, reason: 'parity-audit-unavailable' }

  const mod = raw as ParityAuditModule
  try {
    const snapshot = await mod.inspectToolRegistry(projectRoot)
    const output = await mod.computeParityGaps(snapshot, null)
    await mod.writeParityGaps(output, projectRoot)
    return { regenerated: true, reason: 'success' }
  } catch {
    return { regenerated: false, reason: 'error' }
  }
}
