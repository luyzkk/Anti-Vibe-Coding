// 2026-08-12 (Luiz/dev): plano04 fase-02 — o primeiro teste do grill-me.
//
// Ele e o centro do pipeline (grill-me → write-prd → plan-feature → execute-plan) e ate aqui tinha
// ZERO cobertura, enquanto plan-feature e quick-plan ja tinham gate de paridade. A fase-01
// reescreveu o coracao da skill; sem este teste, a proxima edicao pode remover o gate de
// sintetizar-e-confirmar ou uma das 7 sementes e nada acusa.
//
// Assere apenas **contrato** — o que nao pode mudar em silencio. Prosa muda; contrato nao.
// Testar prosa produziria um teste que quebra em toda edicao e treina o time a ignora-lo (G1).
//
// ─────────────────────────────────────────────────────────────────────────────
// O que este arquivo deliberadamente NAO testa (silenciar le como cobertura completa):
//
//   - que o agente **de fato** calcula a fronteira corretamente — comportamento de LLM,
//     nao verificavel por assertion
//   - que as perguntas geradas sao boas
//   - o fluxo end-to-end grill-me → write-prd — exigiria fixture de conversa; candidato a
//     plano futuro
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const SKILL = path.join(import.meta.dir, '..', 'skills', 'grill-me', 'SKILL.md')

/** CRLF quebra regex ancorada em `$` — compound 2026-05-19 (G4). */
const skill = fs.readFileSync(SKILL, 'utf-8').replace(/\r/g, '')

/**
 * Corpo de uma secao `## Titulo` ate o proximo `## ` de topo (exclusivo).
 *
 * Rastreia fences porque o Passo 5 embute um template markdown que contem `## Decisions`,
 * `## Open Questions` e `## Recommended Next Steps` DENTRO de um bloco cercado. Uma busca ingenua
 * por `\n## ` corta a secao no primeiro deles e perde os campos da decisao indexada — foi
 * exatamente o que aconteceu na primeira versao deste helper.
 */
function section(heading: string): string {
  const lines = skill.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`))
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

describe('grill-me — cobertura: as 7 sementes (INV-02)', () => {
  // Sementes, nao lista a varrer: um design tree semeado so pelo que o dev mencionou fecha sem
  // tocar em seguranca uma unica vez. Por isso a assercao e de EXISTENCIA do ramo.
  const SEEDS = ['ESCOPO', 'DADOS', 'UX', 'EDGE CASES', 'PERFORMANCE', 'SEGURANCA', 'INTEGRACAO']

  test.each(SEEDS)('semente %s continua plantada', (seed) => {
    expect(
      skill.includes(`### ${seed}`),
      `[parity gate "nunca diminuir" — INV-02] Semente ausente do grill-me: ${seed}. ` +
        `As 7 categorias sao as raizes do design tree; sem a raiz o ramo nunca existe e a ` +
        `entrevista fecha sem tocar no assunto — que e exatamente o modo de falha que a ` +
        `varredura por checklist evitava. Restaure a semente, nao remova esta assercao.`,
    ).toBe(true)
  })

  test('as 7 sao tratadas como sementes da arvore, nao como lista paralela', () => {
    expect(
      skill.includes('## As 7 Sementes da Arvore'),
      `[parity gate — INV-02 / G2] A secao de sementes sumiu ou foi renomeada. Duas estruturas ` +
        `dizendo o que perguntar (uma tabela de categorias + um design tree) e duplicacao, e o ` +
        `agente escolhe uma. As categorias existem COMO sementes da arvore.`,
    ).toBe(true)
  })
})

describe('grill-me — estrutura: design tree, fronteira, rounds', () => {
  // Termos-ancora da reescrita da fase-01. `design tree` e `round` ficaram em ingles (prior de
  // pre-treino, DI-03); `fronteira` ficou em pt-BR porque e assim que o plano04 a nomeia em todo
  // o texto. A assercao segue o arquivo real, nao a aspiracao.
  test.each([
    ['design tree', 'a arvore de decisoes onde cada uma ramifica nas que dependem dela'],
    ['fronteira', 'o conjunto de decisoes cujos pre-requisitos ja estao resolvidos'],
    ['round', 'a unidade de perguntas — a fronteira inteira de uma vez'],
  ])('termo-ancora "%s" presente', (term, meaning) => {
    expect(
      new RegExp(term, 'i').test(skill),
      `[parity gate — fase-01] Termo-ancora ausente: "${term}" (${meaning}). Os tres carregam o ` +
        `modelo estrutural inteiro; sem eles a skill volta a ser varredura sequencial de checklist.`,
    ).toBe(true)
  })

  test('pergunta dependente e adiada para round posterior', () => {
    expect(
      /round posterior/i.test(skill),
      `[parity gate — fase-01] Sumiu a regra de que pergunta dependente de outra ainda aberta ` +
        `pertence a um round posterior. Sem ela o agente pergunta fora de ordem, o dev responde ` +
        `no vacuo, e a resposta muda quando a dependencia resolve.`,
    ).toBe(true)
  })
})

