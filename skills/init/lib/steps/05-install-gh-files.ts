// skills/init/lib/steps/05-install-gh-files.ts
import { installGhFiles } from '../install-gh-files'
import type { Step } from './types'

export const installGhFilesStep: Step = {
  id: 'install-gh-files',
  async run(ctx) {
    const result = await installGhFiles(ctx.cwd)

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 362 (PRD R1, G1).
    // filesWritten: ReadonlyArray<string> — interpolacao chama .toString() (comma-joined).
    // PRD D14: sempre roda — sem condicional de skip.
    const summary = `.github files installed: ${result.filesWritten}`
    return { mutated: true, summary }
  },
}
