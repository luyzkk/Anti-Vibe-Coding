import type { AggregateBySkill, AggregateByProfile, AggregateByPhase } from "./aggregate"

export type ReportInput = {
  projectPath: string
  totalRawLines: number
  malformedCount: number
  validPairs: number
  orphanedStarts: number
  orphanedEnds: number
  bySkill: AggregateBySkill
  byProfile: AggregateByProfile
  byPhase: AggregateByPhase
  abandonRate: number
}

/** Formats analysis report as human-readable text for stdout. Not JSON (G9). */
export function formatReport(input: ReportInput): string {
  const lines: string[] = []
  lines.push(`=== analyze-metrics — ${input.projectPath} ===`)
  lines.push("")
  lines.push("Totais:")
  lines.push(`  Linhas brutas lidas:    ${input.totalRawLines}`)
  lines.push(`  Linhas malformadas:     ${input.malformedCount}`)
  lines.push(`  Pares validos:          ${input.validPairs}`)
  lines.push(`  Starts orfaos:          ${input.orphanedStarts} (skill iniciada sem end)`)
  lines.push(`  Ends orfaos:            ${input.orphanedEnds}`)
  lines.push(`  Taxa de abandono:       ${(input.abandonRate * 100).toFixed(1)}%`)
  lines.push("")

  lines.push("Por skill (so pares validos):")
  lines.push("  skill                          n   dur_avg(ms)   tokens_estimados_avg   success%")
  for (const [skill, v] of input.bySkill) {
    lines.push(
      `  ${skill.padEnd(28)} ${String(v.count).padStart(4)}   ${String(v.avgDurationMs).padStart(11)}   ${String(v.avgTokensEstimados).padStart(20)}   ${(v.successRate * 100).toFixed(0).padStart(7)}%`,
    )
  }
  lines.push("")

  lines.push("Por perfil arquitetural:")
  for (const [profile, v] of input.byProfile) {
    lines.push(`  ${profile.padEnd(28)} ${String(v.count).padStart(4)}`)
  }
  lines.push("")

  lines.push("Por fase do pipeline:")
  for (const [phase, v] of input.byPhase) {
    lines.push(
      `  ${phase.padEnd(28)} ${String(v.count).padStart(4)}   dur_avg=${v.avgDurationMs}ms`,
    )
  }
  lines.push("")
  lines.push("Notas:")
  lines.push("  - Tokens sao ESTIMADOS pelo agente, nao medidos em tempo real (G3).")
  lines.push("  - Pares validos = entries com 'start' E 'end' no mesmo dia natural (G4).")
  lines.push("  - Privacy-first: nenhum conteudo de codigo foi lido (D7).")
  return lines.join("\n")
}
