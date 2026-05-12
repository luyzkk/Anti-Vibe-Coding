// 2026-05-11 (Luiz/dev): manifest de templates do harness — Plano 02 fase-01.
// Alinhado com PRD M2 (estrutura completa) e D9 (/init absorve harness).
// Cada entrada mapeia source `.tpl` (relativo ao templates root) para destino no projeto.
// NOTA: se este arquivo for movido de pasta, o path.join em TEMPLATES_ROOT quebra.

import path from 'node:path'

export type TemplateEntry = {
  /** Caminho do `.tpl` relativo a `assets/templates/`. */
  src: string
  /** Caminho de saida relativo ao `targetDir` do projeto. */
  dst: string
  /** Marca arquivos que sempre sao copiados (nao opcionais). */
  required: boolean
}

export const TEMPLATE_MANIFEST: ReadonlyArray<TemplateEntry> = [
  // Camada 1: docs institucionais (raiz docs/)
  { src: 'docs/DESIGN.md.tpl',                     dst: 'docs/DESIGN.md',                     required: true },
  { src: 'docs/FRONTEND.md.tpl',                   dst: 'docs/FRONTEND.md',                   required: true },
  { src: 'docs/PLANS.md.tpl',                      dst: 'docs/PLANS.md',                      required: true },
  { src: 'docs/PRODUCT_SENSE.md.tpl',              dst: 'docs/PRODUCT_SENSE.md',              required: true },
  { src: 'docs/QUALITY_SCORE.md.tpl',              dst: 'docs/QUALITY_SCORE.md',              required: true },
  { src: 'docs/RELIABILITY.md.tpl',                dst: 'docs/RELIABILITY.md',                required: true },
  { src: 'docs/SECURITY.md.tpl',                   dst: 'docs/SECURITY.md',                   required: true },
  { src: 'docs/COMPOUND_ENGINEERING.md.tpl',       dst: 'docs/COMPOUND_ENGINEERING.md',       required: true },

  // Camada 2: design-docs/
  { src: 'docs/design-docs/index.md.tpl',          dst: 'docs/design-docs/index.md',          required: true },
  { src: 'docs/design-docs/core-beliefs.md.tpl',   dst: 'docs/design-docs/core-beliefs.md',   required: true },

  // Camada 3: exec-plans/
  { src: 'docs/exec-plans/active/README.md.tpl',          dst: 'docs/exec-plans/active/README.md',          required: true },
  { src: 'docs/exec-plans/completed/README.md.tpl',       dst: 'docs/exec-plans/completed/README.md',       required: true },
  { src: 'docs/exec-plans/tech-debt-tracker.md.tpl',      dst: 'docs/exec-plans/tech-debt-tracker.md',      required: true },

  // Camada 4: compound/
  { src: 'docs/compound/README.md.tpl',            dst: 'docs/compound/README.md',            required: true },

  // Camada 5: review-checklists/
  { src: 'docs/review-checklists/README.md.tpl',               dst: 'docs/review-checklists/README.md',               required: true },
  { src: 'docs/review-checklists/security.md.tpl',             dst: 'docs/review-checklists/security.md',             required: true },
  { src: 'docs/review-checklists/reliability.md.tpl',          dst: 'docs/review-checklists/reliability.md',          required: true },
  { src: 'docs/review-checklists/agent-api.md.tpl',            dst: 'docs/review-checklists/agent-api.md',            required: true },
  { src: 'docs/review-checklists/frontend-ui.md.tpl',          dst: 'docs/review-checklists/frontend-ui.md',          required: true },
  { src: 'docs/review-checklists/production-readiness.md.tpl', dst: 'docs/review-checklists/production-readiness.md', required: true },

  // Camada 6: smoke-flows / product-specs / references / generated
  { src: 'docs/smoke-flows/README.md.tpl',         dst: 'docs/smoke-flows/README.md',         required: true },
  { src: 'docs/product-specs/index.md.tpl',        dst: 'docs/product-specs/index.md',        required: true },
  { src: 'docs/references/README.md.tpl',          dst: 'docs/references/README.md',          required: true },
  { src: 'docs/generated/db-schema.md.tpl',        dst: 'docs/generated/db-schema.md',        required: true },

  // Camada 7: state snapshot
  { src: 'docs/STATE.md.tpl',                      dst: 'docs/STATE.md',                      required: true },

  // Raiz
  { src: 'TODO.md.tpl',                            dst: 'TODO.md',                            required: true },
]

export const TEMPLATES_ROOT = path.join(import.meta.dir, '..', 'assets', 'templates')
