// skills/init/lib/populate-harness-context-template.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — CONTEXT da pasta populate-harness.

export type ContextInput = {
  readonly dateSlug: string
  readonly stackPrimary: string
  readonly totalDocs: number
}

export function renderPopulateHarnessContext(input: ContextInput): string {
  return [
    '---',
    `slug: populate-harness`,
    `date: ${input.dateSlug}`,
    `status: ready`,
    '---',
    '',
    '# Context: Populate Harness',
    '',
    '## Por que existe esta pasta',
    '',
    'O init scaffolda o harness com arquivos vazios/template. Esta sessao popula os',
    'documentos canonicos com conteudo derivado do codigo real do projeto.',
    '',
    '## Decisoes herdadas (ADR-0022)',
    '',
    '- Schema `FasePlanInput v1` adotado (10 H2 do Andre Prado + extensoes AVC)',
    '- Output hierarquico: PRD + CONTEXT + PLAN + 16 fase-NN-*.md (1 pasta)',
    '- Guidance interpretativa em `.md` per-doc em `skills/init/assets/populate-guidance/`',
    '- Final Report Contract hardcoded no renderer (NAO eh campo do input)',
    '',
    '## Stack',
    '',
    `Detected primary stack: **${input.stackPrimary}**.`,
    'Cada fase usa Wave 1 (Discovery) stack-aware. Wave 2 (Write sections) eh agnostica.',
    '',
    `## Total de fases: ${input.totalDocs}`,
    '',
    'Veja `PLAN.md` para o mapa completo das fases com dependencias e sizing.',
    '',
  ].join('\n')
}
