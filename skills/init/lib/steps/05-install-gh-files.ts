// skills/init/lib/steps/05-install-gh-files.ts
import { installGhFiles } from '../install-gh-files'
import { getDryRunMode, isDryRun } from '../dry-run-mode'
import { makeWriter } from '../dry-run'
import type { Step } from './types'

export const installGhFilesStep: Step = {
  id: 'install-gh-files',
  async run(ctx) {
    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run wiring.
    const dryRun = isDryRun(ctx)
    const writer = makeWriter(getDryRunMode(ctx))
    const result = await installGhFiles(ctx.cwd, { writeFile: writer })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 362 (PRD R1, G1).
    // filesWritten: ReadonlyArray<string> — interpolacao chama .toString() (comma-joined).
    // PRD D14: sempre roda — sem condicional de skip.
    const summary = `.github files installed: ${result.filesWritten}`
    return { mutated: !dryRun, summary }
  },
}
