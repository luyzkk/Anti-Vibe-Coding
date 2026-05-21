// skills/init/lib/steps/02-detect-legacy-and-stack.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-02 — RF-01 do PRD init-refactor-v7.
// Step 2 do pipeline v7 (gate eh Step 1, fase-03 — DV-3).
// Substitui o antigo Step 00-detect-legacy (que abortava em legacy) + Step 03-detect-stack-and-register
// (que escrevia STATE.md). Aqui: pura leitura, popula ctx, nao aborta.
// Reaproveita libs existentes (G3/DT-01): detect-v5-legacy, detect-stack.
import { detectV5Legacy } from '../detect-v5-legacy'
import { detectStack } from '../detect-stack'
import type { Step } from './types'

export const detectLegacyAndStackStep: Step = {
  id: 'detect-legacy-and-stack',
  async run(ctx) {
    const legacy = await detectV5Legacy(ctx.cwd)
    const stack = await detectStack(ctx.cwd)

    // 2026-05-21 (Luiz/dev): mutacao deliberada via Object.assign — dispatcher em run-init.ts
    // linha 142 passa o MESMO objeto ctxWithAudit a cada step no loop (nao clona entre steps).
    // Steps subsequentes leem ctx.legacy / ctx.stack sem precisar de re-detect.
    // Decisao registrada: DI-Plano01-fase02-ctx-mutation em MEMORY.md.
    Object.assign(ctx, { legacy, stack })

    const stackLabel = stack.primary ?? 'unknown'
    const legacyMsg = legacy.isLegacy
      ? `legacy v5.x artifacts detected: ${legacy.artifacts.join(', ')}`
      : 'no legacy artifacts'

    return {
      mutated: false,
      summary: `stack=${stackLabel} via ${stack.signalSource}; ${legacyMsg}`,
    }
  },
}
