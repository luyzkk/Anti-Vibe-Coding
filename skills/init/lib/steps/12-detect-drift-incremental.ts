// 2026-05-18 (Luiz/dev): SH-05 + CA-05 — Step 12 incremental drift detection (already-initiated only)
import path from 'node:path'
import type { Step, StepContext } from './types'
import { detectDrift, DRIFT_REPORT_FILENAME } from '../drift-detector'
import { isDryRun } from '../dry-run-mode'
import { writeDiscoveryArtifact } from '../discovery-store'

// 2026-05-18 (Luiz/dev): ADAPTAR conforme convencao em plano01/MEMORY.md — como ctx.mode eh
// propagado. Leitura defensiva via ctx.flags['__initMode'] ou ctx.flags['mode'].
function getInitMode(ctx: StepContext): string | undefined {
  const raw = (ctx.flags as Record<string, unknown>)['__initMode'] ?? ctx.flags['mode']
  return typeof raw === 'string' ? raw : undefined
}

export const detectDriftIncrementalStep: Step = {
  id: '12-detect-drift-incremental',
  async run(ctx) {
    const mode = getInitMode(ctx)
    if (mode !== 'already-initiated') {
      return {
        mutated: false,
        summary: `skipped (only runs in already-initiated mode; current: ${mode ?? 'unknown'})`,
      }
    }

    const manifestPath = path.join(ctx.cwd, '.claude', '.anti-vibe-manifest.json')
    const report = await detectDrift({ manifestPath, cwd: ctx.cwd })

    // 2026-05-18 (Luiz/dev): em dry-run nao escreve o JSON; summary lista contagens
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: `dry-run: would write drift-report.json — placeholder=${report.summary.placeholder}, populated=${report.summary.populated}, drift=${report.summary.drift}`,
      }
    }

    await writeDiscoveryArtifact(ctx.cwd, DRIFT_REPORT_FILENAME, report)

    // 2026-05-18 (Luiz/dev): subagent_id literal init-drift-detect — Plano 06 fase-01 conecta
    // ao AuditLogWriter. Por enquanto o literal aparece no summary para grepability.
    return {
      mutated: true,
      summary: `init-drift-detect: placeholder=${report.summary.placeholder}, populated=${report.summary.populated}, drift=${report.summary.drift}`,
    }
  },
}
