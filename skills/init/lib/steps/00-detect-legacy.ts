// skills/init/lib/steps/00-detect-legacy.ts
import { detectV5Legacy } from '../detect-v5-legacy'
import { AbortError } from './abort-error'
import type { Step } from './types'

export const detectLegacyStep: Step = {
  id: 'detect-legacy',
  async run(ctx) {
    const state = await detectV5Legacy(ctx.cwd)

    if (state.alreadyMigrated && state.isLegacy) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 26-27 (PRD R1, G1).
      // Concatenado com \n para colapsar 2 console.log em uma reason — dispatcher emite via log().
      throw new AbortError({
        code: 2,
        reason:
          'Project has both v5 artifacts AND docs/exec-plans/ — partial migration?\n' +
          'Run `/init migrate --resume` or remove residuals manually.',
      })
    }

    if (state.isLegacy) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 31-32 (PRD R1, G1).
      throw new AbortError({
        code: 1,
        reason:
          `Detected v5.x artifacts: ${state.artifacts.join(', ')}\n` +
          'Run `/init migrate` (or `--dry-run` to preview).',
      })
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 35 (PRD R1, G1).
    return { mutated: false, summary: 'Greenfield project — proceeding with scaffold.' }
  },
}
