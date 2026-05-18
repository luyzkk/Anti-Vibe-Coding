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
  async run(ctx) {
    // 2026-05-18 (Luiz/dev): Plano 05 fase-05 — SH-09 + D26 + D28 — conserva comportamento v6.3.x.
    // Steps 09/10 ja early-skiparam (Plano 04 G9); CLAUDE.md nao foi transformado em mirror.
    // Em modo additive: NAO deletar CLAUDE.md (linkClaudeToAgents faz fs.rm) — preservar original.
    if (ctx.flags['additive-merge'] === true) {
      if (ctx.flags['dry-run'] === true) {
        return { mutated: false, summary: 'dry-run: legacy additive merge would be applied (v6.3.x behavior — CLAUDE.md preserved)' }
      }
      return { mutated: true, summary: 'additive-merge: v6.3.x behavior applied (CLAUDE.md preserved, AGENTS.md linked separately)' }
    }
    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run guard.
    // Em dry-run, Step 01 nao escreve AGENTS.md no disco — linkClaudeToAgents falharia em fs.access.
    // Skip operacao real e retornar summary informativo.
    if (ctx.flags['dry-run'] === true) {
      return { mutated: false, summary: 'dry-run: CLAUDE.md would be linked to AGENTS.md (tier resolution skipped)' }
    }
    return runLinkClaudeStep(ctx.cwd)
  },
}
