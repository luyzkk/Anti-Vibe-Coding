// 2026-05-24 (Luiz/dev): contrato init↔skill (D7/D21) — PRD MH-04, CA-03.
// Paths apontam para skills/compound-engineering/assets/ (cutover físico — Plano 02 fase-01).

import path from 'node:path'

export type CompoundManifestEntry = {
  /** Caminho absoluto da fonte `.tpl` (resolvido em runtime). */
  src: string
  /** Caminho de saida relativo a raiz do target. */
  dst: string
}

// 2026-05-24 (Luiz/dev): cutover físico — D21 + Plano 02 fase-01
// (estado anterior apontava para skills/init/assets/templates — transitório do Tracer Bullet)
const TEMPLATES_ROOT = path.resolve(import.meta.dir, '../assets')

const COMPOUND_ENTRIES: ReadonlyArray<{ src: string; dst: string }> = [
  { src: 'docs/COMPOUND_ENGINEERING.md.tpl',                   dst: 'docs/COMPOUND_ENGINEERING.md'                   },
  { src: 'docs/compound/README.md.tpl',                        dst: 'docs/compound/README.md'                        },
  { src: 'docs/review-checklists/README.md.tpl',               dst: 'docs/review-checklists/README.md'               },
  { src: 'docs/review-checklists/security.md.tpl',             dst: 'docs/review-checklists/security.md'             },
  { src: 'docs/review-checklists/reliability.md.tpl',          dst: 'docs/review-checklists/reliability.md'          },
  { src: 'docs/review-checklists/agent-api.md.tpl',            dst: 'docs/review-checklists/agent-api.md'            },
  { src: 'docs/review-checklists/frontend-ui.md.tpl',          dst: 'docs/review-checklists/frontend-ui.md'          },
  { src: 'docs/review-checklists/production-readiness.md.tpl', dst: 'docs/review-checklists/production-readiness.md' },
  { src: 'docs/smoke-flows/README.md.tpl',                     dst: 'docs/smoke-flows/README.md'                     },
  { src: 'scripts/compound-check.ts.tpl',                      dst: 'scripts/compound-check.ts'                      },
]

export function getCompoundManifest(): CompoundManifestEntry[] {
  return COMPOUND_ENTRIES.map(({ src, dst }) => ({
    src: path.resolve(TEMPLATES_ROOT, src),
    dst,
  }))
}