describe('grill-me — parada por fronteira vazia (DI-15)', () => {
  const stop = section('Condicao de Parada')

  test('a secao de parada existe', () => {
    expect(stop.length, '[parity gate — DI-15] Secao "Condicao de Parada" ausente.').toBeGreaterThan(0)
  })

  test('para por fronteira vazia, condicao enumeravel', () => {
    expect(
      /fronteira esvazia/i.test(stop),
      `[parity gate — DI-15] A parada por fronteira vazia sumiu. E a unica condicao enumeravel: ` +
        `todo ramo visitado, resolvido ou fechado explicitamente. O que ela substituiu (piso, teto ` +
        `e limiar de confianca) convidava premature completion — o agente encerra quando PARECE ` +
        `suficiente.`,
    ).toBe(true)
  })

  test('nenhum limiar percentual voltou para a condicao de parada', () => {
    // G3: a assercao e ancorada NA SECAO, nao no arquivo. Um comentario em outro lugar explicando
    // por que o limiar saiu nao deve reprovar o teste — compound 2026-05-12-validator-regex-hits-comments.
    const found = stop.match(/\d{1,3}\s?%/g)
    expect(
      found,
      `[parity gate — DI-15] Limiar percentual de volta na condicao de parada: ${found?.join(', ')}. ` +
        `Numero de confianca e bound vago — o agente nao distingue pronto de nao-pronto. Se a ` +
        `intencao e explicar por que o limiar saiu, escreva sem o token (ver DI-Plano03-fase01).`,
    ).toBeNull()
  })

  test('fronteira que nao esvazia tem freio, agora que nao ha teto', () => {
    expect(
      // \s+ e nao um espaco: a regra quebra em duas linhas no arquivo real.
      /duas vezes\s+seguidas/i.test(stop),
      `[parity gate — fase-01 Passo 4] Sumiu o freio da fronteira que nao esvazia. Sem teto de 20 ` +
        `perguntas, feature mal escopada gera fronteira crescente e a entrevista nunca termina. ` +
        `A regra (round que abre mais fronteira do que fecha, 2x seguidas → nomear o problema de ` +
        `escopo) e o unico limite restante.`,
    ).toBe(true)
  })
})

describe('grill-me — fatos nao-bloqueantes (DI-16)', () => {
  test('achar fato e trabalho do agente, decisao e do dev', () => {
    expect(
      /Fatos sao seus; decisoes sao do dev/i.test(skill),
      `[parity gate — DI-16] Sumiu a fronteira entre fato e decisao. Sem ela o agente pergunta ao ` +
        `dev o que daria para descobrir sozinho lendo o repo.`,
    ).toBe(true)
  })

  test('exploracao de fato nao bloqueia o round', () => {
    expect(
      /sem bloquear o round/i.test(skill),
      `[parity gate — DI-16] Sumiu a regra de nao-bloqueio. Uma exploracao em curso e um ` +
        `pre-requisito nao resolvido: apenas as perguntas A JUSANTE daquele fato esperam. Se o ` +
        `round inteiro bloquear, a entrevista vira serial e o ganho do modelo de rounds evapora.`,
    ).toBe(true)
  })
})

describe('grill-me — gates que sao nossos (INV-03)', () => {
  // Assercao ancorada no CONTEUDO que carrega peso, nao no token do heading: `includes('## Passo
  // 4.5')` casa com `## Passo 4.5 REMOVIDO` e passa vacuamente — verificado ao validar o RED.
  test.each([
    ['Passo 1.5', /HYPOTHESIS:[\s\S]*CONFIDENCE:/, 'hipotese com confianca declarada ANTES da primeira pergunta'],
    ['Passo 4.5', /Fora de escopo/, 'sintetizar-e-confirmar, a ultima defesa antes de gravar o CONTEXT.md'],
  ])('%s permanece com seu conteudo', (step, marker, why) => {
    const body = section(step)
    expect(
      body.length > 0 && marker.test(body),
      `[parity gate "nunca diminuir" — INV-03] ${step} ausente ou esvaziado: ${why}. Nao existe no ` +
        `repo-fonte, e nosso, e nenhum porte futuro deve remove-lo.`,
    ).toBe(true)
  })

  test('o gate do Passo 4.5 exige sim explicito', () => {
    const gate = section('Passo 4.5')
    expect(
      /Fora de escopo/i.test(gate) && /sim.*expl[ií]cito/i.test(gate),
      `[parity gate — INV-03] O gate do Passo 4.5 perdeu a linha "Fora de escopo" ou a exigencia ` +
        `de sim EXPLICITO. Metade do desalinhamento e discordancia silenciosa sobre o que NAO esta ` +
        `sendo construido, e "parece bom" nao e confirmacao.`,
    ).toBe(true)
  })
})

