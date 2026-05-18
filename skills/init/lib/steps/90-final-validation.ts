// skills/init/lib/steps/90-final-validation.ts
// 2026-05-17 (Luiz/dev): porta Step migrate.5 (SKILL.md linhas 83-98).
// Wording byte-identico nas 4 strings criticas (G1 do plano).
import path from 'node:path'
import { AbortError } from './abort-error'
import { isDryRun } from '../dry-run-mode'
import type { Step } from './types'

export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 — dry-run guard.
    // Step 01 nao escreve scripts/harness-validate.ts em dry-run; spawn falharia com ENOENT
    // e abortaria o pipeline impedindo o dry-run preview do Step 91. Skip silencioso,
    // permitindo Step 91 emitir seu proprio preview de PLAN.md.
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: 'dry-run: harness-validate would run after scaffold (skipped — scripts/harness-validate.ts not present yet)',
      }
    }

    const scriptPath = path.join(ctx.cwd, 'scripts', 'harness-validate.ts')
    const proc = Bun.spawn(['bun', 'run', scriptPath], {
      cwd: ctx.cwd,
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 92-93 (PRD R1, G1).
      const reason = [
        'WARN: harness:validate failed after migration. Inspect output above.',
        'Backup is at .planning.v5-backup/ — to roll back: git revert HEAD && cp -r .planning.v5-backup/.planning ./',
      ].join('\n')
      throw new AbortError({ code: exitCode, reason })
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 96-97 (PRD R1, G1).
    const summary = [
      "Migration validated. Suggested commit: git commit -m 'chore: migrate to anti-vibe-coding v6.0.0'",
      'Add .planning.v5-backup/ to .gitignore (or delete after confirming all is well).',
    ].join('\n')
    return { mutated: false, summary }
  },
}
