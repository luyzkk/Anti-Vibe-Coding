// tests/fase-template-tdd-contract.test.ts
// 2026-09-08 (Luiz/dev): gate de paridade do ciclo TDD por fase — PRD tdd-cycle-contract §RF-04
//
// O ciclo TDD por fase tem UMA definicao (skills/tdd-workflow/SKILL.md, "## Contrato do Ciclo por Fase")
// e consumidores que apontam para ela: fase-template.md (bloco ### TDD), agents/plan-executor.md
// (secao TDD) e, no Plano 02, o Step 4c do execute-plan. Este arquivo garante que nem a fonte nem um
// consumidor diminua em silencio — "gate de paridade e teste, nao doc" (PRD §Outcomes).
//
// Assere apenas CONTRATO — headings, checkboxes, campos e ponteiros. A prosa dentro das secoes pode ser
// reescrita a vontade sem tocar aqui.
//
// ─────────────────────────────────────────────────────────────────────────────
// O que este arquivo deliberadamente NAO testa:
//   - que o orquestrador do execute-plan EXECUTA o RED-check por mutacao — comportamento de LLM;
//     e o dogfood do Plano 02 fase-04 que prova isso, lendo o STATE log
//   - que um planejador real preenche "Defesa a mutar" com algo util
//   - o conteudo de fases ja geradas em docs/exec-plans/ (PRD §Out of Scope: nao se retroalimenta)
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')

/** CRLF quebra regex ancorada em `$` — repo Windows, mesmo cuidado do write-prd-contract (G4). */
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')

const skill = read('skills/tdd-workflow/SKILL.md')
const template = read('skills/plan-feature/templates/fase-template.md')

/**
 * Corpo de uma secao a partir do heading `startsWith` ate o proximo heading de nivel igual ou
 * superior (exclusivo). Generaliza o `section()` de write-prd-contract.test.ts: o nivel vem da
 * contagem de `#` do proprio heading pedido, entao o mesmo helper serve para `## Verificacao` e
 * para `### TDD`. Rastreia fences porque templates embutem headings DENTRO de blocos cercados (G5).
 * Devolve '' quando o heading nao existe — um `includes` sobre '' reprova em vez de passar vacuamente.
 */
function section(doc: string, startsWith: string): string {
  // 2026-09-08 (Luiz/dev): nivel derivado do heading pedido — PRD tdd-cycle-contract §RF-04 (DP-1 do Plano 01)
  const level = startsWith.match(/^#+/)?.[0].length ?? 2
  const stop = new RegExp(`^#{1,${level}} `)
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => l.startsWith(startsWith))
  if (start === -1) return ''

  const out: string[] = []
  let inFence = false
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('```')) inFence = !inFence
    if (!inFence && stop.test(line)) break
    out.push(line)
  }
  return out.join('\n')
}

/**
 * Prosa do corpo: sem fences e sem comentarios HTML. O exemplo preenchido (fence) e o ponteiro para a
 * fonte (comentario) repetem os tokens das linhas de checkbox — sem isto, apagar o checkbox e deixar o
 * exemplo faria a assercao passar (G5, compound 2026-05-12-validator-regex-hits-comments).
 */
// 2026-09-08 (Luiz/dev): assercao de contrato roda sobre prosa, nunca sobre exemplo — PRD tdd-cycle-contract §RF-04 (DP-2)
const prose = (body: string) => body.replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '')

const readme = read('skills/plan-feature/templates/plan-readme-template.md')

describe('tdd-workflow — a fonte unica do ciclo (RF-01)', () => {
  // Ancorado em inicio de linha: `includes('## Contrato do Ciclo por Fase')` casaria com uma mencao em
  // prosa ou num comentario e passaria vacuamente (licao do grill-me-contract, G5).
  test('a skill tem a secao "## Contrato do Ciclo por Fase"', () => {
    expect(
      /^## Contrato do Ciclo por Fase/m.test(skill),
      `[parity gate "nunca diminuir" — RF-01] Secao "## Contrato do Ciclo por Fase" ausente de ` +
        `skills/tdd-workflow/SKILL.md. E a UNICA definicao do ciclo por fase: fase-template.md, ` +
        `plan-executor.md e o Step 4c do execute-plan apontam para ela em vez de parafrasea-la. ` +
        `Sem ela cada consumidor volta a ter a sua versao do ciclo — a divergencia que o PRD ` +
        `tdd-cycle-contract existe para acabar. Restaure a secao, nao remova esta assercao.`,
    ).toBe(true)
  })
})

