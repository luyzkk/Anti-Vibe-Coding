// skills/init/lib/steps/13-import-progress-txt.ts
import type { Step } from './types'

/**
 * Step 13 — importa `.claude/progress.txt` (se existir) em `docs/compound/_imported/`.
 * Soft-fail: ausencia do arquivo retorna `{ mutated:false, summary:'... skipped' }`.
 * Cobre MH-10 e CA-05.
 */
export const importProgressTxtStep: Step = {
  id: '13-import-progress-txt',
  async run(_ctx) {
    throw new Error('not implemented')
  },
}
