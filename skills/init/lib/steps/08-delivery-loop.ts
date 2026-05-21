// skills/init/lib/steps/08-delivery-loop.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-01 — port de 14-delivery-loop.ts sem dry-run guard (D4).
// Mantem contrato needsUser do PRD D3/CH-01 (CA-06: pergunta ANTES de mutar).
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { injectOptionalSection } from '../inject-optional-section'
import type { Step } from './types'
import { resolvePluginRoot } from './helpers'

export const deliveryLoopStep: Step = {
  id: 'delivery-loop',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): 1a invocacao — sem resposta. Retorna needsUser para dispatcher
    // pausar e perguntar. CA-06 garantido aqui: zero IO antes de retornar.
    const answer = ctx.flags['__interactiveAnswer']
    if (typeof answer !== 'string') {
      return {
        mutated: false,
        summary: '',
        needsUser: {
          // 2026-05-21 (Luiz/dev): wording byte-identico SKILL.md L372. DOUBLE SPACE eh contratual (G3).
          prompt: 'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]',
          options: ['y', 'N'] as const,
        },
      }
    }

    // 2026-05-21 (Luiz/dev): 2a invocacao — answer via ctx.flags. Default N (SKILL.md L374).
    // Case-insensitive 'y' ativa. D4: SEM dry-run guard — segue direto pra IO.
    const yes = answer.trim().toLowerCase() === 'y'
    if (!yes) {
      return { mutated: false, summary: '' }
    }

    const pluginRoot = resolvePluginRoot(import.meta.dir)
    const snippet = await fs.readFile(
      path.join(pluginRoot, 'skills/init/assets/snippets/delivery-loop.md'),
      'utf8',
    )

    const result = await injectOptionalSection({
      filePath: path.join(ctx.cwd, 'AGENTS.md'),
      marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
      body: snippet,
    })

    // 2026-05-21 (Luiz/dev): wording byte-identico SKILL.md L396 — 'injected'/'already-present'/'marker-missing'.
    return {
      mutated: result.status === 'injected',
      summary: 'Delivery Loop injection: ' + result.status,
    }
  },
}
