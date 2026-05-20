// 2026-05-19 (Luiz/dev): Plano 01 fase-02 do PRD populate-plan-andre-port.
// Gate "nunca diminuir" (CA-04, CA-07). Cresce em sub-asserts:
//   - Plano 02 fase-04: 11 secoes obrigatorias do PLAN.md (CA-03).
//   - Plano 03 fase-03: cada LLM_INSTRUCTION imperativa (CA-06).
//   - Plano 04 fase-03: paths reais por stack (CA-02, CA-05).
//   - Plano 05 fase-01: golden snapshot (CA-08).
// Decisao DI-Plano01-fase02-isolated-call: chama generatePopulatePlanV2 direto, sem runInit,
// para evitar abort do Step 90 (V6.6.0 knowledge gate). Integracao end-to-end fica em Plano 05.

import { describe, expect, test } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
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
// 2026-05-20 (Luiz/dev): Plano 04 fase-03 do PRD populate-plan-andre-port (MH-4 / CA-02, CA-05).
// Decisao DI-Plano04-fase03-imports-toplevel: imports movidos para topo (nao dynamic) —
// sem isolamento de contexto necessario aqui, top-level e mais legivel e consistente.
import { stackAwareInputPaths } from '../../skills/init/lib/stack-aware-input-paths'

const FIXED_DATE = new Date('2026-05-19T10:00:00.000Z')

const PRD_LINK =
  'docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md (CA-01, CA-04, D5)'

// 2026-05-20 (Luiz/dev): Plano 05 fase-01 — CA-08. Golden snapshot do plano populate.
// Convencao: UPDATE_GOLDENS=1 regrava; sem flag, diff quebra build.
// Mesmo mecanismo de tests/e2e/init-cutover-greenfield.test.ts.
const GOLDEN_PATH = path.resolve('tests/e2e/__golden__/populate-plan-andre-parity.md')

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').trimEnd()
}

