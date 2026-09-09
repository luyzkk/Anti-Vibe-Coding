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

/**
 * Atalho para `prose(section(doc, heading))` — a composicao que tres describes repetiam (RF-02, RF-06).
 * NAO serve para conteudo dentro de fence (as regras do Step 9 em plan-feature/SKILL.md vivem num bloco
 * cercado — prose() as apagaria, G12) nem para o ponteiro em comentario HTML do bloco "### TDD" (a
 * assercao roda sobre o corpo cru de proposito). Esses dois continuam com section() puro.
 */
// 2026-09-08 (Luiz/dev): refactor puro — comportamento das 21 assercoes nao muda (PRD tdd-cycle-contract, fase-03)
const body = (doc: string, heading: string) => prose(section(doc, heading))

const readme = read('skills/plan-feature/templates/plan-readme-template.md')
const executor = read('agents/plan-executor.md')
const planFeature = read('skills/plan-feature/SKILL.md')

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
  const tdd = () => body(template, '### TDD')

  test('o bloco declara o tipo da fase com as tres opcoes (D5)', () => {
    const texto = tdd()
    expect(
      /^\*\*Tipo de fase:\*\*/m.test(texto),
      `[parity gate "nunca diminuir" — RF-02] Campo "**Tipo de fase:**" ausente do bloco "### TDD" de ` +
        `fase-template.md. E o tipo que decide a variante do ciclo (Contrato do Ciclo por Fase): sem ele ` +
        `o orquestrador nao sabe onde parar para o humano nem que forma o RED-check toma.`,
    ).toBe(true)
    for (const tipo of ['comportamento', 'risco', 'sem-comportamento']) {
      expect(
        texto.includes(tipo),
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
      `[parity gate "nunca diminuir" — RF-02 / D6] Sumiu do bloco "### TDD" a instrucao de NAO escrever a mensagem de erro ` +
        `esperada. Numero e mensagem previstos sao chute do planejador; em tres ocasioes o real divergiu ` +
        `e o incentivo era reportar o previsto (compound 2026-09-06). O que vale e qual assertion quebra.`,
    ).toBe(true)
  })

  test('fase de risco comeca pelo teste de abuso (Abuse-It)', () => {
    expect(
      /Abuse-It/.test(tdd()),
      `[parity gate "nunca diminuir" — RF-02] O bloco "### TDD" deixou de dizer que, em fase de risco, o PRIMEIRO teste e o ` +
        `de abuso (Abuse-It, tdd-workflow). Sem isso o RED escreve so o happy path e a defesa nunca chega ao GREEN.`,
    ).toBe(true)
  })

  test('fase sem comportamento tem variante com gate textual (D5)', () => {
    expect(
      /gate textual/i.test(tdd()),
      `[parity gate "nunca diminuir" — RF-02 / D5] A variante "sem-comportamento" (gate textual visto falhando; RED-check = ` +
        `remover o alvo, gate cai, restaurar) sumiu do bloco "### TDD". Isentar fases de doc/config do ciclo ` +
        `deixa 40% das fases sem verificacao falsificavel — foi a alternativa rejeitada em D5.`,
    ).toBe(true)
  })

  // Aqui o corpo CRU, de proposito: o ponteiro vive num comentario HTML.
  test('o bloco aponta para a secao-fonte na skill tdd-workflow (CA-03)', () => {
    const raw = section(template, '### TDD')
    expect(
      /<!--[\s\S]*?skills\/tdd-workflow\/SKILL\.md[\s\S]*?Contrato do Ciclo por Fase[\s\S]*?-->/.test(raw),
      `[parity gate "nunca diminuir" — RF-02 / CA-03 / D1] O comentario HTML que aponta de fase-template.md para ` +
        `skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" sumiu. O template e consumidor, nao ` +
        `definicao; sem o ponteiro ele volta a ser a segunda copia do ciclo.`,
    ).toBe(true)
  })
})

describe('plan-readme-template — §TDD Strategy aponta para a fonte (D1)', () => {
  test('o bloco existe e cita a secao-fonte pelo caminho', () => {
    const secao = section(readme, '## TDD Strategy')
    expect(
      secao.includes('skills/tdd-workflow/SKILL.md') && secao.includes('Contrato do Ciclo por Fase'),
      `[parity gate "nunca diminuir" — D1] "## TDD Strategy" de plan-readme-template.md nao aponta para ` +
        `skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" (ou o bloco sumiu — section() devolve ''). ` +
        `Era a terceira copia do ciclo (PLAN.md §Risks); copia que fica e a divergencia que este PRD existe para acabar.`,
    ).toBe(true)
  })
})

