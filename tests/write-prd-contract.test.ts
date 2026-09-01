// 2026-09-01 (Luiz/dev): gate de contrato do write-prd — PRD §RF-04, §CA-03.
//
// Ate aqui o write-prd tinha ZERO cobertura de contrato: nenhum teste enumera secoes do
// prd-template.md (universal-principles.test.ts so olha "Comment Provenance" e a ordem
// Outcomes → Mecanismo). A secao "Ameacas & Dados" e CONDICIONAL por design (PRD §Decisoes D2) —
// ela e legitimamente ausente da maioria dos PRDs gerados, e conteudo condicional e exatamente o
// que uma passada de "simplificacao" apaga sem que nada acuse.
//
// Assere apenas **contrato** — o que nao pode mudar em silencio. A prosa de dentro da secao (as
// perguntas, os exemplos) pode ser reescrita a vontade sem tocar neste arquivo.
//
// ─────────────────────────────────────────────────────────────────────────────
// O que este arquivo deliberadamente NAO testa:
//   - que o agente CLASSIFICA o risco corretamente — comportamento de LLM, nao verificavel
//   - que os casos de abuso escritos num PRD real sao bons
//   - o fluxo write-prd → plan-feature → tdd-workflow — exigiria fixture de conversa
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')

/** CRLF quebra regex ancorada em `$` — repo Windows, mesmo cuidado do grill-me-contract. */
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')

const template = read('skills/write-prd/templates/prd-template.md')
const skill = read('skills/write-prd/SKILL.md')

/**
 * Corpo de uma secao `## Titulo` ate o proximo `## ` de topo (exclusivo).
 * Rastreia fences porque templates markdown embutem headings DENTRO de blocos cercados —
 * uma busca ingenua por `\n## ` corta a secao no primeiro deles.
 */
function section(doc: string, startsWith: string): string {
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => l.startsWith(startsWith))
  if (start === -1) return ''

  const out: string[] = []
  let inFence = false
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('```')) inFence = !inFence
    if (!inFence && line.startsWith('## ')) break
    out.push(line)
  }
  return out.join('\n')
}

describe('write-prd — secao "Ameacas & Dados" no template (RF-04)', () => {
  // Tolera acento: um "conserto" futuro de ortografia nao deve reprovar o gate (G14).
  const HEADING = /^## Amea[cç]as & Dados/m

  test('a secao existe no template', () => {
    expect(
      HEADING.test(template),
      `[parity gate "nunca diminuir" — RF-04] Secao "Ameacas & Dados" ausente do prd-template.md. ` +
        `E onde o modelo de ameaca entra ANTES do codigo: classificacao do dado, fronteiras de ` +
        `confianca, superficie nova e casos de abuso. Sem ela o PRD volta a delegar seguranca para ` +
        `a auditoria do fim do pipeline. Restaure a secao, nao remova esta assercao.`,
    ).toBe(true)
  })

  const body = () => section(template, '## Ameacas & Dados') || section(template, '## Ameaças & Dados')

  // Ancorado no CONTEUDO, nao no token do heading: `includes('## Ameacas & Dados')` casaria com
  // `## Ameacas & Dados REMOVIDO` e passaria vacuamente (licao do grill-me-contract).
  test.each([
    ['### Classificacao do dado', 'que dado a feature toca e de que classe (PII, credencial, financeiro)'],
    ['### Fronteiras de confianca', 'onde input nao-confiavel entra e precisa de validacao'],
    ['### Superficie nova', 'rotas, handlers e campos que passam a existir'],
    ['### Casos de abuso', 'o que um usuario mal-intencionado tentaria — vira teste no RED'],
    ['### Gatilhos de aprovacao humana', 'o que exige diff apresentado antes de aplicar'],
  ])('a secao mantem o bloco "%s"', (heading, why) => {
    expect(
      body().includes(heading),
      `[parity gate "nunca diminuir" — RF-04] Bloco ausente de "Ameacas & Dados": ${heading} — ` +
        `${why}. Os cinco blocos sao o contrato consumido adiante: os casos de abuso viram CA-SEC-* ` +
        `no /plan-feature e teste de abuso no RED do /tdd-workflow.`,
    ).toBe(true)
  })

  test('a secao e CONDICIONAL, como Boundaries e Fluxos UX (D2)', () => {
    const idx = template.search(HEADING)
    // 2026-09-01 (Luiz/dev): guarda anti-vacuidade. `search` devolve -1 quando a secao nao existe,
    // e `slice(0, -1)` seria o ARQUIVO INTEIRO — que ja contem "OPCIONAL"/"omitir" vindos de
    // "## Boundaries". Sem este guard a assercao passa exatamente no cenario que deveria reprovar.
    // Mesma classe do GT-1 do Plano 01: verificacao que passa pelo motivo errado nao e verificacao.
    expect(
      idx,
      `[parity gate — PRD §Decisoes D2] Secao ausente: nao ha preambulo para inspecionar. ` +
        `Este teste checa a CONDICIONALIDADE; a existencia e coberta por "a secao existe no template".`,
    ).toBeGreaterThan(-1)
    const preamble = template.slice(Math.max(0, idx - 900), idx)
    expect(
      /OPCIONAL/.test(preamble) && /omitir/i.test(preamble),
      `[parity gate — PRD §Decisoes D2] O comentario de condicionalidade sumiu do topo da secao. ` +
        `Sem ele a secao vira sempre-on e o PRD deixa de caber em 1-2 paginas para feature trivial — ` +
        `que e exatamente o custo que D2 recusou. O padrao e o mesmo de "## Boundaries".`,
    ).toBe(true)
  })
})

