// 2026-05-11 (Luiz/dev): manifest de templates do harness — Plano 02 fase-01.
// Alinhado com PRD M2 (estrutura completa) e D9 (/init absorve harness).
// Cada entrada mapeia source `.tpl` (relativo ao templates root) para destino no projeto.
// NOTA: se este arquivo for movido de pasta, o path.join em TEMPLATES_ROOT quebra.
// 2026-05-24 (Luiz/dev): consumo cross-skill (D7) — as 10 entradas compound agora vem
// de getCompoundManifest() da skill compound-engineering. Paths transitórios: src ainda aponta
// para skills/init/assets/templates/ até Plano 02 fase-01 (git mv). G2/R11 mitigado por
// invariante em template-manifest.test.ts. D25: NAO usa Skill tool — import puro.

import path from 'node:path'
import { getCompoundManifest } from '../../compound-engineering/lib/manifest'

// 2026-05-24 (Luiz/dev): classificação compound preservada do hardcode anterior — D7, G2.
// Hash-map preferido a switch (CLAUDE.md). Plano 02 fase-01 nao altera este mapeamento.
const COMPOUND_CATEGORY_BY_DST: Record<string, 'canon-andre' | 'anti-vibe-extension'> = {
  'docs/COMPOUND_ENGINEERING.md':                   'anti-vibe-extension',
  'docs/compound/README.md':                        'canon-andre',
  'docs/review-checklists/README.md':               'canon-andre',
  'docs/review-checklists/security.md':             'canon-andre',
  'docs/review-checklists/reliability.md':          'canon-andre',
  'docs/review-checklists/agent-api.md':            'canon-andre',
  'docs/review-checklists/frontend-ui.md':          'canon-andre',
  'docs/review-checklists/production-readiness.md': 'canon-andre',
  'docs/smoke-flows/README.md':                     'anti-vibe-extension',
  'scripts/compound-check.ts':                      'anti-vibe-extension',
}

export type TemplateEntry = {
  /** Caminho do `.tpl` relativo a `assets/templates/`. */
  src: string
  /** Caminho de saida relativo ao `targetDir` do projeto. */
  dst: string
  /** Marca arquivos que sempre sao copiados (nao opcionais). */
  required: boolean
  /**
   * Classificação do slot:
   * - 'canon-andre': um dos 22 arquivos do harness-engineering de André Prado (imutáveis por DT-09)
   * - 'anti-vibe-extension': extensão adicionada pelo Anti-Vibe Coding
   *
   * Impacto no validador:
   * - Ausência de canon-andre instalado = erro
   * - Ausência de anti-vibe-extension instalado = warning
   */
  category: 'canon-andre' | 'anti-vibe-extension'
}

export const TEMPLATES_ROOT = path.join(import.meta.dir, '..', 'assets', 'templates')

// 2026-05-24 (Luiz/dev): converte CompoundManifestEntry[] em TemplateEntry[] para o manifest.
// src absoluto (de getCompoundManifest) → relativo via path.relative (G3 do plano).
// IMPORTANTE: getCompoundManifest() preserva a ordem original das 10 entradas (G2/R11).
// Nao reagrupar: posicao no TEMPLATE_MANIFEST determina ordem do scaffold golden.
function buildCompoundEntries(): TemplateEntry[] {
  return getCompoundManifest().map(({ src, dst }) => {
    const category = COMPOUND_CATEGORY_BY_DST[dst]
    if (category === undefined) {
      throw new Error(`[template-manifest] compound dst sem categoria mapeada: ${dst}`)
    }
    return {
      src: path.relative(TEMPLATES_ROOT, src),
      dst,
      required: true,
      category,
    }
  })
}

// 2026-05-24 (Luiz/dev): helper para extrair entrada unica por dst — spread fragmentado (G2).
// Preserva posicao original de cada entrada compound no array final.
function compoundEntry(dst: string): TemplateEntry {
  const entry = buildCompoundEntries().find(e => e.dst === dst)
  if (!entry) {
    throw new Error(`[template-manifest] compound entry nao encontrada para dst: ${dst}`)
  }
  return entry
}

