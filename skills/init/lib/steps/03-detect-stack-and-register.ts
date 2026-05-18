// skills/init/lib/steps/03-detect-stack-and-register.ts
import { detectStack } from '../detect-stack'
import { writeStackToStateMd } from '../state-md-init'
import { getDryRunMode, isDryRun } from '../dry-run-mode'
import { makeWriter } from '../dry-run'
import type { Step } from './types'

export const detectStackAndRegisterStep: Step = {
  id: 'detect-stack-and-register',
  async run(ctx) {
    const stack = await detectStack(ctx.cwd)
    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run wiring.
    const dryRun = isDryRun(ctx)
    const writer = makeWriter(getDryRunMode(ctx))
    const result = await writeStackToStateMd(ctx.cwd, stack, { writeFile: writer })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 305-308 (PRD R1, G1).
    // Template literal equivale ao console.log do SKILL.md (sem espaco extra antes de ')').
    const lines = [
      `Detected stack: ${stack.id} (via ${stack.signalSource})`,
      `STATE.md ${result.status}: ${result.path}`,
    ]
    return { mutated: !dryRun, summary: lines.join('\n') }
  },
}
