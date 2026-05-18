// skills/init/lib/steps/01-scaffold-full-tree.ts
// 2026-05-17 (Luiz/dev): plano02 fase-01 — wrapper de Step 1 + Passo 1.5 do SKILL.md.
// Invoca scaffoldTemplates + scaffoldFullTree + scaffoldTodoMd em sequencia.
// Wording byte-identico ao bloco inline (PRD R1, G1). Helpers intocados (G2).
import path from 'node:path'
import { detectProjectName } from '../detect-project-name'
import { scaffoldFullTree } from '../scaffold-full-tree'
import { scaffoldTemplates } from '../scaffold-templates'
import { scaffoldTodoMd } from '../scaffold-todo-md'
import { getDryRunMode, isDryRun } from '../dry-run-mode'
import { makeWriter } from '../dry-run'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): resolucao do templates dir relativo ao step — plano02 G3 (import estatico).
// Step em lib/steps/ => lib/steps -> lib -> init -> assets/templates (dois niveis acima, depois assets/).
const TEMPLATES_DIR = path.join(import.meta.dir, '..', '..', 'assets', 'templates')

export const scaffoldFullTreeStep: Step = {
  id: 'scaffold-full-tree',
  async run(ctx) {
    const targetDir = ctx.cwd
    const projectName = detectProjectName(targetDir)
    // 2026-05-17 (Luiz/dev): 'unknown' hardcoded — Step 3 refina depois (PRD R1, G1).
    const stack = 'unknown'

    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run wiring.
    // Em dry-run, makeWriter redireciona escritas para WriteRecorder (zero disco).
    const dryRun = isDryRun(ctx)
    const writer = makeWriter(getDryRunMode(ctx))

    const baseResult = await scaffoldTemplates({
      targetDir,
      templatesDir: TEMPLATES_DIR,
      projectName,
      stack,
      writeFile: writer,
    })

    const treeResult = await scaffoldFullTree({
      targetDir,
      projectName,
      stack,
      writeFile: writer,
    })

    // 2026-05-17 (Luiz/dev): Passo 1.5 idempotente (CA-31, G7).
    // scaffoldFullTree ja cria TODO.md via TODO.md.tpl — scaffoldTodoMd retorna 'skipped'
    // em greenfield. Ambos sao chamados preservando o comportamento atual do SKILL.md.
    // 2026-05-18 (Luiz/dev): em dry-run, NAO chamar scaffoldTodoMd (sync API, escreve direto).
    const todoResult = dryRun ? 'skipped' : scaffoldTodoMd(targetDir)

    // 2026-05-17 (Luiz/dev): wording byte-identico aos 3 console.log do SKILL.md (PRD R1, G1).
    // Linhas 237-238 (Step 1) + 261-263 (Passo 1.5). Summary multi-linha: dispatcher emite via log().
    const lines = [
      `Base files: ${baseResult.filesWritten.length}`,
      `Tree files: ${treeResult.filesWritten.length} in ${treeResult.durationMs} ms`,
      todoResult === 'created'
        ? 'TODO.md criado na raiz do projeto.'
        : 'TODO.md ja existe — mantido sem modificacao (G2).',
    ]

    return {
      // 2026-05-18 (Luiz/dev): mutated=false em dry-run elimina log "(mutated disk)" falso.
      mutated: !dryRun,
      summary: lines.join('\n'),
    }
  },
}