async function assertMatchesGolden(actual: string, goldenPath: string): Promise<void> {
  const actualN = normalizeLineEndings(actual)
  if (process.env.UPDATE_GOLDENS === '1') {
    await fs.writeFile(goldenPath, actualN + '\n')
    return
  }
  const golden = normalizeLineEndings(await fs.readFile(goldenPath, 'utf-8'))
  // Golden contem linhas estruturais minimas. Cada linha nao-vazia (excluindo blocos de
  // comentario HTML inteiros) deve estar presente no actual (substring match — toleramos
  // variacoes de conteudo em volta).
  // G-golden-includes-not-equals: usar includes, nao ===. Decisao consciente: golden e contrato
  // de estrutura, nao de conteudo.
  // 2026-05-20 (Luiz/dev): DI-Plano05-fase01-comment-filter — filtra blocos HTML completos
  // (<!-- ... -->) para que o cabecalho descritivo do golden nao vire assertion.
  const stripped = golden.replace(/<!--[\s\S]*?-->/g, '')
  const goldenLines = stripped.split('\n').filter(l => l.trim().length > 0)
  const missing: string[] = []
  for (const line of goldenLines) {
    if (!actualN.includes(line.trim())) {
      missing.push(line.trim())
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[parity gate "nunca diminuir" — CA-08] Golden snapshot diverge — ${missing.length} marcador(es) ausente(s) no output:\n` +
      missing.slice(0, 5).map(m => `  - ${m}`).join('\n') +
      (missing.length > 5 ? `\n  ...+${missing.length - 5} mais` : '') +
      `\n\nSe a mudanca e intencional, rode: UPDATE_GOLDENS=1 bun test tests/e2e/populate-plan-parity.test.ts\n` +
      `Apos regen, o diff aparece no PR e exige aprovacao humana explicita (CA-08).\n` +
      `Ref: ${PRD_LINK}, CA-08.\n`,
    )
  }
}

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

  // 2026-05-20 (Luiz/dev): Plano 04 fase-03 do PRD populate-plan-andre-port (MH-4 / CA-02).
  // CA-02: stack-aware-input-paths cobre >= 3 paths reais em ARCHITECTURE/SECURITY/RELIABILITY
  // quando primary='nextjs' + sinal Supabase. Reusa fixture `tests/fixtures/stack-aware/nextjs-supabase`
  // (stubs adicionados em Plano 04 fase-01). Se alguem reverter fase-01 ou fase-02 (remover entries
  // do map ou stubs do fixture), este teste quebra listando o doc afetado e linkando o PRD.
  test('Next.js+Supabase: >= 3 paths reais em ARCH/SEC/REL (CA-02)', async () => {
    const fixture = path.join(import.meta.dir, '..', 'fixtures', 'stack-aware', 'nextjs-supabase')
    const stackPaths = await stackAwareInputPaths(fixture, 'nextjs')

    const result = await generatePopulatePlanV2({
      cwd: fixture,
      projectName: 'parity-ca02',
      stackPaths,
      clock: () => FIXED_DATE,
    })

    const docsCriticos = ['ARCHITECTURE.md', 'docs/SECURITY.md', 'docs/RELIABILITY.md'] as const
    const reportadoMenos = docsCriticos
      .map(doc => {
        const phase = result.phases.find(p => p.docCanonico === doc)
        const real = phase?.inputsCode.filter(p => p.exists) ?? []
        return { doc, count: real.length }
      })
      .filter(x => x.count < 3)

    if (reportadoMenos.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir" / CA-02] Next.js+Supabase nao atinge 3 paths reais:\n` +
        reportadoMenos.map(x => `  - ${x.doc}: ${x.count} reais (esperado >= 3)`).join('\n') +
        `\n\nVerificar:\n` +
        `  1. Entries em skills/init/lib/stack-aware-input-paths.ts (NEXTJS_SUPABASE_EXTRA + NEXTJS_CANDIDATES).\n` +
        `  2. Stubs em tests/fixtures/stack-aware/nextjs-supabase/ (Plano 04 fase-01 do PRD).\n` +
        `\nRef: ${PRD_LINK}, CA-02.\n`,
      )
    }

    expect(reportadoMenos).toEqual([])
  })

  // 2026-05-20 (Luiz/dev): Plano 04 fase-03 do PRD populate-plan-andre-port (MH-4 / CA-05).
  // CA-05: stack `null` (unknown) ainda gera plano completo. Cada fase tem `inputsCode` vazio
  // (ou apenas paths `exists: false`) + nota explicita. Build NAO falha.
  // Fixture `tests/fixtures/stack-aware/empty/` tem zero arquivos reais — fs.access falha em tudo.
  test('stack null: plano completo com Inputs vazios + nota (CA-05)', async () => {
    const fixture = path.join(import.meta.dir, '..', 'fixtures', 'stack-aware', 'empty')
    const stackPaths = await stackAwareInputPaths(fixture, null)

    const result = await generatePopulatePlanV2({
      cwd: fixture,
      projectName: 'parity-ca05',
      stackPaths,
      clock: () => FIXED_DATE,
    })

    // CA-05.a: plano gerado com >= 12 fases mesmo sem stack detectado.
    expect(result.phases.length).toBeGreaterThanOrEqual(12)

    // CA-05.b: cada fase ou tem inputsCode vazio, ou paths todos com exists:false.
    // "Stack nao detectado" sinaliza ausencia de evidencia de codigo — nao sinaliza falha.
    const fasesFalhas: string[] = []
    for (const phase of result.phases) {
      const realCount = phase.inputsCode.filter(p => p.exists).length
      if (realCount > 0) {
        // Stack null nao deveria retornar paths reais — sinal de bug do GENERIC_CANDIDATES.
        fasesFalhas.push(`${phase.docCanonico}: ${realCount} paths com exists=true (esperado 0)`)
      }
    }

    if (fasesFalhas.length > 0) {
      throw new Error(
        `[parity gate "nunca diminuir" / CA-05] stack null produziu paths reais (deveria 0):\n` +
        fasesFalhas.map(s => `  - ${s}`).join('\n') +
        `\n\nGENERIC_CANDIDATES em skills/init/lib/stack-aware-input-paths.ts deveria emitir paths\n` +
        `que NAO existem no fixture tests/fixtures/stack-aware/empty/.\n` +
        `Se fixture cresceu (Plano 05?), confirmar que stubs de empty foram preservados.\n` +
        `Ref: ${PRD_LINK}, CA-05.\n`,
      )
    }

    // CA-05.c: renderer emite nota explicita quando inputsCode esta vazio.
    // renderInputsCodeBlock retorna "_(Nenhum path candidato para este doc no stack detectado.)_"
    // quando entries.length === 0. Verificar que PELO MENOS UMA fase no plano tem a nota.
    // Frase canonica (G2 do plano): "_(Nenhum path candidato" — Plano 05 fase-01 canoniciza no golden.
    const fasesComNota: string[] = []
    for (const [, content] of result.phaseFiles.entries()) {
      if (
        content.includes('_(Nenhum path candidato') ||
        content.includes('_(candidato nao encontrado')
      ) {
        fasesComNota.push('ok')
      }
    }
    // Pelo menos 1 fase deve emitir a nota — caso contrario, renderer regrediu.
    expect(fasesComNota.length).toBeGreaterThanOrEqual(1)
  })

  // 2026-05-20 (Luiz/dev): Plano 05 fase-01 do PRD populate-plan-andre-port (CA-08).
  // Golden snapshot — estrutura minima do plano populate gerado para fixture Next.js+Supabase.
  // Gate: diff sem UPDATE_GOLDENS=1 quebra build. Regen exige aprovacao humana no PR.
  // Fixture: tests/fixtures/stack-aware/nextjs-supabase/ (stubs adicionados em Plano 04 fase-01).
  test('matches golden snapshot (CA-08)', async () => {
    const fixture = path.join(import.meta.dir, '..', 'fixtures', 'stack-aware', 'nextjs-supabase')
    const stackPaths = await stackAwareInputPaths(fixture, 'nextjs')
    const plan = await generatePopulatePlanV2({
      cwd: fixture,
      projectName: 'fixture-nextjs-supabase',
      manifest: [],
      stackPaths,
      clock: () => new Date('2026-05-19T00:00:00Z'),
    })
    // Concatena plan index + estrutura minima de fase (primeira) — golden cobre apenas marcadores
    // estruturais, nao todas as fases. Helper assertMatchesGolden usa includes por linha.
    const firstPhaseKey = Array.from(plan.phaseFiles.keys())[0]!
    const firstPhase = plan.phaseFiles.get(firstPhaseKey) ?? ''
    const combined = plan.planIndexMarkdown + '\n---\n## Estrutura minima de fase (qualquer fase)\n\n' + firstPhase
    await assertMatchesGolden(combined, GOLDEN_PATH)
  })
})
