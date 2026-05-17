// M1.3 (2026-05-17): helper extraído de run-stack-knowledge-init — SRP.
// Encapsula emissão dos 2 eventos de telemetria do /init (stack_detected + knowledge_copied).
// G7: writeTelemetryDomainEvent é silencioso (try/catch interno) — este helper também é void (fire-and-forget).

import { writeTelemetryDomainEvent } from '../../lib/telemetry-utils'
import type { MultiStackResult } from './detect-multi-stack'
import type { CopyKnowledgeResult } from './copy-knowledge'

export interface EmitStackKnowledgeEventsArgs {
  detection: MultiStackResult
  copyResult: CopyKnowledgeResult
  baseDir: string
  /** ISO 8601 UTC. Default: new Date().toISOString(). Compartilhado entre os 2 eventos. */
  timestamp?: string
}

export function emitStackKnowledgeEvents(args: EmitStackKnowledgeEventsArgs): void {
  const { detection, copyResult, baseDir, timestamp = new Date().toISOString() } = args

  writeTelemetryDomainEvent({
    evento: 'stack_detected',
    skill_invocada: 'init',
    timestamp,
    primary: detection.primary,
    secondary: detection.secondary,
    anchor_files: detection.anchor_files,
  }, baseDir)

  writeTelemetryDomainEvent({
    evento: 'knowledge_copied',
    skill_invocada: 'init',
    timestamp,
    stack: detection.primary,
    atom_count: copyResult.atomCount,
    status: copyResult.status,
  }, baseDir)
}