describe('grill-me — contrato de saida (INV-01)', () => {
  // write-prd e design-twice leem este arquivo. Mudar interview e output no mesmo plano tornaria
  // impossivel saber qual quebrou o consumidor.
  test('grava no caminho datado que os consumidores esperam', () => {
    expect(
      skill.includes('docs/exec-plans/active/{date}-{slug}/CONTEXT.md'),
      `[parity gate "nunca diminuir" — INV-01] O caminho de saida mudou. write-prd e design-twice ` +
        `leem docs/exec-plans/active/{date}-{slug}/CONTEXT.md; mudar aqui quebra os dois em ` +
        `silencio, porque path-em-doc nao e executado por teste nenhum.`,
    ).toBe(true)
  })

  test.each([
    ['## Decisions', 'as decisoes indexadas (D1, D2...) que o write-prd importa'],
    ['## Open Questions', 'o que ficou em aberto, com motivo'],
    ['## Recommended Next Steps', 'o handoff para write-prd / plan-feature / consultant'],
  ])('template de saida mantem "%s"', (heading, why) => {
    expect(
      skill.includes(heading),
      `[parity gate "nunca diminuir" — INV-01] Secao ausente do template do CONTEXT.md: ` +
        `${heading} — ${why}. O contrato de saida e consumido por outras skills e nao pode ` +
        `encolher sem que elas sejam atualizadas na mesma mudanca.`,
    ).toBe(true)
  })

  test('existe UM template de CONTEXT.md, e o segundo nao voltou', () => {
    // De 2026-05 a 2026-08 o grill-me carregou dois templates contraditorios: o Passo 5, com
    // `## Decisions` / `### D1:` e campos indexados, e o `## Pipeline Integration`, com
    // `## Decisoes Confirmadas`. O segundo veio de um plano v5 separado
    // (.claude/tasks/prd-v5/17/task-02) e nunca foi reconciliado com o primeiro.
    expect(
      skill.includes('## Decisoes Confirmadas'),
      `[divida fechada 2026-08-13] "## Decisoes Confirmadas" de volta no grill-me. Era o heading do ` +
        `segundo template de CONTEXT.md: com os dois no arquivo, o formato gravado depende de qual ` +
        `pesou mais na leitura, e nenhum teste acusa. Existe UM template, no Passo 5 — mudanca de ` +
        `formato se faz la, nao criando outro.`,
    ).toBe(false)
  })

  test.each([
    ['## Resumo Executivo', 'o que se le ao voltar ao documento meses depois'],
    ['## Requisitos Funcionais', 'o rascunho de comportamento que saiu da conversa'],
    ['## Requisitos Nao-Funcionais', 'performance, escala, seguranca, acessibilidade'],
    ['## Restricoes', 'tecnicas, de negocio, de prazo'],
    ['## Trade-offs Discutidos', 'o trade-off com a decisao tomada, ligado ao D correspondente'],
    ['## Riscos Identificados', 'os riscos levantados durante a entrevista'],
  ])('a fusao dos dois templates preservou "%s"', (heading, why) => {
    // Os dois CONTEXT.md reais do repo — wont-capture-skill (2026-05-20) e workflow-awareness
    // (2026-05-28) — resolveram a contradicao FUNDINDO os dois formatos, com a mesma estrutura e
    // oito dias de diferenca. A uniao virou o template unico; estas secoes vieram do que foi
    // removido, e sao usadas na pratica.
    expect(
      section('Passo 5').includes(heading),
      `[divida fechada 2026-08-13] Secao ausente do template unico: ${heading} — ${why}. Remover ` +
        `aqui e diminuir o formato que os CONTEXT.md existentes ja usam, nao simplifica-lo.`,
    ).toBe(true)
  })

  test('as cinco secoes absorvidas seguem marcadas como opcionais', () => {
    expect(
      /OPCIONAIS/.test(section('Passo 5')),
      `[divida fechada 2026-08-13] Sumiu a marca de que as cinco secoes absorvidas sao opcionais. ` +
        `Sem ela, entrevista trivial passa a gerar requisito e risco vazios, e o CONTEXT.md comeca ` +
        `a duplicar o PRD em vez de alimenta-lo — que e o trabalho do /write-prd.`,
    ).toBe(true)
  })

  test('a decisao indexada mantem os campos que o consumidor le', () => {
    const step5 = section('Passo 5')
    const fields = ['**Categoria:**', '**Pergunta:**', '**Resposta:**', '**Razao:**', '**Origem:**']
    const missing = fields.filter((f) => !step5.includes(f))
    expect(
      missing,
      `[parity gate "nunca diminuir" — INV-01] Campos ausentes da decisao indexada: ` +
        `${missing.join(', ')}. Sao o que torna a decisao rastreavel depois — sem Razao e Origem, ` +
        `o CONTEXT.md vira lista de respostas sem procedencia.`,
    ).toEqual([])
  })
})
