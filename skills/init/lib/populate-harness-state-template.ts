// skills/init/lib/populate-harness-state-template.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-05 — STATE.md template para CA-01 do PRD.

export type StateInput = {
  readonly dateSlug: string
  readonly stackPrimary: string
  readonly totalFases: number
}

export function renderPopulateHarnessState(input: StateInput): string {
  return [
    '# State: Populate Harness',
    '',
    '**Plan:** ./PLAN.md',
    '**Phase:** planned',
    '**Current Plan:** 01/1',
    `**Last Updated:** ${input.dateSlug}`,
    '',
    '## Progress por Plano',
    '',
    '| Plano | Nome | Fases | Done | Status |',
    '|-------|------|-------|------|--------|',
    `| 01 | Populate Harness | ${input.totalFases} | 0/${input.totalFases} | pending |`,
    '',
    '## Progress Global',
    '',
    `Fases done: 0/${input.totalFases} (0%)`,
    '',
    '## Log',
    '',
    `- ${input.dateSlug}: pasta gerada pelo init (Step 7) — stack ${input.stackPrimary}`,
    '',
  ].join('\n')
}
