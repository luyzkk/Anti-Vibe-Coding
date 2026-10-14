// 2026-09-01 (Luiz/dev): gate de contrato do write-prd — PRD §RF-04, §CA-03.
// 2026-10-14 (Luiz/dev): 8.0 fatia 3 — o PRD virou a pagina de uma folha e o mapa de ameacas foi para
// o documento de desenho (docs/exec-plans/active/2026-10-13-anti-vibe-8/fatia-3.md, F3-1 a F3-3).
//
// Assere apenas **contrato** — o que nao pode mudar em silencio. A prosa de dentro das secoes (as
// perguntas, os exemplos) pode ser reescrita a vontade sem tocar neste arquivo.
//
// ─────────────────────────────────────────────────────────────────────────────
// O que este arquivo deliberadamente NAO testa:
//   - que o agente CLASSIFICA o risco corretamente — comportamento de LLM, nao verificavel
//   - que os cenarios e casos de abuso escritos numa pagina real sao bons
//   - o fluxo write-prd → plan-feature → tdd-workflow — exigiria fixture de conversa
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')

/** CRLF quebra regex ancorada em `$` — repo Windows, mesmo cuidado do grill-me-contract. */
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')

const page = read('skills/write-prd/templates/prd-template.md')
const design = read('skills/write-prd/templates/design-template.md')
const skill = read('skills/write-prd/SKILL.md')

/**
 * Corpo de uma secao ate o proximo heading do mesmo nivel ou acima (exclusivo).
 * Rastreia fences porque templates markdown embutem headings DENTRO de blocos cercados —
 * uma busca ingenua por `\n## ` corta a secao no primeiro deles.
 */
function section(doc: string, heading: RegExp): string {
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => heading.test(l))
  if (start === -1) return ''
  const level = (lines[start] ?? '').match(/^#+/)?.[0].length ?? 0

  const out: string[] = []
  let inFence = false
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('```')) inFence = !inFence
    const m = line.match(/^(#+) /)
    if (!inFence && m && (m[1] ?? '').length <= level) break
    out.push(line)
  }
  return out.join('\n')
}

// Tolera acento nos headings: um "conserto" futuro de ortografia nao deve reprovar o gate (G14).
const AMEACAS = /^## Amea[cç]as & Dados/m
const CENARIOS = /^## Cen[aá]rios/

