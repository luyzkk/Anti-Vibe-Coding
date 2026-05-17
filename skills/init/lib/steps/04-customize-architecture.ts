// skills/init/lib/steps/04-customize-architecture.ts
import { customizeArchitecture } from '../customize-architecture'
import { detectStack } from '../detect-stack'
import type { Step } from './types'

export const customizeArchitectureStep: Step = {
  id: 'customize-architecture',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): re-deteccao explicita do stack — mesmo padrao do SKILL.md linha 343.
    // NAO le STATE.md aqui. Trade-off: detectStack roda 2x (em Step 3 e Step 4). Aceitavel
    // porque detectStack eh idempotente e barata (le 1-2 arquivos). Preservar byte-idemp.
    const stack = await detectStack(ctx.cwd)
    const result = await customizeArchitecture({ targetDir: ctx.cwd, stack })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 349 (PRD R1, G1).
    // Em-dash U+2014 entre stack.id e "written". NAO alterar.
    const summary = `ARCHITECTURE.md customized for ${stack.id} \u2014 written: ${result.written}`
    return { mutated: result.written, summary }
  },
}
