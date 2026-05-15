// 2026-05-14 (Luiz/dev): CA-08 — plans devem ter 10 seções exatas do new-plan.mjs do André

export const REQUIRED_PLAN_SECTIONS = [
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

export type PlanSection = (typeof REQUIRED_PLAN_SECTIONS)[number]

export type PlanValidationResult = {
  valid: boolean
  missingSections: string[]
  extraSections: string[]
  orderErrors: string[]
}

function extractH2Sections(markdown: string): string[] {
  const sections: string[] = []
  for (const line of markdown.split('\n')) {
    const m = line.match(/^## (.+)/)
    if (m?.[1]) sections.push(m[1].trim())
  }
  return sections
}

export function validateMigrationPlan(planContent: string): PlanValidationResult {
  const found = extractH2Sections(planContent)
  const required = REQUIRED_PLAN_SECTIONS as readonly string[]

  const missingSections = required.filter((s) => !found.includes(s))
  const extraSections = found.filter((s) => !required.includes(s))

  const orderErrors: string[] = []
  const foundRequired = found.filter((s) => required.includes(s))
  for (let i = 0; i < foundRequired.length; i++) {
    if (foundRequired[i] !== required[i]) {
      orderErrors.push(
        `Seção "${foundRequired[i]}" encontrada na posição ${i + 1}, esperado "${required[i]}"`,
      )
    }
  }

  return {
    valid: missingSections.length === 0 && orderErrors.length === 0,
    missingSections,
    extraSections,
    orderErrors,
  }
}
