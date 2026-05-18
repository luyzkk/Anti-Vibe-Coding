import type { Step, StepContext, StepReport } from './types'
import {
  classifyDocs,
  type DocMapping,
  type OrphanMapping,
  type GlossaryEntry,
} from '../blocks-classifier'
import type { DiscoveredDocWithFlags } from './07-discover-existing-docs'
import { readDiscoveryArtifact, writeDiscoveryArtifact } from '../discovery-store'

export type ClassifyBlocksHybridResult = {
  readonly subagent_id: 'init-classify-blocks'
  readonly mappings: readonly DocMapping[]
  readonly orphans: readonly OrphanMapping[]
  readonly sharedGlossary: readonly GlossaryEntry[]
  readonly pendingLlmRefinement: readonly string[]
  readonly skippedDueToSecret: readonly string[]
  readonly durationMs: number
}

type DiscoveredDocsArtifact = {
  readonly docs: readonly DiscoveredDocWithFlags[]
}

function countConfidence(
  mappings: readonly DocMapping[],
): { high: number; medium: number; low: number } {
  let high = 0, medium = 0, low = 0
  for (const m of mappings) {
    if (m.confidence === 'high') high++
    else if (m.confidence === 'medium') medium++
    else low++
  }
  return { high, medium, low }
}

export const classifyBlocksHybridStep: Step = {
  id: '08-classify-blocks-hybrid',

  async run(ctx: StepContext): Promise<StepReport> {
    const startedAt = performance.now()

    const artifact = await readDiscoveryArtifact<DiscoveredDocsArtifact>(ctx.cwd, 'discovered-docs')
    if (artifact === null || artifact.docs.length === 0) {
      return {
        mutated: false,
        summary: 'classify-blocks-hybrid [init-classify-blocks]: 0 docs (nenhum discovered)',
      }
    }

    const blocked = artifact.docs.filter((d) => d.blockedBySecret)
    const eligible = artifact.docs.filter((d) => !d.blockedBySecret)

    const out = await classifyDocs({
      docs: eligible,
      cwd: ctx.cwd,
    })

    const pendingLlmRefinement = out.mappings
      .filter((m) => m.pendingLlmRefinement)
      .map((m) => m.source)

    const result: ClassifyBlocksHybridResult = {
      subagent_id: 'init-classify-blocks',
      mappings: out.mappings,
      orphans: out.orphans,
      sharedGlossary: out.sharedGlossary,
      pendingLlmRefinement,
      skippedDueToSecret: blocked.map((d) => d.relativePath),
      durationMs: Math.round(performance.now() - startedAt),
    }

    const noWrite = ctx.flags['dry-run'] === true
    await writeDiscoveryArtifact(ctx.cwd, 'classification-result', result, { noWrite })

    const confidenceCounts = countConfidence(out.mappings)
    return {
      mutated: false,
      summary: `classify-blocks-hybrid [init-classify-blocks]: ${out.mappings.length} classificados (${confidenceCounts.high} high, ${confidenceCounts.medium} medium, ${confidenceCounts.low} low), ${out.orphans.length} orfaos → references, ${out.sharedGlossary.length} termos no glossario`,
    }
  },
}
