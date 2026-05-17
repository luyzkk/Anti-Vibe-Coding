// skills/init/lib/steps/00_1-reuse-discovery.ts
// 2026-05-17 (Luiz/dev): porta Step reuse-discovery.0 (SKILL.md linhas 467-558).
// Wording byte-identico nas 3 strings criticas (G1 do plano).
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import {
  parseReuseDiscoveryFlag,
  readLastInitTimestamp,
  shouldReuseDiscovery,
  formatStaleMessage,
  resolveThresholdMs,
  tryRegenerateParityGaps,
  FRESH_THRESHOLD_MS,
} from '../reuse-discovery'
import { AuditLogWriter } from '../audit-log'
import { readArchitectureProfile } from '../../../lib/read-architecture-profile'
import { discoverCapabilities } from '../../../lib/capabilities-writer'
import type { Step, StepReport } from './types'

export const reuseDiscoveryStep: Step = {
  id: 'reuse-discovery',
  async run(ctx): Promise<StepReport> {
    const { reuseDiscovery } = parseReuseDiscoveryFlag(ctx.args.slice())
    if (!reuseDiscovery) {
      // 2026-05-17 (Luiz/dev): no-op silencioso quando flag ausente. Preserva CA-01 (greenfield).
      return { mutated: false, summary: '' }
    }

    const startMs = Date.now()
    const projectRoot = ctx.cwd
    const cachedAt = await readLastInitTimestamp(projectRoot)
    const thresholdMs = resolveThresholdMs(process.env.ANTI_VIBE_FRESH_HOURS)

    if (!shouldReuseDiscovery(cachedAt, thresholdMs)) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 552 (PRD R1, G1).
      // Stale -> fall-through. NAO setar skipRemaining (dispatcher continua para Step 1 etc.).
      return { mutated: false, summary: formatStaleMessage(cachedAt) }
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 502 (PRD R1, G1).
    const logLines: string[] = ['[reuse-discovery] cache fresh — running Step 7 only']

    // Inline Step 7 logic (capabilities-discovery) — NAO duplicar audit entry (G4 do SKILL).
    const profileObj = readArchitectureProfile()
    if (profileObj !== null) {
      const out = await discoverCapabilities(projectRoot, profileObj.profile)
      const capsPath = path.join(projectRoot, 'discovery', 'capabilities.json')
      await writeFile(capsPath, JSON.stringify(out, null, 2), 'utf-8')
    }

    // Regen parity-gaps com graceful degradation (PRD CA-04, DEC-2 v6.3.0).
    // 2026-05-17 (Luiz/dev): EXCECAO DOCUMENTADA (G3 do plano) — unico `await import` permitido
    // em todo o Plano 02. Esta dentro do callback do contrato de tryRegenerateParityGaps,
    // que foi desenhado para receber um loader async. Nao eh violacao de DI-2/G3.
    const parityResult = await tryRegenerateParityGaps(projectRoot, async () => {
      try {
        const inspector = await import('../../../lib/tool-registry-inspector')
        const writer = await import('../../../parity-audit/lib/parity-gaps-writer')
        return {
          inspectToolRegistry: inspector.inspectToolRegistry,
          computeParityGaps: writer.computeParityGaps,
          writeParityGaps: writer.writeParityGaps,
        }
      } catch {
        return null
      }
    })
    if (!parityResult.regenerated) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 532 (PRD R1, G1).
      logLines.push(`[reuse-discovery] parity-gaps.json skipped — ${parityResult.reason}`)
    }

    // Audit entry para reuse-discovery (separado de capabilities-discovery — G4 do SKILL).
    const cachedAtMs = cachedAt !== null ? Date.parse(cachedAt) : 0
    const writer = new AuditLogWriter(projectRoot, randomUUID())
    await writer.append({
      subagent_id: 'reuse-discovery',
      input_paths: ['discovery/agents-log.json'],
      output_struct: {
        cache_age_ms: Date.now() - cachedAtMs,
        cached_at: cachedAt,
        threshold_ms: FRESH_THRESHOLD_MS,
      },
      duration_ms: Date.now() - startMs,
      retry_count: 0,
    })

    // 2026-05-17 (Luiz/dev): skipRemaining mapeia process.exit(0) do SKILL.md linha 550 (PRD MH-04, CA-04).
    // NAO usa AbortError (semantica de erro). Campo aditivo — retro-compativel com Plano 01.
    return { mutated: true, summary: logLines.join('\n'), skipRemaining: true }
  },
}
