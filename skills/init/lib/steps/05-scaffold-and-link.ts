// skills/init/lib/steps/05-scaffold-and-link.ts
// 2026-05-21 (Luiz/dev): Step 5 — scaffold-and-link REAL (init v7, Plano 03 fase-01).
// Combina os dois steps antigos (01-scaffold-full-tree + 02-link-claude-agents) sem dry-run/noWrite.
// PRD RF-03 (scaffold 16+ placeholders), CA-02 (.claude/CLAUDE.md NUNCA sobrescrito — guard ja em
// scaffold-full-tree.ts:80), CA-08 (idempotente), D4 (sem dry-run), D16 (CLAUDE.md preservado).

import { detectProjectName } from '../detect-project-name'
import { scaffoldFullTree } from '../scaffold-full-tree'
import { linkClaudeToAgents } from '../symlink-fallback'
import type { Step, StepContext, StepReport } from './types'

export const scaffoldAndLinkStep: Step = {
  id: '05-scaffold-and-link',

  async run(ctx: StepContext): Promise<StepReport> {
    const targetDir = ctx.cwd
    const projectName = detectProjectName(targetDir)
    // 2026-05-21 (Luiz/dev): stack 'unknown' hardcoded aqui — Step 2 (detect-legacy-and-stack)
    // ja populou ctx.stack mas este step nao depende dele (PRD RF-03 e estrutural).
    // Render de variaveis em STATE.md.tpl usa default 'unknown' (scaffold-full-tree.ts:67).
    const stack = 'unknown'

    // 2026-05-21 (Luiz/dev): scaffoldFullTree usa writer default (fs.writeFile + mkdir) — D4
    // removeu dry-run. Skip-if-exists ja embutido (scaffold-full-tree.ts:80).
    const treeResult = await scaffoldFullTree({
      targetDir,
      projectName,
      stack,
    })

    // 2026-05-21 (Luiz/dev): link APOS scaffold — invariante mandatorio.
    // linkClaudeToAgents:21 faz fs.access(AGENTS.md raiz). Scaffold ja criou (manifest:95).
    // G6 do README: link opera SOMENTE em CLAUDE.md raiz; .claude/CLAUDE.md (manifest:96)
    // permanece intocado (skip via scaffoldFullTree fileExists guard quando ja existe).
    const linkResult = await linkClaudeToAgents(targetDir)

    // 2026-05-21 (Luiz/dev): summary multilinha observability (PRD NFR linha 211).
    // Metricas: placeholdersCreated, placeholdersSkipped, linkTier — Plano 04 pode parsear.
    const lines = [
      `placeholdersCreated: ${String(treeResult.filesWritten.length)} (de ${String(treeResult.filesWritten.length + treeResult.filesSkipped.length)})`,
      `placeholdersSkipped: ${String(treeResult.filesSkipped.length)}`,
      `Linked via tier: ${linkResult.tier}`,
    ]

    return {
      // 2026-05-21 (Luiz/dev): mutated true porque scaffold escreve OU pula (mas link sempre
      // cria CLAUDE.md raiz se ainda nao existir). Em re-run com tudo presente, scaffold pula
      // todos e link refaz o mirror (linkClaudeToAgents:24 fs.rm CLAUDE.md raiz e recria).
      mutated: true,
      summary: lines.join('\n'),
    }
  },
}
