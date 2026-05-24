// 2026-05-24 (Luiz/dev): gate — PRD MH-06/RF-06, D20, CA-07/08/18/19
import { detectActivePlan } from './active-plan-detector'
import { buildLessonsLearnedInvocation, parseLessonsLearnedCompletion } from './invoke-lessons-learned'
import { updateLessonsCaptured } from './lessons-captured-updater'

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
    planPath = answers.selectedPlanPath
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
    return {
      status: 'no-capture',
      planPath,
      message: `Logged 'no compound capture needed' in plan's Lessons Captured section`,
    }
  }

  // 2026-05-24 (Luiz/dev): titulo derivado da primeira resposta 'yes' — heuristica simples (D20)
  const title = pickFirstYesDetails(answers) ?? 'compound capture from gate'
  const args = buildLessonsLearnedInvocation(title)
  const rawOutput = await invokeSkill('anti-vibe-coding:lessons-learned', args)
  const parsed = parseLessonsLearnedCompletion(rawOutput)

  const notePath = parsed.noteCreated ?? 'docs/compound/<see lessons-learned output>'
  await updateLessonsCaptured(planPath, `- Lesson captured: [${notePath}](../../${notePath})`)
  return {
    status: 'captured',
    planPath,
    notePath,
    message: `Lesson captured: ${notePath}. Linked in plan's Lessons Captured section.`,
  }
}

function pickFirstYesDetails(answers: GateAnswers): string | undefined {
  if (answers.bug.answer === 'yes') return answers.bug.details
  if (answers.review.answer === 'yes') return answers.review.details
  if (answers.production.answer === 'yes') return answers.production.details
  return undefined
}
