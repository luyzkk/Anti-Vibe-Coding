// 2026-05-17 (Luiz/dev): Wave 4 D5/GT-4 — pair-events regression + AnyTelemetryEntry filter test.
import { describe, test, expect } from 'bun:test'
import { pairStartEnd } from './pair-events'
import type { TelemetryStart, TelemetryEnd } from '../../skills/lib/telemetry-types'

const makeStart = (skill: string, ts: string): TelemetryStart => ({
  evento: 'start',
  skill_invocada: skill,
  timestamp_inicio: ts,
  profile_arquitetura: 'disabled',
  fase_pipeline: 'plan-feature',
})

const makeEnd = (skill: string, ts: string, tsStart: string): TelemetryEnd => ({
  evento: 'end',
  skill_invocada: skill,
  timestamp_inicio: tsStart,
  timestamp_fim: ts,
  duracao_ms: 100,
  profile_arquitetura: 'disabled',
  fase_pipeline: 'plan-feature',
  tokens_aproximados_consumidos: 0,
  arquivos_lidos: 0,
  arquivos_modificados: 0,
  sucesso: true,
})

describe('pairStartEnd', () => {
  test('pairs matching start and end for same skill', () => {
    const ts = '2026-05-17T10:00:00.000Z'
    const entries = [makeStart('plan-feature', ts), makeEnd('plan-feature', '2026-05-17T10:01:00.000Z', ts)]
    const result = pairStartEnd(entries)
    expect(result.paired).toHaveLength(1)
    expect(result.orphanedStarts).toHaveLength(0)
    expect(result.orphanedEnds).toHaveLength(0)
  })

  test('orphans unmatched start (no end)', () => {
    const ts = '2026-05-17T10:00:00.000Z'
    const result = pairStartEnd([makeStart('grill-me', ts)])
    expect(result.paired).toHaveLength(0)
    expect(result.orphanedStarts).toHaveLength(1)
    expect(result.orphanedEnds).toHaveLength(0)
  })

  test('orphans unmatched end (no start)', () => {
    const ts = '2026-05-17T10:00:00.000Z'
    const result = pairStartEnd([makeEnd('grill-me', '2026-05-17T10:01:00.000Z', ts)])
    expect(result.paired).toHaveLength(0)
    expect(result.orphanedStarts).toHaveLength(0)
    expect(result.orphanedEnds).toHaveLength(1)
  })

  test('ignores domain events (stack_detected, knowledge_copied) when mixed in AnyTelemetryEntry[]', () => {
    // D5/GT-4: pairStartEnd deve aceitar AnyTelemetryEntry[] e filtrar pipeline events apenas.
    const ts = '2026-05-17T10:00:00.000Z'
    const pipelineStart = makeStart('plan-feature', ts)
    const pipelineEnd = makeEnd('plan-feature', '2026-05-17T10:01:00.000Z', ts)

    // Domain events: estrutura diferente (timestamp, not timestamp_inicio)
    const domainStackDetected = {
      evento: 'stack_detected' as const,
      skill_invocada: 'init' as const,
      timestamp: ts,
      primary: 'nodejs-typescript',
      secondary: [] as string[],
      anchor_files: ['package.json'],
    }
    const domainKnowledgeCopied = {
      evento: 'knowledge_copied' as const,
      skill_invocada: 'init' as const,
      timestamp: ts,
      stack: 'nodejs-typescript',
      atom_count: 14,
      status: 'copied' as const,
    }

    // Mix: pipeline events + domain events together
    // pairStartEnd should accept AnyTelemetryEntry[] and only pair pipeline events
    const mixed = [pipelineStart, domainStackDetected, domainKnowledgeCopied, pipelineEnd]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = pairStartEnd(mixed as any)
    expect(result.paired).toHaveLength(1)
    expect(result.orphanedStarts).toHaveLength(0)
    expect(result.orphanedEnds).toHaveLength(0)
    expect(result.paired[0]?.skill).toBe('plan-feature')
  })

  test('pairs multiple skills independently', () => {
    const ts1 = '2026-05-17T10:00:00.000Z'
    const ts2 = '2026-05-17T11:00:00.000Z'
    const entries = [
      makeStart('grill-me', ts1),
      makeStart('write-prd', ts2),
      makeEnd('grill-me', '2026-05-17T10:05:00.000Z', ts1),
      makeEnd('write-prd', '2026-05-17T11:10:00.000Z', ts2),
    ]
    const result = pairStartEnd(entries)
    expect(result.paired).toHaveLength(2)
    expect(result.orphanedStarts).toHaveLength(0)
    expect(result.orphanedEnds).toHaveLength(0)
  })
})
