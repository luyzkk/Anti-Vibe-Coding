import type { Step, StepContext, StepReport } from './types'
import { readDiscoveryArtifact } from '../discovery-store'
import type { MergeProposal, MoveAction, BlockedAction } from '../merge-proposal-types'
import type { ClassifyBlocksHybridResult } from './08-classify-blocks-hybrid'
import type { SecretsScanResult } from './06-secrets-scan'
import { renderMergePreview, type MergePreview } from '../preview-renderer'
import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'
import type { AuditLogWriter } from '../audit-log'
import { isDryRun } from '../dry-run-mode'

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

// 2026-05-18 (Luiz/dev): Plano 05 fase-02 — converte MergeProposal para MergePreview (renderer unificado CA-07 + CA-13)
function buildPreviewFromProposal(proposal: MergeProposal): MergePreview {
  return {
    claudeMd: {
      originalLines: 0,
      finalLines: 36,
      akitaBlocks: proposal.transforms.map((t) => ({ title: t.source, target: t.target })),
    },
    docMoves: proposal.moves.map((m) => ({
      from: m.source,
      to: m.target,
      action: m.orphan ? 'reference' : 'move',
    })),
    blockedBySecrets: proposal.blocked.map((b) => ({
      path: b.source,
      reason: `${b.secretKind} detected — move blocked`,
    })),
    backupTimestamp: '(pending)',
  }
}

export const proposeMergeBatchStep: Step = {
  id: '09-propose-merge-batch',

  async run(ctx: StepContext): Promise<StepReport> {
    const startMs = performance.now()

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
      const writer = isDryRun(ctx) ? undefined : (ctx.flags['__auditLog'] as AuditLogWriter | undefined)
      await writer?.append({
        subagent_id: INIT_SUBAGENT_IDS.proposeMerge,
        input_paths: [ctx.cwd],
        output_struct: {
          claudeMdReduction: { fromLines: 0, toLines: 0 },
          docMovesCount: 0,
          blockedBySecretsCount: 0,
        },
        duration_ms: Math.round(performance.now() - startMs),
        retry_count: 0,
      })
      return {
        mutated: false,
        summary: 'init-propose-merge: no transformations needed (greenfield or no existing docs)',
      }
    }

    // 2026-05-18 (Luiz/dev): Plano 05 fase-02 — UNICA fonte de string de preview (CA-07 + CA-13)
    const preview = buildPreviewFromProposal(proposal)
    const renderedPreview = renderMergePreview(preview)

    const durationMs = Math.round(performance.now() - startMs)
    const writer = isDryRun(ctx) ? undefined : (ctx.flags['__auditLog'] as AuditLogWriter | undefined)
    await writer?.append({
      subagent_id: INIT_SUBAGENT_IDS.proposeMerge,
      input_paths: [ctx.cwd],
      output_struct: {
        claudeMdReduction: { fromLines: 0, toLines: 0 },
        docMovesCount: proposal.moves.length,
        blockedBySecretsCount: proposal.blocked.length,
      },
      duration_ms: durationMs,
      retry_count: 0,
    })

    // G8: --dry-run uses console.log instead of needsUser
    if (ctx.flags['dry-run'] === true) {
      console.log('[init-propose-merge dry-run]\n' + renderedPreview)
      return {
        mutated: false,
        summary: `init-propose-merge: dry-run — ${proposal.moves.length} moves, ${proposal.transforms.length} transforms, ${proposal.blocked.length} blocked (noop)`,
      }
    }

    // G2: single needsUser with aggregated diff — mesmo renderer (CA-13 parity)
    return {
      mutated: false,
      summary: `init-propose-merge: ${proposal.moves.length} moves, ${proposal.transforms.length} transforms, ${proposal.blocked.length} blocked — awaiting user confirmation`,
      needsUser: {
        prompt: renderedPreview,
        // TODO CH-02 — ver detalhe por arquivo (v6.5+)
        options: ['apply', 'skip', 'abort'],
      },
    }
  },
}
