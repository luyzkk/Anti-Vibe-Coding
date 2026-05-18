import type { Step, StepContext, StepReport } from './types'
import { readDiscoveryArtifact } from '../discovery-store'
import type { MergeProposal, MoveAction, BlockedAction } from '../merge-proposal-types'
import type { ClassifyBlocksHybridResult } from './08-classify-blocks-hybrid'
import type { SecretsScanResult } from './06-secrets-scan'

function buildMergeProposal(
  classifyResult: ClassifyBlocksHybridResult | null,
  secretsResult: SecretsScanResult | null,
): MergeProposal {
  const moves: MoveAction[] = []
  const blocked: BlockedAction[] = []

  if (classifyResult !== null) {
    for (const mapping of classifyResult.mappings) {
      moves.push({
        kind: 'move',
        source: mapping.source,
        target: mapping.target,
        orphan: false,
      })
    }
    for (const orphan of classifyResult.orphans) {
      moves.push({
        kind: 'move',
        source: orphan.source,
        target: orphan.target,
        orphan: true,
      })
    }
  }

  if (secretsResult !== null) {
    for (const blockedFile of secretsResult.blockedFiles) {
      const firstMatch = blockedFile.matches[0]
      blocked.push({
        kind: 'blocked',
        source: blockedFile.relativePath,
        reason: 'secret-detected',
        secretKind: firstMatch?.kind ?? 'unknown',
      })
    }
  }

  return { transforms: [], moves, blocked }
}

function isEmptyProposal(proposal: MergeProposal): boolean {
  return (
    proposal.transforms.length === 0 &&
    proposal.moves.length === 0 &&
    proposal.blocked.length === 0
  )
}

function buildDiffText(proposal: MergeProposal): string {
  const lines: string[] = []
  if (proposal.transforms.length > 0) {
    lines.push(`Transforms (${proposal.transforms.length}):`)
    for (const t of proposal.transforms) {
      lines.push(`  [transform] ${t.source} → ${t.target}`)
    }
  }
  if (proposal.moves.length > 0) {
    lines.push(`Moves (${proposal.moves.length}):`)
    for (const m of proposal.moves) {
      const tag = m.orphan ? ' [orphan]' : ''
      lines.push(`  [move${tag}] ${m.source} → ${m.target}`)
    }
  }
  if (proposal.blocked.length > 0) {
    lines.push(`Blocked (${proposal.blocked.length}):`)
    for (const b of proposal.blocked) {
      lines.push(`  [blocked] ${b.source} (${b.secretKind})`)
    }
  }
  return lines.join('\n')
}

export const proposeMergeBatchStep: Step = {
  id: '09-propose-merge-batch',

  async run(ctx: StepContext): Promise<StepReport> {
    // G9: --additive-merge early-return BEFORE reading artifacts
    if (ctx.flags['additive-merge'] === true) {
      return {
        mutated: false,
        summary: 'init-propose-merge: skipped — additive-merge mode, no existing docs will be moved',
      }
    }

    const classifyResult = await readDiscoveryArtifact<ClassifyBlocksHybridResult>(
      ctx.cwd,
      'classification-result',
    )
    const secretsResult = await readDiscoveryArtifact<SecretsScanResult>(
      ctx.cwd,
      'secrets-scan-result',
    )

    const proposal = buildMergeProposal(classifyResult, secretsResult)

    // G13: greenfield — empty proposal, no needsUser
    if (isEmptyProposal(proposal)) {
      return {
        mutated: false,
        summary: 'init-propose-merge: no transformations needed (greenfield or no existing docs)',
      }
    }

    const diffText = buildDiffText(proposal)

    // G8: --dry-run uses console.log instead of needsUser
    if (ctx.flags['dry-run'] === true) {
      console.log('[init-propose-merge dry-run]\n' + diffText)
      return {
        mutated: false,
        summary: `init-propose-merge: dry-run — ${proposal.moves.length} moves, ${proposal.transforms.length} transforms, ${proposal.blocked.length} blocked (noop)`,
      }
    }

    // G2: single needsUser with aggregated diff
    const promptLines = [
      'init-propose-merge: The following operations will be applied to merge existing docs into the harness:\n',
      diffText,
      '\nApply these changes?',
      // TODO CH-02 — ver detalhe por arquivo (Plano 05 fase-02 ou v6.5+)
    ]

    return {
      mutated: false,
      summary: `init-propose-merge: ${proposal.moves.length} moves, ${proposal.transforms.length} transforms, ${proposal.blocked.length} blocked — awaiting user confirmation`,
      needsUser: {
        prompt: promptLines.join('\n'),
        // TODO CH-02 — ver detalhe por arquivo (Plano 05 fase-02 ou v6.5+)
        options: ['apply', 'skip', 'abort'],
      },
    }
  },
}
