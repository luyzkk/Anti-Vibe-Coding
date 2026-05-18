// skills/init/lib/steps/15-capabilities-discovery.ts
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { readArchitectureProfile } from '../../../lib/read-architecture-profile'
import { discoverCapabilities } from '../../../lib/capabilities-writer'
import { AuditLogWriter } from '../audit-log'
import type { Step } from './types'

export const capabilitiesDiscoveryStep: Step = {
  id: 'capabilities-discovery',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): G7 do plano — soft-fail OBRIGATORIO (PRD CA-06).
    // Try/catch GLOBAL engole tudo. Step nunca lanca. Step nunca aborta /init.
    try {
      const projectRoot = ctx.cwd
      const profileObj = readArchitectureProfile()

      if (profileObj === null) {
        // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 421 (PRD R1, G1).
        return {
          mutated: false,
          summary: '[capabilities-discovery] skipped — architecture profile not detected. Run /anti-vibe-coding:detect-architecture first.',
        }
      }

      const startMs = Date.now()
      const output = await discoverCapabilities(projectRoot, profileObj.profile)

      const discoveryDir = path.join(projectRoot, 'discovery')
      await mkdir(discoveryDir, { recursive: true })
      const capsPath = path.join(discoveryDir, 'capabilities.json')
      await writeFile(capsPath, JSON.stringify(output, null, 2), 'utf-8')

      const lines: string[] = []

      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 432 (PRD R1, G1).
      // Schema-mismatch eh apenas WARN — nao falha. Inclui na SUMMARY (visto pelo user).
      if (output.schema_version !== '1.0') {
        lines.push('[capabilities-discovery] schema_version mismatch — expected "1.0", got ' + JSON.stringify(output.schema_version))
      }

      const writer = new AuditLogWriter(projectRoot, randomUUID())
      await writer.append({
        subagent_id: 'capabilities-discovery',
        input_paths: ['app/**', 'routes/**'],
        output_struct: {
          capabilities_count: output.capabilities.length,
          coverage_gaps_count: output.coverage_gaps.length,
          profile: profileObj.profile,
          schema_version: '1.0',
        },
        duration_ms: Date.now() - startMs,
        retry_count: 0,
      })

      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 452/454 (PRD R1, G1).
      if (output.coverage_gaps.length > 0 && output.capabilities.length === 0) {
        lines.push('Capabilities discovery found no routes. Consider running /anti-vibe-coding:init --refresh after adding routes.')
      } else if (output.coverage_gaps.length > 0) {
        lines.push('Capabilities discovery: ' + output.capabilities.length + ' routes found, ' + output.coverage_gaps.length + ' coverage gaps. Run /anti-vibe-coding:init --refresh if routes change.')
      }

      return {
        mutated: true,
        summary: lines.join('\n'),
      }
    } catch (err) {
      // 2026-05-17 (Luiz/dev): G7 do plano — soft-fail. NUNCA rethrow. PRD CA-06.
      // wording byte-identico ao SKILL.md linha 458.
      const message = err instanceof Error ? err.message : String(err)
      return {
        mutated: false,
        summary: '[capabilities-discovery] step failed, skipping: ' + message,
      }
    }
  },
}
