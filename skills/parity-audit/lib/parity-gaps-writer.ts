// 2026-05-14 (Luiz/dev): writer separa cómputo (puro) de escrita (I/O) — testável sem tmpdir

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { GAP_RULES, type GapRule, type Severity } from './gap-rules'
import type { ToolRegistrySnapshot } from '../../lib/tool-registry-inspector'

export type ParityGap = {
  gap_id: string
  task_type: string
  missing_capability: string
  severity: Severity
  suggestion: string
}

// 2026-05-15 (Luiz/dev): schema bump v1→v2 — alinha runtime com schema (D4 do PRD v6.3.1).
// parity-gaps.json é gitignored (D8 v6.3.0); sem consumidor externo persistido, bump é livre.
export type ParityGapsOutput = {
  gaps: ParityGap[]
  tool_registry_snapshot: ToolRegistrySnapshot
  generated_at: string
  schema_version: '2.0'
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, important: 1, nice: 2 }

export function computeParityGaps(
  snapshot: ToolRegistrySnapshot,
  taskType: string | null,
  rules: GapRule[] = GAP_RULES
): ParityGapsOutput {
  const filtered = taskType ? rules.filter(r => r.task_type === taskType) : rules

  const gaps: ParityGap[] = filtered
    .filter(rule => rule.detect(snapshot))
    .map(rule => ({
      gap_id: rule.gap_id,
      task_type: rule.task_type,
      missing_capability: rule.required_capability,
      severity: rule.severity,
      suggestion: rule.suggestion,
    }))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  return {
    gaps,
    tool_registry_snapshot: snapshot,
    generated_at: new Date().toISOString(),
    schema_version: '2.0',
  }
}

export async function writeParityGaps(output: ParityGapsOutput, projectRoot: string): Promise<string> {
  const discoveryDir = path.join(projectRoot, 'discovery')
  await mkdir(discoveryDir, { recursive: true }).catch(() => {})
  const outPath = path.join(discoveryDir, 'parity-gaps.json')
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf-8')
  return outPath
}