describe('write-prd — a pagina de uma folha (F3-2)', () => {
  test.each([
    ['**Nível de risco:**', /^\*\*N[ií]vel de risco:\*\*/m, 'decide quanto de prova a feature exige (F3-1)'],
    ['**Apetite:**', /^\*\*Apetite:\*\*/m, 'o tempo que vale gastar; estourou, corta escopo'],
    ['**Desenho:**', /^\*\*Desenho:\*\*/m, 'aponta para o DESIGN.md ou registra por que nao precisa'],
    ['## Problema', /^## Problema/m, 'o que doi hoje'],
    ['## Solução', /^## Solu[cç][aã]o/m, 'o que muda para quem usa'],
    ['## Precisa ter', /^## Precisa ter/m, 'MoSCoW: sem isso a feature nao tem valor'],
    ['## Deveria ter', /^## Deveria ter/m, 'MoSCoW: importante, nao bloqueia a primeira entrega'],
    ['## Poderia ter', /^## Poderia ter/m, 'MoSCoW: so se sobrar tempo'],
    ['## Não terá', /^## N[aã]o ter[aá]/m, 'MoSCoW: fora desta versao, contra o escopo que cresce'],
    ['## Premissa mais arriscada', /^## Premissa mais arriscada/m, 'a aposta que derruba a ideia e o teste mais barato'],
    ['## Cenários', /^## Cen[aá]rios/m, 'o que o usuario aprova e vira teste'],
    ['## Fatias', /^## Fatias/m, 'o plano detalha so a proxima (F3-4)'],
    ['## Como saber que ficou pronto', /^## Como saber que ficou pronto/m, 'o criterio de fim'],
  ])('a pagina tem "%s"', (label, re, why) => {
    expect(
      re.test(page),
      `[contrato — fatia 3, F3-2] "${label}" ausente do prd-template.md — ${why}. ` +
        `As secoes da pagina foram escolhidas pelo usuario na entrevista de 2026-10-14.`,
    ).toBe(true)
  })

  test('a pagina cabe numa folha', () => {
    const lines = page.split('\n').length
    expect(
      lines,
      `[contrato — fatia 3, F3-2] O prd-template.md tem ${lines} linhas. A pagina e de uma folha; o ` +
        `que nao cabe vai para o documento de desenho, nao para uma secao nova aqui.`,
    ).toBeLessThanOrEqual(80)
  })

  test('a pagina nomeia os tres niveis de risco (F3-1)', () => {
    expect(/experimento/.test(page) && /produto/.test(page) && /dinheiro, sa[uú]de ou dados/.test(page)).toBe(true)
  })

  test('o mapa de ameacas nao volta para a pagina', () => {
    expect(
      AMEACAS.test(page),
      `[contrato — fatia 3, F3-3] "## Ameacas & Dados" voltou para o prd-template.md. O mapa tecnico de ` +
        `ameacas mora no design-template.md; na pagina ficam so os casos de abuso, em linguagem de negocio, ` +
        `dentro dos Cenarios.`,
    ).toBe(false)
  })

  test('os cenarios trazem criterios CA- e casos de abuso AB-', () => {
    const body = section(page, CENARIOS)
    expect(
      /CA-\d/.test(body) && /AB-\d/.test(body),
      `[contrato — fatia 3] Os ids CA-* e AB-* sumiram dos Cenarios. Sao eles que o plan-feature e o RED ` +
        `do tdd-workflow seguem ate o teste.`,
    ).toBe(true)
  })

  test('os cenarios registram a aprovacao do usuario (D2)', () => {
    expect(
      /aprovad/i.test(section(page, CENARIOS)),
      `[contrato — D2] Sumiu o registro de aprovacao dos cenarios. No nivel dinheiro, saude ou dados o ` +
        `usuario aprova os cenarios uma vez, antes do codigo, e a pagina guarda quem aprovou e quando.`,
    ).toBe(true)
  })
})

describe('write-prd — o documento de desenho (F3-3)', () => {
  test.each([
    ['## Partes', /^## Partes/m],
    ['## Dados', /^## Dados/m],
    ['## Mecanismo', /^## Mecanismo/m],
    ['## Decisões', /^## Decis[oõ]es/m],
    ['## Ameaças & Dados', AMEACAS],
  ])('o desenho tem "%s"', (label, re) => {
    expect(re.test(design), `[contrato — fatia 3, F3-3] "${label}" ausente do design-template.md.`).toBe(true)
  })

  const ameacas = () => section(design, AMEACAS)

  // Ancorado no CONTEUDO, nao no token do heading: `includes('## Ameacas & Dados')` casaria com
  // `## Ameacas & Dados REMOVIDO` e passaria vacuamente (licao do grill-me-contract).
  test.each([
    ['Classificacao do dado', /^### Classifica[cç][aã]o do dado/m, 'que dado a feature toca e de que classe'],
    ['Fronteiras de confianca', /^### Fronteiras de confian[cç]a/m, 'onde input nao-confiavel entra'],
    ['Superficie nova', /^### Superf[ií]cie nova/m, 'rotas, handlers e campos que passam a existir'],
    ['Casos de abuso', /^### Casos de abuso/m, 'o que um mal-intencionado tentaria — vira teste no RED'],
    ['Gatilhos de aprovacao humana', /^### Gatilhos de aprova[cç][aã]o humana/m, 'o que exige diff antes de aplicar'],
  ])('o mapa de ameacas mantem o bloco "%s"', (label, re, why) => {
    expect(
      re.test(ameacas()),
      `[contrato — RF-04] Bloco ausente de "Ameacas & Dados" no design-template.md: ${label} — ${why}.`,
    ).toBe(true)
  })

  test('os casos de abuso do desenho apontam para os AB-* da pagina, sem copia-los', () => {
    // Uma fonte de verdade: o usuario aprova os AB-* na pagina. Uma segunda lista no desenho diverge.
    const abuso = section(design, /^### Casos de abuso/)
    expect(/AB-/.test(abuso) && /p[aá]gina/i.test(abuso)).toBe(true)
    expect(/^\| AB-\d/m.test(abuso), 'os casos de abuso voltaram a ser copiados no desenho').toBe(false)
  })

  test('o mapa de ameacas e obrigatorio no nivel dinheiro, saude ou dados', () => {
    const idx = design.search(AMEACAS)
    // Guarda anti-vacuidade: sem a secao, slice(0, -1) seria o arquivo inteiro.
    expect(idx).toBeGreaterThan(-1)
    const preamble = design.slice(Math.max(0, idx - 700), idx)
    expect(
      /obrigat/i.test(preamble) && /dinheiro, sa[uú]de ou dados/.test(preamble),
      `[contrato — F3-3] O comentario que torna o mapa obrigatorio no nivel de risco sumiu do topo da secao.`,
    ).toBe(true)
  })
})

describe('write-prd — nivel de risco na skill (F3-1)', () => {
  const nivel = () => section(skill, /^### N[ií]vel de risco/)

  test('a skill tem a secao de nivel de risco com os tres niveis', () => {
    const body = nivel()
    expect(body.length, 'Secao "### Nivel de risco" ausente do write-prd/SKILL.md.').toBeGreaterThan(0)
    expect(/experimento/.test(body) && /produto/.test(body) && /dinheiro, sa[uú]de ou dados/.test(body)).toBe(true)
  })

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
    // 2026-09-01 (Luiz/dev): ancorado NA SECAO, nao no arquivo inteiro. Contra o arquivo todo,
    // /auth|autoriza/i casava com "Modelo de auth" do Step 2 e passava sem a tabela existir (GT-4).
    expect(
      re.test(nivel()),
      `[contrato — RF-04] Gatilho de risco ausente da secao de nivel de risco: ${label}. Um gatilho que ` +
        `some faz a feature correspondente nascer sem mapa de ameacas, e nenhum passo adiante recupera isso.`,
    ).toBe(true)
  })

  test('baixar o nivel de uma feature de risco exige dizer o que deixa de ser conferido', () => {
    expect(/baixar/i.test(nivel()) && /deixa de ser conferido/i.test(nivel())).toBe(true)
  })

  test('a skill propoe o desenho pelos sinais do sistema e o exige no nivel de risco (F3-3)', () => {
    const body = section(skill, /^### Documento de desenho/)
    expect(body.length, 'Secao "### Documento de desenho" ausente do write-prd/SKILL.md.').toBeGreaterThan(0)
    expect(/banco/i.test(body) && /webhook|fila/i.test(body) && /obrigat/i.test(body)).toBe(true)
  })

  test('sem desenho, a pagina registra o motivo, nao silencio', () => {
    // Mesma regra da antiga justificativa de omissao: "nao tem desenho" precisa ser distinguivel
    // de "ninguem pensou no assunto", para o usuario poder discordar.
    expect(/\*\*Desenho:\*\*/.test(skill) && /motivo/i.test(section(skill, /^### Documento de desenho/))).toBe(true)
  })

  test('no nivel de risco os cenarios sao aprovados antes do codigo (D2)', () => {
    const body = section(skill, /^### Aprova[cç][aã]o dos cen[aá]rios/)
    expect(body.length, 'Secao "### Aprovacao dos cenarios" ausente do write-prd/SKILL.md.').toBeGreaterThan(0)
    expect(/antes do c[oó]digo/i.test(body) && /Aprovados por/.test(body)).toBe(true)
  })
})
