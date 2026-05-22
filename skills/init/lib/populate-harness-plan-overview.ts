// skills/init/lib/populate-harness-plan-overview.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — PLAN overview da pasta populate-harness.

import type { GeneratedFasePlan } from './populate-plan-generator'

export type PlanOverviewInput = {
  readonly dateSlug: string
  readonly stackPrimary: string
}

export function renderPopulateHarnessPlanOverview(
  fasePlans: ReadonlyArray<GeneratedFasePlan>,
  input: PlanOverviewInput,
): string {
  const rows = fasePlans.map(f =>
    `| ${String(f.faseNumber).padStart(2, '0')} | [${f.dst}](./fase-${String(f.faseNumber).padStart(2, '0')}-${f.slug}.md) | populate |`
  ).join('\n')

  return [
    '---',
    `title: "Populate Harness — ${input.dateSlug}"`,
    `mode: full`,
    `status: active`,
    `created: ${input.dateSlug}`,
    '---',
    '',
    '# Exec Plan: Populate Harness',
    '',
    '**Stack:** ' + input.stackPrimary,
    `**Total fases:** ${fasePlans.length}`,
    '**Schema:** FasePlanInput v1 (ADR-0022)',
    '',
    '## Goal',
    '',
    'Popular os 16 documentos canonicos do harness com conteudo real do projeto.',
    '',
    '## Mapa de Fases',
    '',
    '| # | Doc-alvo | Acao |',
    '|---|----------|------|',
    rows,
    '',
    '## Como executar',
    '',
    'Cada `fase-NN-*.md` eh consumida pelo `/execute-plan`. Wave 1 (Discovery) eh',
    'paralelizavel. Wave 2 (Write sections) respeita `dependsOn` declarado em cada fase.',
    '',
    '## Validation Log',
    '',
    '<!-- preencher durante execucao -->',
    '',
    '## Compound Opportunity',
    '',
    '<!-- preencher ao /iterate -->',
    '',
    '## Lessons Captured',
    '',
    '<!-- preencher ao /iterate -->',
    '',
    '## Exit Criteria',
    '',
    '- [ ] `bun run harness:validate` passa para os 16 docs',
    '- [ ] Zero placeholders nos 16 docs canonicos',
    '- [ ] Cada doc tem links resolviveis (sem `TODO(<context needed>):` em producao)',
    '',
  ].join('\n')
}
