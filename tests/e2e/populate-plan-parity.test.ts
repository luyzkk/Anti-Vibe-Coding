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
// 2026-05-19 (Luiz/dev): Plano 03 fase-03 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Imports do generator para validar contrato `ImperativeInstruction` no parity test.
import {
  DEFAULT_INSTRUCTION,
  isImperativeInstruction,
  LLM_INSTRUCTIONS,
} from '../../skills/init/lib/populate-plan-generator'
// 2026-05-19 (Luiz/dev): Plano 02 fase-04 do PRD populate-plan-andre-port (MH-2 / CA-03).
// Fonte canonica das 10 secoes base — drift entre array e tpl quebra os testes abaixo.
import { EXEC_PLAN_SECTIONS_FULL } from '../../skills/lib/exec-plan-sections'

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

  test('PLAN.md gerado contem as 11 secoes obrigatorias (10 Andre + Observability) — CA-03', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'parity-test',
      clock: () => FIXED_DATE,
    })

    const required = [...EXEC_PLAN_SECTIONS_FULL, 'Observability']
    const ausentes = required.filter(sec =>
      !new RegExp(`^## ${sec}\\s*$`, 'm').test(result.planIndexMarkdown),
    )

    if (ausentes.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir" — CA-03] Secoes obrigatorias ausentes do PLAN.md gerado:\n` +
        ausentes.map(s => `  - ## ${s}`).join('\n') +
        `\n\nSe removida propositalmente, atualize ${PRD_LINK} CA-03 + o template:\n` +
        `  skills/init/assets/templates/exec-plan/PLAN.md.tpl\n` +
        `Fonte canonica das 10 primeiras: skills/lib/exec-plan-sections.ts (EXEC_PLAN_SECTIONS_FULL).\n` +
        `Observability e melhoria nossa (D1 do PRD) — manter ate ser explicitamente removida.\n`,
      )
    }

    expect(ausentes).toEqual([])
  })

  test('PLAN.md tem 3 opcionais ausentes OU marcadas como <!-- opcional --> (CA-03)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'parity-test',
      clock: () => FIXED_DATE,
    })

    // 2026-05-19 (Luiz/dev): CA-03 do PRD — opcionais NAO podem aparecer como H2 com corpo
    // vazio. Aceitavel: ausentes OU `<!-- opcional: NOME ... -->`. Falha se `## NOME` aparecer
    // sem o comentario correspondente.
    const opcionais = ['Follow-up Plans', 'Final Report', 'Pre-GO']
    const violacoes: string[] = []

    for (const opt of opcionais) {
      const hasH2 = new RegExp(`^## ${opt}\\s*$`, 'm').test(result.planIndexMarkdown)
      const hasComment = new RegExp(`<!--\\s*opcional:[^>]*${opt}`, 'm').test(result.planIndexMarkdown)
      // Violacao: tem H2 sem ser marcada como comentario (vazou para o output).
      if (hasH2 && !hasComment) {
        violacoes.push(opt)
      }
    }

    if (violacoes.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir" — CA-03] Opcionais vazaram para o PLAN.md como H2 sem marcacao:\n` +
        violacoes.map(s => `  - ## ${s} (deveria ser <!-- opcional: ${s} ... --> ou ausente)`).join('\n') +
        `\n\nAjuste ${PRD_LINK} CA-03 + o template:\n` +
        `  skills/init/assets/templates/exec-plan/PLAN.md.tpl\n`,
      )
    }

    expect(violacoes).toEqual([])
  })

  test('every LLM_INSTRUCTION entry is a valid ImperativeInstruction (CA-06)', () => {
    // 2026-05-19 (Luiz/dev): gate "nunca diminuir" para o map de instrucoes. Adicionar nova
    // entry sem `fontes` especificas / `secoes` obrigatorias / `honestidade` quebra build.
    const violacoes: Array<{ key: string; reason: string }> = []

    for (const [key, instr] of Object.entries(LLM_INSTRUCTIONS)) {
      if (!isImperativeInstruction(instr)) {
        // Diagnose qual elemento falhou — mensagem util.
        let reason = 'estrutura invalida'
        if (typeof instr !== 'object' || instr === null) reason = 'nao e objeto'
        else {
          const obj = instr as Record<string, unknown>
          if (!Array.isArray(obj.fontes) || obj.fontes.length === 0) reason = '`fontes` ausente ou vazio'
          else if (!Array.isArray(obj.secoes) || obj.secoes.length === 0) reason = '`secoes` ausente ou vazio'
          else if (typeof obj.honestidade !== 'string' || obj.honestidade.length === 0) reason = '`honestidade` ausente ou vazio'
        }
        violacoes.push({ key, reason })
      }
    }

    if (violacoes.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir" — CA-06] LLM_INSTRUCTIONS contem entries que NAO satisfazem ImperativeInstruction:\n` +
        violacoes.map(v => `  - LLM_INSTRUCTIONS['${v.key}']: ${v.reason}`).join('\n') +
        `\n\nAjuste em skills/init/lib/populate-plan-generator.ts.\n` +
        `Schema obrigatorio (3 elementos): { fontes: string[]; secoes: string[]; honestidade: string }.\n` +
        `Sem brecha "se nao houver, mantenha template" — ver ${PRD_LINK} CA-06.\n`,
      )
    }

    expect(violacoes).toEqual([])
  })

  test('DEFAULT_INSTRUCTION is a valid ImperativeInstruction (CA-06)', () => {
    // 2026-05-19 (Luiz/dev): default e fallback quando doc canonico NAO tem entry. Tem que
    // satisfazer o mesmo contrato — senao a brecha volta pela porta dos fundos.
    if (!isImperativeInstruction(DEFAULT_INSTRUCTION)) {
      throw new Error(
        `[parity gate "nunca diminuir" — CA-06] DEFAULT_INSTRUCTION em ` +
        `skills/init/lib/populate-plan-generator.ts NAO satisfaz ImperativeInstruction.\n` +
        `Schema obrigatorio: { fontes: string[]; secoes: string[]; honestidade: string }.\n` +
        `Ver ${PRD_LINK} CA-06.\n`,
      )
    }

    expect(isImperativeInstruction(DEFAULT_INSTRUCTION)).toBe(true)
  })
})
