// 2026-05-18 (Luiz/dev): Step 11 — itera MoveAction[] e chama moveDocWithStub.
// README guard conservador (v1): qualquer README.md e skipado (G3 plano04).
// blockedFiles do secrets-scan-result sao skipados silenciosamente (SH-01, D16).
// appendToLatestBackup e chamado apos cada move bem-sucedido — falha nao aborta.
// Cria diretorio pai do target antes do move (moveDocWithStub usa fs.rename que nao cria dirs).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { moveDocWithStub } from '../doc-mover-stub'
import { readDiscoveryArtifact } from '../discovery-store'
import { appendToLatestBackup } from '../backup-anti-vibe'
import type { Step, StepContext, StepReport } from './types'
import type { ClassifyOutput } from '../blocks-classifier'
import type { SecretsScanResult } from './06-secrets-scan'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type MoveCandidate = {
  readonly source: string
  readonly target: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// 2026-05-18 (Luiz/dev): conservador para v1 — qualquer README.md e protegido (G3 plano04).
// Plano 05+ pode refinar para skippear apenas a raiz se necessario.
function isProtectedReadme(relpath: string): boolean {
  return path.basename(relpath) === 'README.md'
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export const moveDocsWithStubStep: Step = {
  id: '11-move-docs-with-stub',

  async run(ctx: StepContext): Promise<StepReport> {
    // 1. Ler classification-result (mappings + orphans)
    const classifyResult = await readDiscoveryArtifact<ClassifyOutput>(ctx.cwd, 'classification-result')

    // 2. Ler secrets-scan-result (blockedFiles)
    const secretsResult = await readDiscoveryArtifact<SecretsScanResult>(ctx.cwd, 'secrets-scan-result')

    // 3. Montar allMoves = mappings + orphans
    const allMoves: MoveCandidate[] = []

    if (classifyResult !== null) {
      for (const m of classifyResult.mappings) {
        allMoves.push({ source: m.source, target: m.target })
      }
      for (const o of classifyResult.orphans) {
        allMoves.push({ source: o.source, target: o.target })
      }
    }

    // 4. Se vazio → return mutated:false
    if (allMoves.length === 0) {
      return {
        mutated: false,
        summary: 'init-move-docs: no docs to move',
      }
    }

    // 5. Se --dry-run → return mutated:false com preview
    if (ctx.flags['dry-run'] === true) {
      return {
        mutated: false,
        summary: `init-move-docs: dry-run preview (${allMoves.length} planned)`,
      }
    }

    // Montar blockedSet a partir de blockedFiles[].relativePath
    const blockedSet = new Set<string>()
    if (secretsResult !== null) {
      for (const bf of secretsResult.blockedFiles) {
        blockedSet.add(bf.relativePath)
      }
    }

    // 6. Para cada move
    const moved: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const candidate of allMoves) {
      // Checar README guard
      if (isProtectedReadme(candidate.source)) {
        skipped.push(candidate.source)
        continue
      }

      // Checar blocked by secrets
      if (blockedSet.has(candidate.source)) {
        skipped.push(candidate.source)
        continue
      }

      // Criar diretorio pai do target (fs.rename nao cria dirs automaticamente)
      const targetAbs = path.join(ctx.cwd, candidate.target)
      await fs.mkdir(path.dirname(targetAbs), { recursive: true })

      // Chamar moveDocWithStub
      const result = await moveDocWithStub({
        source: candidate.source,
        target: candidate.target,
        repoRoot: ctx.cwd,
      })

      if (result.moved) {
        moved.push(candidate.source)

        // Tentar appendToLatestBackup — falha nao aborta
        try {
          await appendToLatestBackup({
            cwd: ctx.cwd,
            entry: {
              originalPath: candidate.source,
              backupPath: candidate.source,
              action: 'move',
            },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`appendBackup(${candidate.source}): ${msg}`)
        }
      } else {
        // Move falhou (source nao existe, target ja existe, etc.)
        for (const e of result.errors) {
          errors.push(`${candidate.source}: ${e.message}`)
        }
        skipped.push(candidate.source)
      }
    }

    // 7. Return
    return {
      mutated: moved.length > 0,
      summary: `init-move-docs: ${moved.length} moved, ${skipped.length} skipped, ${errors.length} errors`,
    }
  },
}