export const TEMPLATE_MANIFEST: ReadonlyArray<TemplateEntry> = [
  // Camada 1: docs institucionais (raiz docs/)
  { src: 'docs/DESIGN.md.tpl',                     dst: 'docs/DESIGN.md',                     required: true,  category: 'canon-andre'          },
  { src: 'docs/FRONTEND.md.tpl',                   dst: 'docs/FRONTEND.md',                   required: true,  category: 'canon-andre'          },
  { src: 'docs/PLANS.md.tpl',                      dst: 'docs/PLANS.md',                      required: true,  category: 'canon-andre'          },
  { src: 'docs/PRODUCT_SENSE.md.tpl',              dst: 'docs/PRODUCT_SENSE.md',              required: true,  category: 'canon-andre'          },
  { src: 'docs/QUALITY_SCORE.md.tpl',              dst: 'docs/QUALITY_SCORE.md',              required: true,  category: 'canon-andre'          },
  // 2026-05-13 (Luiz/dev): MERGE_GATES split from QUALITY_SCORE (binary gates vs living dashboard).
  { src: 'docs/MERGE_GATES.md.tpl',                dst: 'docs/MERGE_GATES.md',                required: true,  category: 'anti-vibe-extension'  },
  { src: 'docs/RELIABILITY.md.tpl',                dst: 'docs/RELIABILITY.md',                required: true,  category: 'canon-andre'          },
  { src: 'docs/SECURITY.md.tpl',                   dst: 'docs/SECURITY.md',                   required: true,  category: 'canon-andre'          },
  // 2026-05-24 (Luiz/dev): consumo cross-skill D7 — posicao preservada (G2).
  compoundEntry('docs/COMPOUND_ENGINEERING.md'),
  // 2026-05-19 (Luiz/dev): Plano 02 fase-01 — CODE_STYLE.md destino do Akita-style
  // (Bug E, MH-06, CA-08). Separa code-style de DESIGN.md (Design System visual).
  // Categoria anti-vibe-extension pois nao faz parte dos 22 docs canonicos do Andre Prado (DT-09).
  // D1 do CONTEXT.md: nome canonico = docs/CODE_STYLE.md.
  { src: 'docs/CODE_STYLE.md.tpl',                 dst: 'docs/CODE_STYLE.md',                 required: true,  category: 'anti-vibe-extension'  },

  // Camada 2: design-docs/
  { src: 'docs/design-docs/index.md.tpl',          dst: 'docs/design-docs/index.md',          required: true,  category: 'canon-andre'          },
  { src: 'docs/design-docs/core-beliefs.md.tpl',   dst: 'docs/design-docs/core-beliefs.md',   required: true,  category: 'canon-andre'          },

  // Camada 3: exec-plans/
  { src: 'docs/exec-plans/active/README.md.tpl',          dst: 'docs/exec-plans/active/README.md',          required: true,  category: 'canon-andre'  },
  { src: 'docs/exec-plans/completed/README.md.tpl',       dst: 'docs/exec-plans/completed/README.md',       required: true,  category: 'canon-andre'  },
  { src: 'docs/exec-plans/tech-debt-tracker.md.tpl',      dst: 'docs/exec-plans/tech-debt-tracker.md',      required: true,  category: 'canon-andre'  },

  // Camada 4: compound/
  // 2026-05-24 (Luiz/dev): consumo cross-skill D7 — posicao preservada (G2).
  compoundEntry('docs/compound/README.md'),

  // Camada 5: review-checklists/
  // 2026-05-24 (Luiz/dev): consumo cross-skill D7 — posicoes preservadas (G2).
  compoundEntry('docs/review-checklists/README.md'),
  compoundEntry('docs/review-checklists/security.md'),
  compoundEntry('docs/review-checklists/reliability.md'),
  compoundEntry('docs/review-checklists/agent-api.md'),
  compoundEntry('docs/review-checklists/frontend-ui.md'),
  compoundEntry('docs/review-checklists/production-readiness.md'),

  // Camada 6: smoke-flows / product-specs / references / generated
  // 2026-05-24 (Luiz/dev): consumo cross-skill D7 — posicao preservada (G2).
  compoundEntry('docs/smoke-flows/README.md'),
  { src: 'docs/product-specs/index.md.tpl',        dst: 'docs/product-specs/index.md',        required: true,  category: 'canon-andre'          },
  { src: 'docs/references/README.md.tpl',          dst: 'docs/references/README.md',          required: true,  category: 'canon-andre'          },
  { src: 'docs/generated/db-schema.md.tpl',        dst: 'docs/generated/db-schema.md',        required: true,  category: 'anti-vibe-extension'  },

  // Camada 7: state snapshot
  { src: 'docs/STATE.md.tpl',                      dst: 'docs/STATE.md',                      required: true,  category: 'canon-andre'          },

  // Raiz
  { src: 'TODO.md.tpl',                            dst: 'TODO.md',                            required: true,  category: 'anti-vibe-extension'  },

  // Scripts de validacao
  // 2026-05-11 (Luiz/dev): Plano 04 fase-01 — compound-check entra no scaffold.
  // 2026-05-24 (Luiz/dev): consumo cross-skill D7 — posicao preservada (G2).
  compoundEntry('scripts/compound-check.ts'),
  // 2026-05-13 (Luiz/dev): new-plan scaffolder porta do harness do Andre Prado.
  { src: 'scripts/new-plan.ts.tpl',                dst: 'scripts/new-plan.ts',                required: true,  category: 'anti-vibe-extension'  },
  // 2026-05-21 (Luiz/dev): fix scaffold init-v7 — Step 5 (scaffoldAndLinkStep) parou de chamar
  // scaffoldTemplates (lib antiga com lista hardcoded). harness-validate.ts.tpl + package.json.tpl
  // ficaram orfaos. Migrados do hardcoded para o manifest: agora scaffoldFullTree os copia.
  { src: 'scripts/harness-validate.ts.tpl',        dst: 'scripts/harness-validate.ts',        required: true,  category: 'anti-vibe-extension'  },

  // Raiz obrigatoria (harness required-files)
  // 2026-05-12 (Luiz/dev): Plano 04 fase-03 — README.md e .github/pull_request_template.md
  // sao required pelo harness-validate full. Adicionados aqui para tracer regression pass.
  { src: 'README.md.tpl',                          dst: 'README.md',                          required: true,  category: 'anti-vibe-extension'  },
  { src: '.github/pull_request_template.md.tpl',   dst: '.github/pull_request_template.md',   required: true,  category: 'anti-vibe-extension'  },
  // 2026-05-21 (Luiz/dev): fix scaffold init-v7 — package.json com scripts harness:validate +
  // compound:check + harness:all. Guard fileExists em scaffoldFullTree:80 preserva package.json
  // pre-existente em consumidor legacy (nao sobrescreve). Em greenfield, cria do zero.
  { src: 'package.json.tpl',                       dst: 'package.json',                       required: true,  category: 'anti-vibe-extension'  },

  // 2026-05-19 (Luiz/dev): D6 do PRD populate-plan-andre-port (Plano 01 fase-01) — ARCHITECTURE.md,
  // AGENTS.md e .claude/CLAUDE.md sao docs canonicos do contrato Harness do Andre (espelhados).
  // Sem opt-out: alguns agents externos so leem AGENTS.md, outros so CLAUDE.md, ambos devem coexistir.
  // ARCHITECTURE/AGENTS sao canon-andre (estao no contrato Harness original).
  // .claude/CLAUDE.md e anti-vibe-extension (Andre nao tem `.claude/` no harness).
  { src: 'ARCHITECTURE.md.tpl',                    dst: 'ARCHITECTURE.md',                    required: true,  category: 'canon-andre'          },
  { src: 'AGENTS.md.tpl',                          dst: 'AGENTS.md',                          required: true,  category: 'canon-andre'          },
  { src: '.claude/CLAUDE.md.tpl',                  dst: '.claude/CLAUDE.md',                  required: true,  category: 'anti-vibe-extension'  },
]
