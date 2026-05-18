// skills/init/lib/steps/12-migrate-3-lessons.ts
import { migrateLessons } from '../migrate-lessons'
import type { Step } from './types'
import { isDryRun, isMigrateMode } from './helpers'

export const migrate3LessonsStep: Step = {
  id: 'migrate-3-lessons',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = isDryRun(ctx.flags)
    const report = await migrateLessons(ctx.cwd, { dryRun })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 172 (PRD R1, G1).
    // console.log('Lessons:', status, '— wrote:', N, 'skipped:', N) → string com espacos entre args.
    const lines = [
      'Lessons: ' + report.status + ' — wrote: ' + report.written.length + ' skipped: ' + report.skipped.length,
    ]

    // 2026-05-17 (Luiz/dev): conditional line — wording byte-identico ao SKILL.md linha 175 (PRD R1, G1).
    // Helper returns status 'skipped' exclusively when source file is absent (title: 'source-missing').
    // SKILL.md checks s.reason.includes('source-missing') but helper reason is 'no lessons-learned.md in backup'.
    // Using status === 'skipped' is equivalent and accurate per actual helper contract.
    if (report.status === 'skipped') {
      lines.push('  (no lessons-learned.md in backup — nothing to migrate)')
    }

    return {
      mutated: report.status === 'completed' && report.written.length > 0,
      summary: lines.join('\n'),
    }
  },
}
