// 2026-05-12 (Luiz/dev): D18 — constantes canonicas das secoes harmonizadas (CA-18)
// Lock no array exportado garante que validador Plano 04 e skills compartilham a mesma fonte
// G7: ordem exata case-sensitive — '## Execution Steps' != '## execution steps' (rejeita)

/**
 * 10 secoes canonicas do exec-plan em modo 'full' (planos maiores).
 * Ordem obrigatoria — qualquer reordenacao quebra CA-18.
 */
export const EXEC_PLAN_SECTIONS_FULL = [
  'Goal',
  'Scope',
  'Assumptions',
  'Risks',
  'Execution Steps',
  'Review Checklist',
  'Validation Log',
  'Compound Opportunity',
  'Lessons Captured',
  'Exit Criteria',
] as const

/**
 * 7 secoes para exec-plan em modo 'quick' (tasks medias, 3-7 passos).
 * Omite Assumptions, Risks e Review Checklist — overhead desnecessario para tasks pequenas.
 * Ambiguity 05-A5: decisao assumida — se PRD especificar outras 7, substituir aqui.
 */
export const EXEC_PLAN_SECTIONS_QUICK = [
  'Goal',
  'Scope',
  'Execution Steps',
  'Validation Log',
  'Compound Opportunity',
  'Lessons Captured',
  'Exit Criteria',
] as const

export type ExecPlanMode = 'full' | 'quick'
