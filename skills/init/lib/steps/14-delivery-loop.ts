// skills/init/lib/steps/14-delivery-loop.ts
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { injectOptionalSection } from '../inject-optional-section'
import type { Step } from './types'
import { resolvePluginRoot } from './helpers'

export const deliveryLoopStep: Step = {
  id: 'delivery-loop',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): primeira invocacao — sem resposta no ctx.flags.
    // Retorna needsUser para o dispatcher pausar e perguntar. PRD D3, CH-01.
    const answer = ctx.flags['__interactiveAnswer']
    if (typeof answer !== 'string') {
      return {
        mutated: false,
        summary: '',
        needsUser: {
          // 2026-05-17 (Luiz/dev): prompt byte-identico ao SKILL.md linha 372 (PRD R1, G1).
          // ATENCAO: DOUBLE SPACE antes de '[y/N]'.
          prompt: 'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]',
          options: ['y', 'N'] as const,
        },
      }
    }

    // 2026-05-17 (Luiz/dev): segunda invocacao — answer disponivel via ctx.flags.
    // Default: N (SKILL.md linha 374). Apenas 'y' (case insensitive) ativa injecao.
    const yes = answer.trim().toLowerCase() === 'y'
    if (!yes) {
      return { mutated: false, summary: '' }
    }

    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run guard.
    // injectOptionalSection le AGENTS.md; em dry-run Step 01 nao escreveu o arquivo.
    if (ctx.flags['dry-run'] === true) {
      return { mutated: false, summary: 'dry-run: Delivery Loop injection would be applied (AGENTS.md not present yet)' }
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 384-396.
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

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 396 (PRD R1, G1).
    return {
      mutated: result.status === 'injected',
      summary: 'Delivery Loop injection: ' + result.status,
    }
  },
}
