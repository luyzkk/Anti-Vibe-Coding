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
  const tdd = () => section(template, '### TDD')

  test('o bloco mantem o checkbox REFACTOR', () => {
    expect(
      tdd().includes('**REFACTOR:**'),
      `[parity gate "nunca diminuir" — RF-02] Checkbox REFACTOR ausente do bloco "### TDD" de ` +
        `skills/plan-feature/templates/fase-template.md (ou o proprio heading "### TDD" sumiu — ` +
        `section() devolve '' nesse caso). Sem ele o REFACTOR volta a aparecer numa fase a cada cinco, ` +
        `por iniciativa do planejador (PRD §Problema: 46 de 443 fases). "Refactor Fica no Ciclo" e a ` +
        `posicao registrada na skill tdd-workflow; o template e onde ela vira contrato de toda fase.`,
    ).toBe(true)
  })
})
