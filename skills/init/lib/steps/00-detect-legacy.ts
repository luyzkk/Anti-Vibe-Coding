// skills/init/lib/steps/00-detect-legacy.ts
import { detectV5Legacy } from '../detect-v5-legacy'
import { readManifest } from '../manifest-writer'
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

    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — bug 1.
    // Antes desta branch, qualquer projeto sem v5 artifacts era reportado como "Greenfield",
    // mesmo se tivesse manifest v6.x (cross-upgrade real). Fix: ler manifest e sinalizar
    // explicitamente cross-upgrade mode. Guard de no-overwrite em scaffold-* preserva os
    // arquivos existentes independente desta branch (defesa em profundidade).
    const manifest = await readManifest(ctx.cwd)
    if (manifest !== null && manifest.pluginVersion.startsWith('6.')) {
      return {
        mutated: false,
        summary:
          `v6.x manifest detected (pluginVersion=${manifest.pluginVersion}) — ` +
          'cross-upgrade mode, scaffold will preserve existing files.',
      }
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 35 (PRD R1, G1).
    return { mutated: false, summary: 'Greenfield project — proceeding with scaffold.' }
  },
}
