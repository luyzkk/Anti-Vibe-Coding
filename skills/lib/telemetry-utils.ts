import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { TelemetryStart, TelemetryEnd, TelemetryEntry, FasePipeline } from './telemetry-types'

// G7: lista canonica das 10 skills instrumentadas (D13)
export const INSTRUMENTED_SKILLS: ReadonlyArray<FasePipeline> = [
  'grill-me',
  'write-prd',
  'plan-feature',
  'execute-plan',
  'verify-work',
  'iterate',
  'consultant',
  'architecture',
  'design-twice',
  'quick-plan',
] as const

const METRICS_DIR = join('.claude', 'metrics')
const TELEMETRY_WARN_PREFIX = '[telemetry-warn]'

/**
 * Computa o path do JSONL para o mes de `now`. NAO cacheia (G3).
 * Formato: `.claude/metrics/YYYY-MM.jsonl`.
 */
export function computeMonthlyPath(now: Date = new Date(), baseDir: string = METRICS_DIR): string {
  const yyyyMM = now.toISOString().slice(0, 7)
  return join(baseDir, `${yyyyMM}.jsonl`)
}

/**
 * Serializa uma entrada como JSONL (1 linha + `\n`).
 * Quem chama garante que `entry` e TelemetryStart ou TelemetryEnd valido.
 */
export function serializeEntry(entry: TelemetryEntry): string {
  return JSON.stringify(entry) + '\n'
}

/**
 * Append-only. Falha silenciosa: nunca lanca para o caller (G2 / CA-09).
 * Garante que `dirname(filePath)` existe (G4) — mkdirSync recursive.
 */
export function appendJsonlLine(filePath: string, line: string): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    appendFileSync(filePath, line, { encoding: 'utf-8', flag: 'a' })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`${TELEMETRY_WARN_PREFIX} append failed: ${message}`)
  }
}

/**
 * Append de uma linha `start`. Chamado no inicio da skill instrumentada (CA-03).
 *
 * Exemplo de uso (dentro de SKILL.md):
 *   writeTelemetryStart({
 *     evento: 'start',
 *     skill_invocada: 'plan-feature',
 *     timestamp_inicio: new Date().toISOString(),
 *     profile_arquitetura: 'disabled',
 *     fase_pipeline: 'plan-feature',
 *   })
 */
export function writeTelemetryStart(entry: TelemetryStart): void {
  const filePath = computeMonthlyPath()
  appendJsonlLine(filePath, serializeEntry(entry))
}

/**
 * Append de uma linha `end`. Chamado no fim da skill (sucesso OU erro — CA-03).
 *
 * Exemplo:
 *   writeTelemetryEnd({
 *     evento: 'end',
 *     skill_invocada: 'plan-feature',
 *     timestamp_inicio: startTimestamp,
 *     timestamp_fim: new Date().toISOString(),
 *     duracao_ms: Date.now() - startMs,
 *     profile_arquitetura: 'disabled',
 *     fase_pipeline: 'plan-feature',
 *     tokens_aproximados_consumidos: 0,
 *     arquivos_lidos: 0,
 *     arquivos_modificados: 0,
 *     suceso: true,
 *   })
 */
export function writeTelemetryEnd(entry: TelemetryEnd): void {
  const filePath = computeMonthlyPath()
  appendJsonlLine(filePath, serializeEntry(entry))
}

/**
 * Mapeia skill name para `fase_pipeline`. As 10 skills mapeiam 1:1 com o nome.
 * Centralizado aqui para evitar typos quando 10 skills replicarem o mesmo bloco de instrumentacao.
 */
const SKILL_TO_FASE: Record<string, FasePipeline> = {
  'grill-me': 'grill-me',
  'write-prd': 'write-prd',
  'plan-feature': 'plan-feature',
  'execute-plan': 'execute-plan',
  'verify-work': 'verify-work',
  'iterate': 'iterate',
  'consultant': 'consultant',
  'architecture': 'architecture',
  'design-twice': 'design-twice',
  'quick-plan': 'quick-plan',
}

export function inferFasePipeline(skillName: string): FasePipeline | null {
  return SKILL_TO_FASE[skillName] ?? null
}
