import type { TelemetryEntry, TelemetryEnd } from "../../skills/lib/telemetry-types"
import { isTelemetryEnd } from "../../skills/lib/telemetry-schema"

export type PairedEntry = {
  skill: string
  start: TelemetryEntry
  end: TelemetryEnd
  durationMs: number
  profileArquitetura: string
  fasePipeline: string
  sucesso: boolean
  tokensEstimados: number
  arquivosLidos: number
  arquivosModificados: number
}

export type PairResult = {
  paired: PairedEntry[]
  orphanedStarts: TelemetryEntry[]
  orphanedEnds: TelemetryEnd[]
}

const SAME_DAY_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Pairs start/end events for the same skill within a 24h window.
 * Unpaired starts and ends are returned as orphans.
 */
export function pairStartEnd(entries: TelemetryEntry[]): PairResult {
  const startsBySkill = new Map<string, TelemetryEntry[]>()
  const paired: PairedEntry[] = []
  const orphanedEnds: TelemetryEnd[] = []

  const sorted = [...entries].sort(
    (a, b) => Date.parse(a.timestamp_inicio) - Date.parse(b.timestamp_inicio),
  )

  for (const e of sorted) {
    if (e.evento === "start") {
      const list = startsBySkill.get(e.skill_invocada) ?? []
      list.push(e)
      startsBySkill.set(e.skill_invocada, list)
      continue
    }

    if (!isTelemetryEnd(e)) continue

    const list = startsBySkill.get(e.skill_invocada) ?? []
    const matchIdx = list.findIndex(
      (s) => Date.parse(e.timestamp_inicio) - Date.parse(s.timestamp_inicio) <= SAME_DAY_WINDOW_MS,
    )

    if (matchIdx === -1) {
      orphanedEnds.push(e)
      continue
    }

    const start = list.splice(matchIdx, 1)[0]
    if (start === undefined) {
      orphanedEnds.push(e)
      continue
    }

    paired.push({
      skill: e.skill_invocada,
      start,
      end: e,
      durationMs: e.duracao_ms,
      profileArquitetura: e.profile_arquitetura,
      fasePipeline: e.fase_pipeline,
      sucesso: e.sucesso,
      tokensEstimados: e.tokens_aproximados_consumidos,
      arquivosLidos: e.arquivos_lidos,
      arquivosModificados: e.arquivos_modificados,
    })
  }

  const orphanedStarts: TelemetryEntry[] = []
  for (const list of startsBySkill.values()) orphanedStarts.push(...list)

  return { paired, orphanedStarts, orphanedEnds }
}
