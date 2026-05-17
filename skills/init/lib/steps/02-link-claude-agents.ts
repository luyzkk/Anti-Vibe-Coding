// skills/init/lib/steps/02-link-claude-agents.ts
// 2026-05-17 (Luiz/dev): plano02 fase-02 — wrapper de Step 2 do SKILL.md linhas 285-290.
// Invoca linkClaudeToAgents (helper intocado, G2) e reporta tier via summary.
// Wording byte-identico ao bloco inline (PRD R1, G1). Em-dash U+2014 na linha do hook (G1).
import { linkClaudeToAgents } from '../symlink-fallback'
import type { LinkResult } from '../symlink-fallback'
import type { Step, StepReport } from './types'

// 2026-05-17 (Luiz/dev): hook de teste — injecao via parametro evita mock.module pollution.
// PROD usa o linker default (linkClaudeToAgents). Testes passam um stub.
// Compound note: docs/compound/2026-05-16-bun-mock-module-pollution.md.
type Linker = (targetDir: string) => Promise<LinkResult>

export async function runLinkClaudeStep(
  targetDir: string,
  linker: Linker = linkClaudeToAgents,
): Promise<StepReport> {
  const r = await linker(targetDir)

  // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 287-290 (PRD R1, G1).
  // Tier logado SEMPRE. Segunda linha SO quando tier === 'copy-with-hook'.
  const lines = [`Linked via tier: ${r.tier}`]
  if (r.tier === 'copy-with-hook') {
    lines.push(
      'Hook registered in .claude/settings.local.json \u2014 CLAUDE.md will re-sync on edits to AGENTS.md',
    )
  }

  return { mutated: true, summary: lines.join('\n') }
}

export const linkClaudeAgentsStep: Step = {
  id: 'link-claude-agents',
  run: (ctx) => runLinkClaudeStep(ctx.cwd),
}
