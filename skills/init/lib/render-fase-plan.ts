// skills/init/lib/render-fase-plan.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-01 — ADR-0022 FasePlanInput v1.
// Schema com schemaVersion: 1 explicito para evolucao futura sem migration retroativa.

export type Wave = {
  readonly name: string
  readonly items: ReadonlyArray<string>
}

export type RiskEntry = {
  readonly risk: string
  readonly mitigation: string
}

export type StackVariants = {
  readonly rails?: string
  readonly nextjs?: string
  readonly 'node-ts'?: string
}

export type FasePlanInput = {
  // === Identidade ===
  readonly docPath: string
  readonly schemaVersion: 1

  // === Base Andre (10 H2 literal, ordem fixa) ===
  readonly goal: string
  readonly scope: { readonly in: ReadonlyArray<string>; readonly out: ReadonlyArray<string> }
  readonly assumptions: ReadonlyArray<string>
  readonly risks: ReadonlyArray<RiskEntry>
  readonly waves: ReadonlyArray<Wave>
  readonly reviewChecklist: ReadonlyArray<string>
  // Validation Log    -> placeholder no renderer
  readonly compoundOpportunity: string
  // Lessons Captured  -> placeholder no renderer
  readonly exitCriteria: ReadonlyArray<string>

  // === Extensoes AVC ===
  readonly guidanceFile: string
  readonly detectionSignals: ReadonlyArray<string>
  readonly mustCover: Readonly<Record<string, ReadonlyArray<string>>>
  readonly linkTargets: ReadonlyArray<string>
  readonly stackVariants?: StackVariants
  readonly validationCommand: string
  readonly dependsOn: ReadonlyArray<string>
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

export function renderFasePlan(input: FasePlanInput): string {
  const lines: string[] = []

  // Identidade / cabecalho
  lines.push(`# Populate: ${input.docPath}`)
  lines.push('')
  // Bloco AVC ext: guidanceFile + detectionSignals + dependsOn + validationCommand
  lines.push(`**Guidance file:** \`${input.guidanceFile}\``)
  lines.push(`**Validation command:** \`${input.validationCommand}\``)
  lines.push(`**Depends on:** ${input.dependsOn.length ? input.dependsOn.join(', ') : '— (independent)'}`)
  if (input.detectionSignals.length > 0) {
    lines.push('')
    lines.push('**Detection signals (grep before writing):**')
    for (const s of input.detectionSignals) lines.push(`- \`${s}\``)
  }
  lines.push('')

  // ## Goal
  lines.push(SECTION_TITLES[0]); lines.push('')
  lines.push(input.goal); lines.push('')

  // ## Scope
  lines.push(SECTION_TITLES[1]); lines.push('')
  lines.push('**In:**')
  for (const s of input.scope.in) lines.push(`- ${s}`)
  lines.push('')
  lines.push('**Out:**')
  for (const s of input.scope.out) lines.push(`- ${s}`)
  lines.push('')

  // ## Assumptions
  lines.push(SECTION_TITLES[2]); lines.push('')
  for (const a of input.assumptions) lines.push(`- ${a}`)
  lines.push('')

  // ## Risks
  lines.push(SECTION_TITLES[3]); lines.push('')
  lines.push('| Risco | Mitigacao |')
  lines.push('|-------|-----------|')
  for (const r of input.risks) lines.push(`| ${r.risk} | ${r.mitigation} |`)
  lines.push('')

  // ## Execution Steps (Waves) + mustCover inline por wave 2 item se houver
  lines.push(SECTION_TITLES[4]); lines.push('')
  for (const w of input.waves) {
    lines.push(`### ${w.name}`); lines.push('')
    for (const item of w.items) lines.push(`- ${item}`)
    lines.push('')
  }

  // mustCover (bloco extra apos Waves)
  const mustCoverKeys = Object.keys(input.mustCover)
  if (mustCoverKeys.length > 0) {
    lines.push('**Must cover (per H2 in target doc):**'); lines.push('')
    for (const key of mustCoverKeys) {
      lines.push(`- **${key}**`)
      for (const item of input.mustCover[key]!) lines.push(`  - ${item}`)
    }
    lines.push('')
  }

  // linkTargets (bloco extra)
  if (input.linkTargets.length > 0) {
    lines.push('**Required outbound links:**'); lines.push('')
    for (const l of input.linkTargets) lines.push(`- ${l}`)
    lines.push('')
  }

  // stackVariants (bloco condicional)
  if (input.stackVariants) {
    const sv = input.stackVariants
    const entries = (['rails', 'nextjs', 'node-ts'] as const)
      .filter(k => sv[k] !== undefined)
    if (entries.length > 0) {
      lines.push('**Stack variants:**'); lines.push('')
      for (const k of entries) lines.push(`- \`${k}\`: ${sv[k]}`)
      lines.push('')
    }
  }

  // ## Review Checklist
  lines.push(SECTION_TITLES[5]); lines.push('')
  for (const c of input.reviewChecklist) lines.push(`- [ ] ${c}`)
  lines.push('')

  // ## Validation Log (placeholder)
  lines.push(SECTION_TITLES[6]); lines.push('')
  lines.push('<!-- preencher durante execucao: comando + resultado -->'); lines.push('')

  // ## Compound Opportunity
  lines.push(SECTION_TITLES[7]); lines.push('')
  lines.push(input.compoundOpportunity); lines.push('')

  // ## Lessons Captured (placeholder)
  lines.push(SECTION_TITLES[8]); lines.push('')
  lines.push('<!-- preencher ao /iterate: links para docs/compound/ -->'); lines.push('')

  // ## Exit Criteria
  lines.push(SECTION_TITLES[9]); lines.push('')
  for (const e of input.exitCriteria) lines.push(`- [ ] ${e}`)
  lines.push('')

  // === Final Report Contract — HARDCODED (ADR-0022 decisao 6) ===
  lines.push('---'); lines.push('')
  lines.push('## Final Report Contract'); lines.push('')
  lines.push('Quando esta fase for executada, o relatorio final DEVE listar:')
  lines.push('- **Files added** — paths criados nesta fase')
  lines.push('- **Files customized** — paths existentes que foram editados')
  lines.push('- **Files unchanged** — paths inspecionados mas nao modificados (com razao)')
  lines.push('- **Unresolved TODOs** — qualquer `TODO(<owner/context needed>): ...` deixado no doc')
  lines.push('- **Validation result** — output de `' + input.validationCommand + '`')
  lines.push('- **First plan path** — proxima fase a executar (de `dependsOn` inverso)')
  lines.push('')

  return lines.join('\n')
}

/** Util compartilhado com testes — extrai linhas H2 do markdown gerado. */
export function extractH2Sections(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.trim())
}
