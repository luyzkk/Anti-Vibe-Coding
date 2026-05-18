// skills/init/lib/steps/09-migrate-0-parse-dry-run.ts
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 herdado de fase-02.
// migrate.0 e migrate.all sao no-op quando args[0] !== 'migrate'.
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrate0ParseDryRunStep: Step = {
  id: 'migrate-0-parse-dry-run',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = ctx.flags['dry-run'] === true

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 50 (PRD R1, G1).
    // SKILL.md so emite a linha QUANDO dryRun=true. Sem flag, no-op silencioso.
    if (!dryRun) {
      return { mutated: false, summary: '' }
    }

    return { mutated: false, summary: 'Dry-run mode: no files will be modified.' }
  },
}
