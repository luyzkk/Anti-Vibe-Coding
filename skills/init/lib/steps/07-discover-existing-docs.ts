import type { Step, StepContext, StepReport } from './types'
import { discoverExistingDocs, type DiscoveredDoc } from '../discover-existing-docs'
import { readDiscoveryArtifact, writeDiscoveryArtifact } from '../discovery-store'
import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'
import type { AuditLogWriter } from '../audit-log'
import { isDryRun } from '../dry-run-mode'

export type DiscoveredDocWithFlags = DiscoveredDoc & {
  readonly blockedBySecret: boolean
}

export type DiscoverExistingDocsResult = {
  readonly subagent_id: 'init-discover-existing-docs'
  readonly docs: readonly DiscoveredDocWithFlags[]
  readonly blockedCount: number
  readonly durationMs: number
}

type SecretsScanResultShape = {
  readonly blockedFiles: ReadonlyArray<{ readonly relativePath: string }>
}

async function loadBlockedSet(cwd: string): Promise<ReadonlySet<string>> {
  const result = await readDiscoveryArtifact<SecretsScanResultShape>(cwd, 'secrets-scan-result')
  if (result === null) return new Set()
  return new Set(result.blockedFiles.map((b) => b.relativePath))
}

export const discoverExistingDocsStep: Step = {
  id: '07-discover-existing-docs',

  async run(ctx: StepContext): Promise<StepReport> {
    const startedAt = performance.now()
    const [rawDocs, blockedSet] = await Promise.all([
      discoverExistingDocs(ctx.cwd),
      loadBlockedSet(ctx.cwd),
    ])

    const docs: DiscoveredDocWithFlags[] = rawDocs.map((d) => ({
      ...d,
      blockedBySecret: blockedSet.has(d.relativePath),
    }))

    const blockedCount = docs.reduce((n, d) => n + (d.blockedBySecret ? 1 : 0), 0)
    const durationMs = Math.round(performance.now() - startedAt)

    const result: DiscoverExistingDocsResult = {
      subagent_id: 'init-discover-existing-docs',
      docs,
      blockedCount,
      durationMs,
    }

    const noWrite = ctx.flags['dry-run'] === true
    await writeDiscoveryArtifact(ctx.cwd, 'discovered-docs', result, { noWrite })

    const writer = isDryRun(ctx) ? undefined : (ctx.flags['__auditLog'] as AuditLogWriter | undefined)
    await writer?.append({
      subagent_id: INIT_SUBAGENT_IDS.discoverDocs,
      input_paths: [ctx.cwd],
      output_struct: {
        candidateCount: docs.length,
        scannedRoots: ['', 'docs', '.claude'],
      },
      duration_ms: durationMs,
      retry_count: 0,
    })

    return {
      mutated: false,
      summary: `discover-existing-docs [init-discover-existing-docs]: ${docs.length} arquivos encontrados (${blockedCount} bloqueados por secrets) — ${durationMs}ms`,
    }
  },
}
