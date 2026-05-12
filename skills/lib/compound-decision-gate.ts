// 2026-05-12 (Luiz/dev): Compound Decision Gate — D17 + CA-16 + CA-25
// Orquestra prompt interativo + 3 fluxos: capture / no_capture_needed / postpone
// GatePromptFn e injetada para testabilidade (inversao de controle, Local 06-G1)
import { writeCompoundNote } from './compound-note-writer'
import { moveToCompleted } from './exec-plan-mover'
import { readExecPlan, isComplete } from './exec-plan-reader'
import { resolvePaths } from './path-resolver-v6'
import { promises as fs } from 'node:fs'

export type GateChoice = 'capture' | 'no_capture_needed' | 'postpone'

export type GateContext = {
  projectRoot: string
  planPath: string
}

export type GatePromptFn = (planTitle: string) => Promise<{
  choice: GateChoice
  // se capture: dados da licao a registrar
  captureInput?: {
    title: string
    problem: string
    solution: string
    prevention: string
    tags?: string[]
  }
  // se no_capture_needed: razao curta para telemetria
  noCaptureReason?: string
}>

export type GateResult = {
  choice: GateChoice
  planMoved: boolean
  compoundCreatedPath?: string
  noCaptureReason?: string
}

/**
 * Executa o Compound Decision Gate para um plano de execucao completo.
 * Detecta completude via isComplete() — rejeita planos nao completos.
 * Delega prompt ao caller via GatePromptFn (testavel por injecao).
 *
 * @example
 * const result = await runCompoundGate(
 *   { projectRoot: process.cwd(), planPath: '/path/to/plan.md' },
 *   async (title) => ({ choice: 'postpone' }),
 * )
 */
export async function runCompoundGate(
  ctx: GateContext,
  prompt: GatePromptFn,
): Promise<GateResult> {
  const plan = await readExecPlan(ctx.planPath)

  // 2026-05-12 (Luiz/dev): guard — nao executar gate em plano incompleto (edge case spec)
  if (!isComplete(plan)) {
    throw new Error(
      `runCompoundGate: plano nao esta completo — "${plan.frontmatter.title}" (${ctx.planPath})`,
    )
  }

  const response = await prompt(plan.frontmatter.title)

  // 2026-05-12 (Luiz/dev): hash-map de handlers > switch (CLAUDE.md global, preferir hash maps)
  const handlers: Record<GateChoice, () => Promise<GateResult>> = {
    capture: async () => {
      if (response.captureInput == null) {
        throw new Error('runCompoundGate: captureInput obrigatorio para choice=capture')
      }
      const paths = await resolvePaths(ctx.projectRoot)
      const noteInput = {
        title: response.captureInput.title,
        problem: response.captureInput.problem,
        solution: response.captureInput.solution,
        prevention: response.captureInput.prevention,
        category: 'compound-from-plan',
        // 2026-05-12 (Luiz/dev): exactOptionalPropertyTypes guard — nao incluir tags se undefined
        ...(response.captureInput.tags != null ? { tags: response.captureInput.tags } : {}),
      }
      const { filePath } = await writeCompoundNote(paths.compoundDir, noteInput)
      await moveToCompleted(ctx.projectRoot, ctx.planPath)
      return { choice: 'capture', planMoved: true, compoundCreatedPath: filePath }
    },

    no_capture_needed: async () => {
      const reason = response.noCaptureReason ?? '(no reason)'
      // 2026-05-12 (Luiz/dev): append antes de mover — plano ainda esta em active/ neste momento
      await appendValidationLog(ctx.planPath, `no_capture_needed: ${reason}`)
      await moveToCompleted(ctx.projectRoot, ctx.planPath)
      const result: GateResult = { choice: 'no_capture_needed', planMoved: true }
      // 2026-05-12 (Luiz/dev): exactOptionalPropertyTypes guard — so incluir se definido
      if (response.noCaptureReason != null) result.noCaptureReason = response.noCaptureReason
      return result
    },

    postpone: async () => {
      // 2026-05-12 (Luiz/dev): Ambiguity 05-A4 — "pensar mais" mantem em active/ com pending-capture
      // Plano NAO e movido; validador (Plano 04) deve aceitar status pending-capture
      await setPlanStatus(ctx.planPath, 'pending-capture')
      return { choice: 'postpone', planMoved: false }
    },
  }

  return handlers[response.choice]()
}

async function appendValidationLog(planPath: string, line: string): Promise<void> {
  const raw = await fs.readFile(planPath, 'utf-8')
  const today = new Date().toISOString().slice(0, 10)
  const entry = `- ${today}: ${line}\n`

  // 2026-05-12 (Luiz/dev): inserir linha no fim da secao Validation Log
  // Se secao nao existir, adicionar ao final do arquivo (fallback defensivo)
  if (raw.includes('## Validation Log')) {
    // Substituir o bloco Validation Log adicionando a linha antes da proxima secao ou fim
    const updated = raw.replace(
      /(## Validation Log\n[\s\S]*?)(\n## |\n*$)/,
      (_, block, trailer) => `${block}${entry}${trailer}`,
    )
    await fs.writeFile(planPath, updated, 'utf-8')
  } else {
    await fs.writeFile(planPath, `${raw}\n## Validation Log\n\n${entry}`, 'utf-8')
  }
}

async function setPlanStatus(planPath: string, status: 'pending-capture'): Promise<void> {
  const raw = await fs.readFile(planPath, 'utf-8')
  // 2026-05-12 (Luiz/dev): substitui status: active por status: pending-capture no frontmatter
  const updated = raw.replace(/^(status:\s*)active\s*$/m, `$1${status}`)
  await fs.writeFile(planPath, updated, 'utf-8')
}