describe('plan-executor — §TDD aponta para a fonte e incorpora os compounds (RF-06)', () => {
  const tdd = () => body(executor, '## TDD no Ciclo Red-Green-Refactor')

  test('a secao cita a secao-fonte pelo caminho (CA-03, D1)', () => {
    const texto = tdd()
    expect(
      texto.includes('skills/tdd-workflow/SKILL.md') && texto.includes('Contrato do Ciclo por Fase'),
      `[parity gate "nunca diminuir" — RF-06 / CA-03] "## TDD no Ciclo Red-Green-Refactor" de agents/plan-executor.md nao ` +
        `aponta para skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" (ou a secao sumiu — ` +
        `section() devolve ''). O executor e consumidor do ciclo, nao a segunda definicao dele.`,
    ).toBe(true)
  })

  // 2026-09-08 (Luiz/dev): rotulo string na 1a posicao — %s nao interpola RegExp, os 3 titulos saiam
  // identicos ("a secao mantem a regra %s") e o RED-check nao conseguia nomear qual teste deve cair
  test.each([
    ['stub-first', /stub/i, 'stub-first: o RED falha por assertion, nunca por Cannot find module (compound 2026-05-19)'],
    ['nasce-verde', /nasce verde/i, 'teste que nasce verde exige mutacao no mesmo passo (compound 2026-09-06)'],
    ['defesa-implementada', /defesa-implementada/, 'o executor nomeia em payload.checks[] a defesa que o orquestrador vai mutar (D3)'],
  ])('a secao mantem a regra %s', (label, re, why) => {
    expect(
      re.test(tdd()),
      `[parity gate "nunca diminuir" — RF-06] Sumiu da secao TDD do plan-executor: ${why}. ` +
        `Ate esta feature isso vivia so em docs/compound/ — e compound nao e prompt. Restaure o texto.`,
    ).toBe(true)
  })

  test('o REFACTOR e commit proprio, separado do feat (D4, CA-08)', () => {
    const refactor = body(executor, '### REFACTOR')
    expect(
      refactor.length > 0 && /commit/i.test(refactor) && /refactor\(/.test(refactor),
      `[parity gate "nunca diminuir" — RF-06 / D4 / CA-08] A subsecao "### REFACTOR" do plan-executor nao exige commit ` +
        `refactor(...) proprio (ou sumiu). D4: o mesmo subagente GREEN refatora como segundo passo, em ` +
        `commit separado — refactor escondido no feat(...) e o que "Refactor Fica no Ciclo" chama de ` +
        `problema de granularidade de commit.`,
    ).toBe(true)
  })
})

describe('plan-feature — Step 9 obriga a nomear a defesa e proibe prever a mensagem (RF-07)', () => {
  // 2026-09-08 (Luiz/dev): corpo CRU, sem prose() — as regras do Step 9 vivem DENTRO de um fence
  // (skills/plan-feature/SKILL.md:747-757). prose() as apagaria e o teste passaria/reprovaria pelo
  // motivo errado — inverso do G5 (DP-2 / G12 do Plano 01). PRD tdd-cycle-contract §RF-07
  const regras = () => section(planFeature, '### Regras do subagente de planejamento')

  test.each([
    ['Defesa a mutar', 'qual linha/condicao o orquestrador remove ou inverte'],
    ['Teste que deve cair', 'qual teste tem de falhar com a defesa removida'],
  ])('as regras exigem preencher "%s" em fase de comportamento ou risco', (campo, why) => {
    expect(
      regras().includes(campo),
      `[parity gate "nunca diminuir" — RF-07 / D6] "${campo}" ausente das regras do subagente de planejamento (Step 9 do ` +
        `plan-feature) — ${why}. O template pede o campo (fase-02), mas quem o preenche e o planejador: ` +
        `sem a regra ele volta a escrever RED/GREEN e parar.`,
    ).toBe(true)
  })

  test('as regras proibem prever a mensagem de erro (D6)', () => {
    expect(
      /prever a mensagem/i.test(regras()),
      `[parity gate "nunca diminuir" — RF-07 / D6] Sumiu do Step 9 a proibicao de prever a mensagem de erro do RED. ` +
        `Numero e mensagem previstos sao chute; em tres ocasioes o real divergiu e o incentivo era ` +
        `reportar o previsto (compound 2026-09-06). O planejador nomeia a assertion que quebra.`,
    ).toBe(true)
  })
})

// 2026-09-08 (Luiz/dev): Step 4c executa o contrato — PRD tdd-cycle-contract §RF-03, §RF-08, D2.
// O 4c e um bloco cercado de pseudo-codigo: prose() o apagaria. section() cru, de proposito.
const executePlan = read('skills/execute-plan/SKILL.md')
const waveExecution = read('skills/execute-plan/references/wave-execution.md')

describe('execute-plan — Step 4c resolve o nivel, confirma o RED e para no gate (RF-03 parte 1, RF-08)', () => {
  const step4c = section(executePlan, '### 4c.')

  test('4c aponta para a secao-fonte do ciclo', () => {
    expect(
      step4c,
      `[parity gate "nunca diminuir" — RF-03] O Step 4c nao cita "Contrato do Ciclo por Fase". ` +
        `O 4c EXECUTA o ciclo; a definicao mora em skills/tdd-workflow/SKILL.md. Sem o ponteiro, ` +
        `o executor volta a ter a segunda definicao que este PRD existe para apagar.`,
    ).toContain('Contrato do Ciclo por Fase')
  })

  test('4c resolve o nivel por --tdd-level, user_profile e default Assistido (D2)', () => {
    expect(step4c, '[parity gate — RF-08] 4c nao le --tdd-level').toContain('--tdd-level')
    expect(step4c, '[parity gate — RF-03] 4c nao le user_profile (sinal que tdd-workflow ja usa)').toContain('user_profile')
    expect(
      step4c,
      `[parity gate — D2] 4c perdeu o default Assistido. Assistido para em [RISCO] e no tracer ` +
        `bullet — e onde a spec errada morre barato. Restaure a linha do default, nao esta assercao.`,
    ).toMatch(/Assistido[^\n]*default|default[^\n]*Assistido/)
  })

  test('4c exige que o orquestrador confirme a falha do RED por assertion e bloqueie module-not-found (CA-04)', () => {
    expect(step4c, '[parity gate — CA-04] 4c nao registra red_confirmed').toContain('red_confirmed')
    expect(step4c, '[parity gate — CA-04] 4c nao classifica a falha por assertion').toMatch(/red_confirmed: assertion/)
    expect(
      step4c,
      `[parity gate "nunca diminuir" — CA-04] 4c perdeu a regra que classifica saida com marcador ` +
        `de modulo/compilacao (Cannot find module, Cannot resolve, error TS, SyntaxError) como ` +
        `red_confirmed: blocked. Falha por import nao e RED — e ausencia de stub (compound ` +
        `2026-05-19-tdd-gate-needs-stub-first). Assercao ancorada no par condicao-desfecho, nao no ` +
        `token solto: um toContain('Cannot find module') isolado fica verde mesmo com a regra ` +
        `inteira apagada, porque a mesma frase reaparece dentro da propria mensagem de bloqueio ` +
        `("Sinal Cannot find module") — vacuo confirmado por mutacao em 2026-09-08. Restaure a ` +
        `linha da regra, nao afrouxe esta assercao de volta a um toContain solto.`,
    ).toMatch(/`Cannot find module`[\s\S]*?red_confirmed: blocked/)
    expect(
      step4c,
      `[parity gate "nunca diminuir" — CA-04] O bloqueio red_confirmed: blocked perdeu o ponteiro ` +
        `para tdd-cycle-checklist. Sem ele o executor devolve ao RED sem dizer o que corrigir — ` +
        `stub-first vira um segredo que so quem escreveu o contrato conhece. Assercao ancorada no ` +
        `par red_confirmed: blocked seguido de tdd-cycle-checklist, nao no token solto: um ` +
        `toContain('tdd-cycle-checklist') isolado fica verde mesmo com a mensagem de bloqueio ` +
        `apagada, porque o mesmo token tambem aponta o passo 1 (RED) mais acima no bloco — vacuo ` +
        `confirmado por mutacao em 2026-09-08. Restaure a mensagem do bloqueio, nao afrouxe esta ` +
        `assercao de volta a um toContain solto.`,
    ).toMatch(/red_confirmed: blocked[\s\S]*?tdd-cycle-checklist/)
  })

  test('4c para no gate humano com AskUserQuestion e registra human_gate (CA-05)', () => {
    expect(step4c, '[parity gate — CA-05] 4c nao para para o humano').toContain('AskUserQuestion')
    expect(
      step4c,
      `[parity gate "nunca diminuir" — CA-05] 4c perdeu o ramo "human_gate: stopped". CA-05 e ` +
        `bilateral: dado [RISCO] (ou guiado), o orquestrador para; dado fase sem marca, nao para. ` +
        `Uma assercao que aceita so um dos dois ramos nao guarda o criterio — restaure a linha ` +
        `"Registrar: human_gate: stopped", nao remova esta assercao.`,
    ).toContain('human_gate: stopped')
    expect(
      step4c,
      `[parity gate "nunca diminuir" — CA-05] 4c perdeu o ramo "human_gate: skipped". Mesmo ` +
        `criterio bilateral do CA-05 pelo lado oposto: sem este ramo o 4c pode parar de anunciar ` +
        `quando NAO para, e a assercao do ramo "stopped" sozinha nao pegaria essa regressao. ` +
        `Restaure a linha "Senao: human_gate: skipped({nivel})", nao remova esta assercao.`,
    ).toContain('human_gate: skipped')
  })

  test('argument-hint do execute-plan aceita --tdd-level (RF-08)', () => {
    // G21: frontmatter nao tem heading — section() nao chega la.
    expect(
      executePlan,
      '[parity gate — RF-08] argument-hint do execute-plan nao anuncia --tdd-level',
    ).toMatch(/^argument-hint:.*--tdd-level/m)
  })

  test('wave-execution §Ciclo Completo aponta para a fonte', () => {
    expect(
      section(waveExecution, '### Ciclo Completo'),
      `[parity gate — RF-01] wave-execution.md §Ciclo Completo virou copia solta do ciclo. ` +
        `E resumo; a definicao e a secao-fonte da skill tdd-workflow.`,
    ).toContain('Contrato do Ciclo por Fase')
  })
})
