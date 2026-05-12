// 2026-05-11 (Luiz/dev): detector v5.x — D9 (/init absorve), D15 (sem /migrate dedicada).
// Retorna LegacyState para que /init decida fluxo: novo / migrar / ja-v6.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type LegacyArtifact =
  | 'planning-dir'           // .planning/ existe e tem conteudo
  | 'lessons-learned'        // lessons-learned.md na raiz
  | 'decisions'              // decisions.md na raiz
  | 'senior-principles'      // senior-principles.md na raiz (raro fora do plugin)

export type LegacyState = {
  /** True se ao menos UM artefato v5.x foi detectado. */
  isLegacy: boolean
  /** True se docs/ ja existe com sinal de v6 (evita duplo-migrar). */
  alreadyMigrated: boolean
  /** Lista de artefatos encontrados (ordem documentada). */
  artifacts: LegacyArtifact[]
  /** Paths absolutos detectados — para o caller passar adiante sem re-stat. */
  paths: Partial<Record<LegacyArtifact, string>>
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Heuristica de v5.x: .planning/ ou um dos 3 .md legados.
 * Heuristica de "ja em v6": docs/exec-plans/ existe (foi gerado por scaffold v6).
 * Caller decide: se isLegacy && !alreadyMigrated → oferecer migracao.
 *
 * @example
 * const state = await detectV5Legacy('/path/to/project')
 * if (state.isLegacy && !state.alreadyMigrated) {
 *   // oferecer migracao
 * }
 */
export async function detectV5Legacy(targetDir: string): Promise<LegacyState> {
  const probes: Array<[LegacyArtifact, string]> = [
    ['planning-dir', path.join(targetDir, '.planning')],
    ['lessons-learned', path.join(targetDir, 'lessons-learned.md')],
    ['decisions', path.join(targetDir, 'decisions.md')],
    ['senior-principles', path.join(targetDir, 'senior-principles.md')],
  ]

  const artifacts: LegacyArtifact[] = []
  const paths: LegacyState['paths'] = {}

  for (const [id, p] of probes) {
    if (await exists(p)) {
      // Para .planning/ exigimos conteudo > 0 (diretorio vazio nao conta).
      if (id === 'planning-dir') {
        const entries = await fs.readdir(p).catch(() => [])
        if (entries.length === 0) continue
      }
      artifacts.push(id)
      paths[id] = p
    }
  }

  const v6Marker = path.join(targetDir, 'docs', 'exec-plans')
  const alreadyMigrated = await exists(v6Marker)

  return {
    isLegacy: artifacts.length > 0,
    alreadyMigrated,
    artifacts,
    paths,
  }
}
