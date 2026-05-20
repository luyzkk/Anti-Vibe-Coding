// 2026-05-19 (Luiz/dev): Plano 01 fase-02 do PRD populate-plan-andre-port.
// Gate "nunca diminuir" (CA-04, CA-07). Cresce em sub-asserts:
//   - Plano 02 fase-04: 11 secoes obrigatorias do PLAN.md (CA-03).
//   - Plano 03 fase-03: cada LLM_INSTRUCTION imperativa (CA-06).
//   - Plano 04 fase-03: paths reais por stack (CA-02, CA-05).
// Decisao DI-Plano01-fase02-isolated-call: chama generatePopulatePlanV2 direto, sem runInit,
// para evitar abort do Step 90 (V6.6.0 knowledge gate). Integracao end-to-end fica em Plano 05.

import { describe, expect, test } from 'bun:test'
import {
  generatePopulatePlanV2,
  EXCLUDED_FROM_POPULATION_V2,
} from '../../skills/init/lib/populate-plan-generator'

const FIXED_DATE = new Date('2026-05-19T10:00:00.000Z')

const PRD_LINK =
  'docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md (CA-01, CA-04, D5)'

// Lista enumerada em CA-01 do PRD — mantem reference visivel para mensagens de erro.
const CA_01_REQUIRED_DOCS: ReadonlyArray<string> = [
  'ARCHITECTURE.md',
  'AGENTS.md',
  'README.md',
  '.claude/CLAUDE.md',
  'docs/PRODUCT_SENSE.md',
  'docs/QUALITY_SCORE.md',
  'docs/SECURITY.md',
  'docs/RELIABILITY.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/PLANS.md',
  'docs/CODE_STYLE.md',
]

describe('populate-plan parity (gate "nunca diminuir")', () => {
  test('plano gerado contem >= 12 fases cobrindo lista CA-01', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'parity-test',
      clock: () => FIXED_DATE,
    })

    const docsEmitidos = result.phases.map(p => p.docCanonico)
    const ausentes = CA_01_REQUIRED_DOCS.filter(d => !docsEmitidos.includes(d))

    if (ausentes.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir"] Docs esperados ausentes do plano:\n` +
        ausentes.map(d => `  - ${d}`).join('\n') +
        `\n\nSe removido propositalmente, atualize ${PRD_LINK} CA-01 e regenere golden\n` +
        `tests/e2e/__golden__/populate-plan-andre-parity.md.\n` +
        `Plano gerado: ${result.phases.length} fases. Esperado: >= 12.\n`
      )
    }

    expect(result.phases.length).toBeGreaterThanOrEqual(12)
  })

  test('EXCLUDED_FROM_POPULATION_V2 nao readiciona PRODUCT_SENSE nem README (CA-04)', () => {
    const proibidos: ReadonlyArray<string> = ['docs/PRODUCT_SENSE.md', 'README.md']
    const readicionados = proibidos.filter(d => EXCLUDED_FROM_POPULATION_V2.has(d))

    if (readicionados.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir"] EXCLUDED_FROM_POPULATION_V2 readicionou docs proibidos:\n` +
        readicionados.map(d => `  - ${d}`).join('\n') +
        `\n\nD5 do PRD removeu esses docs do EXCLUDED — eles devem aparecer no plano populate.\n` +
        `Reverter mudanca em skills/init/lib/populate-plan-generator.ts:60.\n` +
        `Ref: ${PRD_LINK}.\n`
      )
    }

    expect(readicionados).toEqual([])
  })
})
