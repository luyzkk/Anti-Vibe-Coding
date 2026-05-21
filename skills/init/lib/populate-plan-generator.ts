// skills/init/lib/populate-plan-generator.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — renderer puro V3.
// Sem IO, sem LLM, sem stack-awareness — recebe input pronto e emite markdown.
// CA-07 do PRD init-refactor-v7: as 10 secoes H2 nesta ORDEM EXATA.

// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — tipo estruturado mapeando 1:1 nas 10 secoes
// H2 do CA-07 do PRD init-refactor-v7. Cada campo vira uma secao no markdown gerado.
// Decisao DI-Plano04-fase01-input-shape: sem campos free-form para evitar drift.

export type Wave = {
  readonly name: string
  readonly items: ReadonlyArray<string>
}

export type RiskEntry = {
  readonly risk: string
  readonly mitigation: string
}

export type AndrePlanInput = {
  /** Path canonico do doc-alvo (ex: 'docs/SECURITY.md'). Usado no title H1. */
  readonly docPath: string
  /** Goal: 1-3 linhas descrevendo o que o doc deve conter ao final. */
  readonly goal: string
  /** Scope in (secoes a criar) / out (o que NAO fazer). */
  readonly scope: { readonly in: ReadonlyArray<string>; readonly out: ReadonlyArray<string> }
  /** Pressupostos: o que o plano assume existir. */
  readonly assumptions: ReadonlyArray<string>
  /** Riscos com mitigacao. */
  readonly risks: ReadonlyArray<RiskEntry>
  /** Execution Steps: minimo 2 Waves (CA-07 do PRD). */
  readonly waves: ReadonlyArray<Wave>
  /** Review Checklist: itens binarios verificaveis. */
  readonly reviewChecklist: ReadonlyArray<string>
  /** Compound Opportunity: o que merece virar compound note se aprender algo. */
  readonly compoundOpportunity: string
  /** Exit Criteria: harness-validate passa, zero placeholders, etc. */
  readonly exitCriteria: ReadonlyArray<string>
}

const SECTION_TITLES = [
  '## Goal',
  '## Scope',
  '## Assumptions',
  '## Risks',
  '## Execution Steps',
  '## Review Checklist',
  '## Validation Log',
  '## Compound Opportunity',
  '## Lessons Captured',
  '## Exit Criteria',
] as const

export function renderAndrePlan(input: AndrePlanInput): string {
  const lines: string[] = []

  lines.push(`# Populate: ${input.docPath}`)
  lines.push('')

  // ## Goal
  lines.push(SECTION_TITLES[0])
  lines.push('')
  lines.push(input.goal)
  lines.push('')

  // ## Scope
  lines.push(SECTION_TITLES[1])
  lines.push('')
  lines.push('**In:**')
  for (const s of input.scope.in) lines.push(`- ${s}`)
  lines.push('')
  lines.push('**Out:**')
  for (const s of input.scope.out) lines.push(`- ${s}`)
  lines.push('')

  // ## Assumptions
  lines.push(SECTION_TITLES[2])
  lines.push('')
  for (const a of input.assumptions) lines.push(`- ${a}`)
  lines.push('')

  // ## Risks
  lines.push(SECTION_TITLES[3])
  lines.push('')
  lines.push('| Risco | Mitigacao |')
  lines.push('|-------|-----------|')
  for (const r of input.risks) lines.push(`| ${r.risk} | ${r.mitigation} |`)
  lines.push('')

  // ## Execution Steps (Waves)
  lines.push(SECTION_TITLES[4])
  lines.push('')
  for (const w of input.waves) {
    lines.push(`### ${w.name}`)
    lines.push('')
    for (const item of w.items) lines.push(`- ${item}`)
    lines.push('')
  }

  // ## Review Checklist
  lines.push(SECTION_TITLES[5])
  lines.push('')
  for (const c of input.reviewChecklist) lines.push(`- [ ] ${c}`)
  lines.push('')

  // ## Validation Log
  lines.push(SECTION_TITLES[6])
  lines.push('')
  lines.push('<!-- preencher durante execucao: comando + resultado -->')
  lines.push('')

  // ## Compound Opportunity
  lines.push(SECTION_TITLES[7])
  lines.push('')
  lines.push(input.compoundOpportunity)
  lines.push('')

  // ## Lessons Captured
  lines.push(SECTION_TITLES[8])
  lines.push('')
  lines.push('<!-- preencher ao /iterate: links para docs/compound/ -->')
  lines.push('')

  // ## Exit Criteria
  lines.push(SECTION_TITLES[9])
  lines.push('')
  for (const e of input.exitCriteria) lines.push(`- [ ] ${e}`)
  lines.push('')

  return lines.join('\n')
}

/** Extrai linhas H2 do markdown. Util para verificar secoes (CA-07). */
export function extractH2Sections(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.trim())
}
