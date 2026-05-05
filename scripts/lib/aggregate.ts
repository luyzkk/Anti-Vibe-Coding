import type { PairedEntry } from "./pair-events"

export type SkillStats = {
  count: number
  avgDurationMs: number
  avgTokensEstimados: number
  successRate: number
}

export type ProfileStats = { count: number }
export type PhaseStats = { count: number; avgDurationMs: number }

export type AggregateBySkill = Map<string, SkillStats>
export type AggregateByProfile = Map<string, ProfileStats>
export type AggregateByPhase = Map<string, PhaseStats>

/** Aggregates paired entries by skill. */
export function aggregateBySkill(paired: PairedEntry[]): AggregateBySkill {
  const acc = new Map<string, { totalDur: number; totalTok: number; ok: number; n: number }>()
  for (const p of paired) {
    const cur = acc.get(p.skill) ?? { totalDur: 0, totalTok: 0, ok: 0, n: 0 }
    cur.totalDur += p.durationMs
    cur.totalTok += p.tokensEstimados
    if (p.sucesso) cur.ok += 1
    cur.n += 1
    acc.set(p.skill, cur)
  }
  const out: AggregateBySkill = new Map()
  for (const [skill, v] of acc) {
    out.set(skill, {
      count: v.n,
      avgDurationMs: v.n > 0 ? Math.round(v.totalDur / v.n) : 0,
      avgTokensEstimados: v.n > 0 ? Math.round(v.totalTok / v.n) : 0,
      successRate: v.n > 0 ? v.ok / v.n : 0,
    })
  }
  return out
}

/** Aggregates paired entries by architecture profile. */
export function aggregateByProfile(paired: PairedEntry[]): AggregateByProfile {
  const acc = new Map<string, number>()
  for (const p of paired) {
    const key = p.profileArquitetura
    acc.set(key, (acc.get(key) ?? 0) + 1)
  }
  const out: AggregateByProfile = new Map()
  for (const [k, v] of acc) out.set(k, { count: v })
  return out
}

/** Aggregates paired entries by pipeline phase. */
export function aggregateByPhase(paired: PairedEntry[]): AggregateByPhase {
  const acc = new Map<string, { totalDur: number; n: number }>()
  for (const p of paired) {
    const key = p.fasePipeline
    const cur = acc.get(key) ?? { totalDur: 0, n: 0 }
    cur.totalDur += p.durationMs
    cur.n += 1
    acc.set(key, cur)
  }
  const out: AggregateByPhase = new Map()
  for (const [k, v] of acc) {
    out.set(k, { count: v.n, avgDurationMs: v.n > 0 ? Math.round(v.totalDur / v.n) : 0 })
  }
  return out
}

/** Rate of abandoned starts (starts without a paired end). */
export function abandonRate(paired: PairedEntry[], orphanedStarts: number): number {
  const total = paired.length + orphanedStarts
  if (total === 0) return 0
  return orphanedStarts / total
}
