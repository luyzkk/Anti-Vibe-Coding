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
  return { reuseDiscovery: args.includes('--reuse-discovery') }
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
 * Decide se o cache de discovery anterior pode ser reusado.
 * Retorna true APENAS quando cachedAt é ISO válido E Date.now() - cachedAt < FRESH_THRESHOLD_MS.
 * Retorna false em todos os outros casos (null, string vazia, ISO inválido, >=24h).
 *
 * Contrato publico estavel — consumido por PRD v6.3.0-adaptive-coaching / plano05/fase-01.
 */
export function shouldReuseDiscovery(cachedAt: string | null): boolean {
  if (cachedAt === null || cachedAt === '') return false
  const parsed = Date.parse(cachedAt)
  if (Number.isNaN(parsed)) return false
  return Date.now() - parsed < FRESH_THRESHOLD_MS
}
