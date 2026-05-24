// 2026-05-24 (Luiz/dev): gate — PRD MH-06/RF-06, D20, CA-07/08/18/19
// 2026-05-24 (Luiz/dev): completion signal SH-07 — renderCompletionSignal reusado de lessons-learned (G8)
import path from 'node:path'
import { detectActivePlan } from './active-plan-detector'
import { buildLessonsLearnedInvocation, parseLessonsLearnedCompletion } from './invoke-lessons-learned'
import { updateLessonsCaptured } from './lessons-captured-updater'
import { renderCompletionSignal } from '../../lib/completion-signal'

// 2026-05-24 (Luiz/dev): tipos inline para evitar TDD gate (refinement DI-fase02-tipos-inline)
export type GateAnswers = {
  bug: { answer: 'yes' | 'no'; details?: string }
  review: { answer: 'yes' | 'no'; details?: string }
  production: { answer: 'yes' | 'no'; details?: string }
  noCaptureReason?: string // se todos 'no'
  selectedPlanPath?: string // se status era 'multiple'
}

export type GateResult = {
  status: 'captured' | 'no-capture' | 'no-plan' | 'multiple-plans'
  planPath?: string
  notePath?: string
  message: string
}

export async function runGate(
  targetRoot: string,
  // 2026-05-24 (Luiz/dev): answers + invokeSkill injetados pelo SKILL.md runtime — testavel via mock
  answers: GateAnswers,
  invokeSkill: (skill: string, args: string) => Promise<string>,
): Promise<GateResult> {
  const plan = await detectActivePlan(targetRoot)

  if (plan.status === 'none') {
    return {
      status: 'no-plan',
      message: 'No active plan found. Run /plan-feature first or specify --plan path.',
    }
  }

  let planPath: string
  if (plan.status === 'multiple') {
    if (!answers.selectedPlanPath) {
      return { status: 'multiple-plans', message: 'Multiple active plans — selectedPlanPath required' }
    }
    // SEC-01: confine selectedPlanPath to targetRoot — reject any path that escapes
    const resolved = path.resolve(answers.selectedPlanPath)
    const resolvedRoot = path.resolve(targetRoot)
    if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
      return { status: 'no-plan', message: 'selectedPlanPath escapes targetRoot — refused' }
    }
    planPath = resolved
  } else {
    planPath = plan.planPath
  }

  const captured =
    answers.bug.answer === 'yes' ||
    answers.review.answer === 'yes' ||
    answers.production.answer === 'yes'

  if (!captured) {
    const reason = answers.noCaptureReason ?? 'no reason given'
    await updateLessonsCaptured(planPath, `no compound capture needed because: ${reason}`)
    // 2026-05-24 (Luiz/dev): SH-07 — completion signal YAML para orquestradores (G8, D33)
    // status=in_progress porque nao houve captura — partial outcome
    const signal = renderCompletionSignal({
      skill: 'anti-vibe-coding:compound-engineering',
      status: 'in_progress',
      outputs: [planPath],
      next_suggested: null,
      blocks_for_user: [],
    })
    return {
      status: 'no-capture',
      planPath,
      message: `Logged 'no compound capture needed' in plan's Lessons Captured section\n\n${signal}`,
    }
  }

  // 2026-05-24 (Luiz/dev): titulo derivado da primeira resposta 'yes' — heuristica simples (D20)
  const title = pickFirstYesDetails(answers) ?? 'compound capture from gate'
  const args = buildLessonsLearnedInvocation(title)
  const rawOutput = await invokeSkill('anti-vibe-coding:lessons-learned', args)
  const parsed = parseLessonsLearnedCompletion(rawOutput)

  const notePath = parsed.noteCreated ?? 'docs/compound/<see lessons-learned output>'
  await updateLessonsCaptured(planPath, `- Lesson captured: [${notePath}](../../${notePath})`)

  // 2026-05-24 (Luiz/dev): SH-07 — completion signal YAML para orquestradores (G8, D33)
  const signal = renderCompletionSignal({
    skill: 'anti-vibe-coding:compound-engineering',
    status: 'complete',
    outputs: [notePath, planPath],
    next_suggested: null,
    blocks_for_user: [],
  })
  return {
    status: 'captured',
    planPath,
    notePath,
    message: `Lesson captured: ${notePath}. Linked in plan's Lessons Captured section.\n\n${signal}`,
  }
}

// OCP: adicionar categoria = adicionar entrada nesta constante, sem tocar no loop
const GATE_CATEGORIES = ['bug', 'review', 'production'] as const
type GateCategory = (typeof GATE_CATEGORIES)[number]

function pickFirstYesDetails(answers: GateAnswers): string | undefined {
  for (const category of GATE_CATEGORIES) {
    const entry = answers[category as GateCategory]
    if (entry.answer === 'yes') return entry.details
  }
  return undefined
}
