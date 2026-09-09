// 2026-09-09 (Luiz/dev): ADR-0023 — o pre-commit estava morto e o conserto obvio quebraria tudo.
//
// Ele lia `process.env.CLAUDE_TOOL_INPUT`, variavel que o Claude Code nunca preenche (o payload
// chega por stdin). A string vinha vazia sempre, o teste de conteudo falhava e o guard saia com 0
// sem rodar nada. Ninguem percebeu porque falhava ABRINDO.
//
// Duas armadilhas no conserto, e as duas so aparecem quando o hook volta a funcionar:
//
//   1. Ele chamava `bun run lint`, script que NAO EXISTE neste repo. No dia em que o hook
//      funcionasse, o execSync lancaria, o catch trataria como "testes falharam" e TODO commit
//      passaria a ser bloqueado.
//   2. O contrato do ciclo TDD EXIGE commitar com teste vermelho (o commit do RED). Um pre-commit
//      que roda a suite inteira e bloqueia no vermelho torna o proprio ciclo impossivel.
//
// Por isso a decisao e uma funcao pura com `runSuite` injetado: da para provar as duas direcoes
// sem rodar 2200 testes dentro de um teste.
import { describe, it, expect } from 'bun:test'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { decide } = require('../../hooks/lib/precommit-decision.cjs')

type Suite = { ok: boolean; ran: boolean; error?: string }

function suiteThat(result: Omit<Suite, 'ran'>) {
  const state: Suite = { ...result, ran: false }
  return {
    state,
    run: () => { state.ran = true; return { ok: result.ok, error: result.error } },
  }
}

describe('pre-commit: so entra em acao em commit de verdade', () => {
  it('permite comando que nao e git commit, sem rodar a suite', () => {
    const suite = suiteThat({ ok: false })
    const r = decide({ command: 'git status', phase: null, runSuite: suite.run })
    expect(r.action).toBe('allow')
    expect(suite.state.ran).toBe(false)
  })
})

describe('pre-commit: a fase RED tem passe livre', () => {
  // DEFESA A MUTAR: o ramo que devolve allow quando a fase e `red`.
  // Sem ele o pre-commit bloqueia o commit do RED, que o contrato do ciclo EXIGE. O gate mataria
  // o ciclo que ele existe para proteger.
  it('permite o commit do RED sem rodar a suite', () => {
    const suite = suiteThat({ ok: false })
    const r = decide({ command: 'git commit -m "test: red da fase-01"', phase: 'red', runSuite: suite.run })
    expect(r.action).toBe('allow')
    expect(suite.state.ran).toBe(false)
  })
})

describe('pre-commit: fora do RED, a suite decide', () => {
  it('roda a suite e permite quando ela passa', () => {
    const suite = suiteThat({ ok: true })
    const r = decide({ command: 'git commit -m "feat: x"', phase: 'green', runSuite: suite.run })
    expect(suite.state.ran).toBe(true)
    expect(r.action).toBe('allow')
  })

  // DEFESA A MUTAR: o bloqueio quando a suite reprova.
  it('bloqueia quando a suite reprova', () => {
    const suite = suiteThat({ ok: false, error: '3 fail' })
    const r = decide({ command: 'git commit -m "feat: x"', phase: 'green', runSuite: suite.run })
    expect(r.action).toBe('block')
    expect(r.reason).toContain('3 fail')
  })

  it('trata ausencia de ancora como fora do RED', () => {
    const suite = suiteThat({ ok: false, error: 'falhou' })
    const r = decide({ command: 'git commit -m "chore: y"', phase: null, runSuite: suite.run })
    expect(suite.state.ran).toBe(true)
    expect(r.action).toBe('block')
  })
})

describe('pre-commit: falha aberta quando a suite nao pode rodar', () => {
  // DEFESA A MUTAR: distinguir "a suite reprovou" de "a suite nao rodou".
  // Se as duas caem no mesmo ramo, um script ausente ou um timeout sob carga bloqueia todo commit
  // do repo. Foi essa confusao que deixou uma chamada a `bun run lint` — script inexistente — de
  // pe por meses dentro de um hook que ninguem executava.
  it('permite, com diagnostico, quando a suite nao pode ser executada', () => {
    const suite = { run: () => { throw new Error('Script not found "lint"') } }
    const r = decide({ command: 'git commit -m "feat: x"', phase: 'green', runSuite: suite.run })
    expect(r.action).toBe('allow')
    expect(r.reason).toContain('Script not found')
  })
})
