// skills/init/lib/steps/13-migrate-4-decisions.ts
import { migrateDecisions } from '../migrate-decisions'
import type { Step } from './types'
import { isDryRun, isMigrateMode } from './helpers'

export const migrate4DecisionsStep: Step = {
  id: 'migrate-4-decisions',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = isDryRun(ctx.flags)
    const report = await migrateDecisions(ctx.cwd, { dryRun })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 196 (PRD R1, G1).
    // console.log('Decisions:', status, '— wrote:', N) → string com espacos entre args.
    const lines = [
      'Decisions: ' + report.status + ' — wrote: ' + report.written.length,
    ]

    // 2026-05-17 (Luiz/dev): conditional line — wording byte-identico ao SKILL.md linha 198 (PRD R1, G1).
    if (report.coreBeliefs === 'created') {
      lines.push('  core-beliefs.md created from senior-principles.md')
    }

    return {
      mutated: (report.status === 'completed' && report.written.length > 0) || report.coreBeliefs === 'created',
      summary: lines.join('\n'),
    }
  },
}