describe('fase-template — bloco "### TDD" (RF-02)', () => {
  const tdd = () => prose(section(template, '### TDD'))

  test('o bloco declara o tipo da fase com as tres opcoes (D5)', () => {
    const body = tdd()
    expect(
      /^\*\*Tipo de fase:\*\*/m.test(body),
      `[parity gate "nunca diminuir" — RF-02] Campo "**Tipo de fase:**" ausente do bloco "### TDD" de ` +
        `fase-template.md. E o tipo que decide a variante do ciclo (Contrato do Ciclo por Fase): sem ele ` +
        `o orquestrador nao sabe onde parar para o humano nem que forma o RED-check toma.`,
    ).toBe(true)
    for (const tipo of ['comportamento', 'risco', 'sem-comportamento']) {
      expect(
        body.includes(tipo),
        `[parity gate "nunca diminuir" — RF-02 / D5] Tipo de fase "${tipo}" sumiu do bloco "### TDD". ` +
          `Os tres tipos sao o contrato: 189 de 443 fases nao tinham RED porque "doc/config" ficava fora ` +
          `do ciclo — "sem-comportamento" existe para que essas fases tenham gate textual falsificavel.`,
      ).toBe(true)
    }
  })

  test.each([
    ['**RED:**', 'teste que falha por assertion, stub-first'],
    ['**GREEN:**', 'codigo minimo, subagente isolado'],
    ['**RED-check:**', 'a defesa nomeada e mutada e o teste cai — unica prova de que o teste testa a defesa'],
    ['**REFACTOR:**', 'commit proprio com testes verdes, ou "sem refactor: motivo"'],
  ])('o bloco mantem o checkbox %s', (checkbox, why) => {
    expect(
      tdd().includes(checkbox),
      `[parity gate "nunca diminuir" — RF-02 / CA-01] Checkbox ${checkbox} ausente do bloco "### TDD" de ` +
        `fase-template.md — ${why}. Os quatro sao o ciclo inteiro; o template com dois (RED, GREEN) e ` +
        `exatamente o estado que o PRD tdd-cycle-contract mediu: REFACTOR em 46 de 443 fases, ` +
        `RED-check em 37. Restaure o checkbox, nao remova esta assercao.`,
    ).toBe(true)
  })

  test.each([
    ['Defesa a mutar:', 'qual linha/condicao o orquestrador remove ou inverte'],
    ['Teste que deve cair:', 'qual teste tem de falhar com a defesa removida'],
  ])('o RED-check carrega o campo "%s" (D6)', (campo, why) => {
    expect(
      tdd().includes(campo),
      `[parity gate "nunca diminuir" — RF-02 / D6] Campo "${campo}" ausente do RED-check em ` +
        `fase-template.md — ${why}. Sao os dois campos que o execute-plan (Step 4c, Plano 02) le para ` +
        `mutar; sem eles o RED-check vira "rodar os testes de novo".`,
    ).toBe(true)
  })

  test('o planejador e proibido de prever a mensagem de erro (D6)', () => {
    expect(
      /N[AÃ]O escrever a mensagem/i.test(tdd()),
      `[parity gate — RF-02 / D6] Sumiu do bloco "### TDD" a instrucao de NAO escrever a mensagem de erro ` +
        `esperada. Numero e mensagem previstos sao chute do planejador; em tres ocasioes o real divergiu ` +
        `e o incentivo era reportar o previsto (compound 2026-09-06). O que vale e qual assertion quebra.`,
    ).toBe(true)
  })

  test('fase de risco comeca pelo teste de abuso (Abuse-It)', () => {
    expect(
      /Abuse-It/.test(tdd()),
      `[parity gate — RF-02] O bloco "### TDD" deixou de dizer que, em fase de risco, o PRIMEIRO teste e o ` +
        `de abuso (Abuse-It, tdd-workflow). Sem isso o RED escreve so o happy path e a defesa nunca chega ao GREEN.`,
    ).toBe(true)
  })

  test('fase sem comportamento tem variante com gate textual (D5)', () => {
    expect(
      /gate textual/i.test(tdd()),
      `[parity gate — RF-02 / D5] A variante "sem-comportamento" (gate textual visto falhando; RED-check = ` +
        `remover o alvo, gate cai, restaurar) sumiu do bloco "### TDD". Isentar fases de doc/config do ciclo ` +
        `deixa 40% das fases sem verificacao falsificavel — foi a alternativa rejeitada em D5.`,
    ).toBe(true)
  })

  // Aqui o corpo CRU, de proposito: o ponteiro vive num comentario HTML.
  test('o bloco aponta para a secao-fonte na skill tdd-workflow (CA-03)', () => {
    const raw = section(template, '### TDD')
    expect(
      /<!--[\s\S]*?skills\/tdd-workflow\/SKILL\.md[\s\S]*?Contrato do Ciclo por Fase[\s\S]*?-->/.test(raw),
      `[parity gate — RF-02 / CA-03 / D1] O comentario HTML que aponta de fase-template.md para ` +
        `skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" sumiu. O template e consumidor, nao ` +
        `definicao; sem o ponteiro ele volta a ser a segunda copia do ciclo.`,
    ).toBe(true)
  })
})

describe('plan-readme-template — §TDD Strategy aponta para a fonte (D1)', () => {
  test('o bloco existe e cita a secao-fonte pelo caminho', () => {
    const body = section(readme, '## TDD Strategy')
    expect(
      body.includes('skills/tdd-workflow/SKILL.md') && body.includes('Contrato do Ciclo por Fase'),
      `[parity gate — D1] "## TDD Strategy" de plan-readme-template.md nao aponta para ` +
        `skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" (ou o bloco sumiu — section() devolve ''). ` +
        `Era a terceira copia do ciclo (PLAN.md §Risks); copia que fica e a divergencia que este PRD existe para acabar.`,
    ).toBe(true)
  })
})
