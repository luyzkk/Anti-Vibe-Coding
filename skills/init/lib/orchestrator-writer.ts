// 2026-05-14 (Luiz/dev): orchestrator writer para migration mode — Plano 04 fase-01.
// Escreve docs/exec-plans/active/_INIT_ORCHESTRATOR.md com plans em ordem topológica.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MigrationPlanEntry } from './manifest-writer'

const SLOT_TIERS: Record<string, number> = {
  'docs/design-docs/index.md': 1,
  'docs/design-docs/core-beliefs.md': 1,
  'ARCHITECTURE.md': 1,
  'CLAUDE.md': 1,
  'docs/DESIGN.md': 2,
  'docs/FRONTEND.md': 2,
  'docs/PLANS.md': 2,
  'docs/PRODUCT_SENSE.md': 2,
  'docs/QUALITY_SCORE.md': 2,
  'docs/MERGE_GATES.md': 2,
  'docs/RELIABILITY.md': 2,
  'docs/SECURITY.md': 2,
  'docs/COMPOUND_ENGINEERING.md': 2,
  'docs/STATE.md': 2,
  'docs/exec-plans/active/README.md': 3,
  'docs/exec-plans/completed/README.md': 3,
  'docs/exec-plans/tech-debt-tracker.md': 3,
  'docs/compound/README.md': 3,
  'docs/review-checklists/README.md': 3,
  'docs/review-checklists/security.md': 3,
  'docs/review-checklists/reliability.md': 3,
  'docs/review-checklists/agent-api.md': 3,
  'docs/review-checklists/frontend-ui.md': 3,
  'docs/review-checklists/production-readiness.md': 3,
  'docs/smoke-flows/README.md': 3,
  'docs/product-specs/index.md': 3,
  'docs/references/README.md': 3,
  'docs/generated/db-schema.md': 3,
  'README.md': 4,
  'TODO.md': 4,
  'scripts/compound-check.ts': 4,
  'scripts/new-plan.ts': 4,
  '.github/pull_request_template.md': 4,
  'AGENTS.md': 5,
}

function tierOf(slot: string): number {
  return SLOT_TIERS[slot] ?? 4
}

export async function writeInitOrchestrator(
  targetDir: string,
  plans: MigrationPlanEntry[],
): Promise<void> {
  const sorted = [...plans].sort((a, b) => {
    const ta = tierOf(a.slot)
    const tb = tierOf(b.slot)
    if (ta !== tb) return ta - tb
    return a.slot.localeCompare(b.slot)
  })

  const lines: string[] = [
    '# _INIT_ORCHESTRATOR — Migration Execution Order',
    '',
    '> Execute plans nesta ordem. Design-docs primeiro; AGENTS.md por último (referencia tudo).',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Plans:** ${sorted.length}`,
    '',
    '---',
    '',
  ]

  let currentTier = 0
  const tierLabels: Record<number, string> = {
    1: '## Tier 1 — Design Foundation',
    2: '## Tier 2 — Docs Layer',
    3: '## Tier 3 — Exec-Plans, Compound, Review-Checklists',
    4: '## Tier 4 — Infra + Unknown',
    5: '## Tier 5 — Router (execute last)',
  }

  for (const plan of sorted) {
    const tier = tierOf(plan.slot)
    if (tier !== currentTier) {
      if (currentTier > 0) lines.push('')
      lines.push(tierLabels[tier] ?? `## Tier ${tier}`)
      lines.push('')
      currentTier = tier
    }
    const statusBadge = plan.status === 'completed' ? 'x' : ' '
    const relLink = `./${plan.path.replace('docs/exec-plans/active/', '').replace('docs/exec-plans/completed/', '../completed/')}`
    const slotDisplay = plan.slot === 'unknown' ? `*(slot unknown — ${plan.id})*` : `\`${plan.slot}\``
    lines.push(`- [${statusBadge}] [${plan.id}](${relLink}) — ${slotDisplay}`)
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*Gerado por /init migration mode Fase 4. Não edite manualmente — regenerado em cada /init re-run.*')

  const destPath = path.join(targetDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md')
  await fs.writeFile(destPath, lines.join('\n'), 'utf-8')
}