describe('write-prd — triagem de risco na skill (CA-03)', () => {
  // Os seis gatilhos sao vocabulario COMPARTILHADO: tdd-workflow (Abuse-It), plan-feature
  // (classificacao do slice) e grill-me (ramos de abuso) usam a mesma lista. Divergir aqui
  // desalinha o pipeline inteiro em silencio.
  test.each([
    ['autenticacao ou autorizacao', /auth|autoriza/i],
    ['dados sensiveis / PII', /PII|sens[ií]ve/i],
    ['input externo', /input externo/i],
    ['upload de arquivo', /upload/i],
    ['pagamento / financeiro', /pagamento|financeir/i],
    ['integracao com terceiro', /terceir/i],
  ])('a skill conhece o gatilho "%s"', (label, re) => {
    // 2026-09-01 (Luiz/dev): ancorado NA SECAO de triagem, nao no arquivo inteiro. Rodando contra
    // o arquivo todo, /auth|autoriza/i casava com "Modelo de auth" do Step 2 (deteccao de stack) —
    // sem relacao com triagem de risco — e o teste passava mesmo sem a tabela de gatilhos existir.
    // GT-4 do Plano 01: conferir O QUE o padrao casa antes de aceita-lo como gate.
    const triagem = section(skill, '### Triagem de risco')
    expect(
      triagem.length,
      `[parity gate — RF-04 / CA-03] Secao "### Triagem de risco" ausente do write-prd/SKILL.md. ` +
        `E ela que decide se a secao "Ameacas & Dados" entra no PRD gerado.`,
    ).toBeGreaterThan(0)
    expect(
      re.test(triagem),
      `[parity gate — RF-04 / CA-03] Gatilho de risco ausente do write-prd/SKILL.md: ${label}. ` +
        `Os seis gatilhos decidem se a secao "Ameacas & Dados" existe. Um gatilho que some faz a ` +
        `feature correspondente nascer sem modelo de ameaca, e nenhum passo adiante recupera isso.`,
    ).toBe(true)
  })

  test('omitir a secao exige justificativa registrada, nao silencio', () => {
    expect(
      /justificativa/i.test(skill) && /omitir/i.test(skill),
      `[parity gate — CA-03] Sumiu a regra de que omitir a secao exige justificativa de 1 linha nos ` +
        `Nao-funcionais. Sem ela "nao tem secao" fica indistinguivel de "ninguem pensou no assunto" — ` +
        `e a ausencia deixa de ser uma decisao revisavel pelo dev.`,
    ).toBe(true)
  })
})
