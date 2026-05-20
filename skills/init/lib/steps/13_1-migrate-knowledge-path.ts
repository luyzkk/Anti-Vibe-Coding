// skills/init/lib/steps/13_1-migrate-knowledge-path.ts
// 2026-05-20 (Luiz/dev): D7.A.1 do PRD knowledge-path-cutover — step dedicado SRP.
// Move docs/knowledge/legacy-claude-knowledge/ (artefato init v5) → docs/_legacy/knowledge/.
// AR-03: numbering 13_1- segue padrao NN_M- ja em uso no projeto.
// Roda APOS migrate4DecisionsStep (que popula legacy-claude-knowledge via migrate-claude-artifacts).
// Sequencia garantida por AR-01: backupPre650 (copia defensiva) → migrate-* → este step → scaffold.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Step, StepReport } from './types'
import { AbortError } from './abort-error'

const LEGACY_SRC_REL = path.join('docs', 'knowledge', 'legacy-claude-knowledge')
const LEGACY_DEST_REL = path.join('docs', '_legacy', 'knowledge')

export async function runMigrateKnowledgePathStep(ctx: {
  cwd: string
  flags?: Readonly<Record<string, boolean | string>>
}): Promise<StepReport> {
  // 2026-05-20 (Luiz/dev): dry-run guard — consistente com outros steps do pipeline.
  if (ctx.flags?.['dry-run'] === true) {
    return { mutated: false, summary: 'dry-run: migrate-knowledge-path would run in re-populate mode' }
  }

  // 2026-05-20 (Luiz/dev): D5/D7 — apenas em re-populate (CA-08 requer __reentryMode='re-populate').
  if (ctx.flags?.['__reentryMode'] !== 're-populate') {
    return { mutated: false, summary: 'skipped: not in re-populate mode' }
  }

  const src = path.join(ctx.cwd, LEGACY_SRC_REL)
  const dest = path.join(ctx.cwd, LEGACY_DEST_REL)

  // Verificar se fonte existe
  const srcExists = await fs.access(src).then(() => true).catch(() => false)
  if (!srcExists) {
    return { mutated: false, summary: 'skipped: no legacy docs/knowledge/legacy-claude-knowledge found' }
  }

  // 2026-05-20 (Luiz/dev): D8 guard de colisao (CA-09) — abortar se destino ja existe.
  // Usuario deve remover manualmente ou migracao ja foi feita em execucao anterior.
  const destExists = await fs.access(dest).then(() => true).catch(() => false)
  if (destExists) {
    throw new AbortError({
      code: 2,
      reason:
        'Destino já existe: docs/_legacy/knowledge/. ' +
        'Migração manual necessária ou remova `docs/_legacy/knowledge/` para permitir migração automática.',
    })
  }

  // Garantir que o diretorio pai do destino existe
  await fs.mkdir(path.dirname(dest), { recursive: true })

  // Rename atomico (no-op se mesma particao, O(1))
  // GT: se EXDEV (cross-device), fs.rename falha — documentado como gotcha, fallback YAGNI.
  await fs.rename(src, dest)

  return {
    mutated: true,
    summary: `migrated docs/knowledge/legacy-claude-knowledge → docs/_legacy/knowledge`,
  }
}

export const migrateKnowledgePathStep: Step = {
  id: '13_1-migrate-knowledge-path',
  async run(ctx) {
    return runMigrateKnowledgePathStep(ctx)
  },
}
