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
const { decide, suiteUnavailable, suiteTimedOut, precommitEnabled } = require('../../hooks/lib/precommit-decision.cjs')

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

describe('pre-commit: chave de desligar, como todo gate do plugin', () => {
  // DEFESA A MUTAR: o ramo que devolve allow quando `enabled` e false.
  // O TDD Gate tem `mode: off` e o caminho Bash tem `bash_path: off`. Um gate que roda a suite
  // inteira em TODO commit e nao pode ser desligado seria o unico obrigatorio do plugin — e gate
  // que atrapalha e desligado na marra, o que devolve o bypass de bandeja.
  it('permite sem rodar a suite quando o pre-commit esta desligado', () => {
    const suite = suiteThat({ ok: false, error: 'quebrada' })
    const r = decide({ command: 'git commit -m "feat: x"', phase: 'green', runSuite: suite.run, enabled: false })
    expect(r.action).toBe('allow')
    expect(suite.state.ran).toBe(false)
    expect(r.reason).toMatch(/desligad/i)
    // 2026-10-02 (Luiz/dev): achado pela sonda — desligado pelo env, o motivo dizia "config". O
    // motivo nomeia as duas chaves porque `decide` so recebe o booleano.
    expect(r.reason).toContain('ANTI_VIBE_PRECOMMIT=off')
  })

  // O outro lado do criterio bilateral: chave ausente NAO pode virar "desligado" por acidente.
  it('roda a suite quando a chave esta ausente — o default e ligado', () => {
    const suite = suiteThat({ ok: true })
    const r = decide({ command: 'git commit -m "feat: x"', phase: 'green', runSuite: suite.run })
    expect(suite.state.ran).toBe(true)
    expect(r.action).toBe('allow')
  })
})

describe('suiteUnavailable: distinguir "reprovou" de "nem existe suite"', () => {
  // 2026-09-10 (Luiz/dev): capturado de uma sonda real contra o cache 7.9.0, num diretorio sem
  // package.json. O `bun run test` nao acha o script, cai no `test.exe` do Git Bash que esta no
  // PATH, e ele sai com 1. Sem esta deteccao, o hook le "saiu != 0" como "a suite reprovou" e
  // BLOQUEIA TODO COMMIT de qualquer projeto que use o plugin e nao tenha script de teste.
  //
  // DEFESA A MUTAR: o reconhecimento da frase do bun para script ausente.
  const SAIDA_REAL = [
    'error: "C:\\Program Files\\Git\\usr\\bin\\test.exe" exited with code 1',
    'note: a package.json script "test" was not found',
  ].join('\n')

  it('reconhece a mensagem do bun para script de teste ausente', () => {
    expect(suiteUnavailable(SAIDA_REAL, {})).toBe(true)
  })

  it('reconhece o caso classico de script inexistente', () => {
    expect(suiteUnavailable('error: Script not found "lint"', {})).toBe(true)
  })

  it('reconhece binario ausente e processo morto por timeout', () => {
    expect(suiteUnavailable('', { code: 'ENOENT' })).toBe(true)
    expect(suiteUnavailable('', { killed: true })).toBe(true)
    expect(suiteUnavailable('', { signal: 'SIGTERM' })).toBe(true)
  })

  // O contrapeso: suite que REPROVOU de verdade nao pode virar "indisponivel", senao o gate para
  // de bloquear o que existe para bloquear.
  it('nao confunde suite vermelha com suite ausente', () => {
    const vermelha = '(fail) alguma coisa > falha de proposito\n 1 fail\n error: script "test" exited with code 1'
    expect(suiteUnavailable(vermelha, { status: 1 })).toBe(false)
  })

  // 2026-09-10 (Luiz/dev): REGRESSAO. A primeira versao desta funcao procurava tambem por
  // "no such file or directory" e "command not found" na saida INTEIRA. Numa suite de 2200 testes
  // essas frases aparecem por acaso — algum teste exercita caminho ausente e loga isso. Resultado
  // medido por sonda: suite genuinamente vermelha classificada como "nao pode ser executada", e o
  // gate PERMITIU o commit. Falso positivo aqui desliga o gate em silencio, que e pior que o bug
  // que a deteccao veio consertar.
  //
  // DEFESA A MUTAR: a ausencia de padroes genericos na lista.
  it('nao confunde suite vermelha que menciona arquivo ausente com suite ausente', () => {
    const vermelha = [
      '[run-tests] lote 1/2 — 176 arquivos',
      "(fail) algum teste > erro: ENOENT: no such file or directory, open 'x'",
      '(fail) outro teste > command not found: foo',
      ' 1 fail',
    ].join('\n')
    expect(suiteUnavailable(vermelha, { status: 1 })).toBe(false)
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

// 2026-10-02 (Luiz/dev): medido num projeto real. A suite de la leva ~155 s; o hook mata em 60 s,
// cai na falha aberta e libera. Desde 2026-09-10 cada commit custou ~1 min sem validar nada — ~10 h
// em tres semanas — e ninguem viu, porque o diagnostico ia para o stderr de um hook que sai com 0,
// e esse stderr so chega ao debug log. A chave global desligaria o gate de todos os projetos para
// resolver um.
describe('pre-commit: chave por projeto, pelo env', () => {
  // DEFESA A MUTAR: o ramo que le ANTI_VIBE_PRECOMMIT.
  it('desliga com ANTI_VIBE_PRECOMMIT=off mesmo com o config global ligado', () => {
    expect(precommitEnabled({ precommit: 'on' }, { ANTI_VIBE_PRECOMMIT: 'off' })).toBe(false)
  })

  it('continua desligando pelo config global, como antes', () => {
    expect(precommitEnabled({ precommit: 'off' }, {})).toBe(false)
  })

  // O outro lado: valor estranho no env nao pode virar gate desligado em silencio.
  it('so o literal off desliga — qualquer outro valor mantem ligado', () => {
    for (const valor of ['0', 'false', '', 'no']) {
      expect(precommitEnabled({ precommit: 'on' }, { ANTI_VIBE_PRECOMMIT: valor })).toBe(true)
    }
    expect(precommitEnabled({ precommit: 'on' }, {})).toBe(true)
  })
})

describe('pre-commit: timeout avisa o usuario', () => {
  it('suiteTimedOut reconhece processo morto, sinal e ETIMEDOUT — e so isso', () => {
    expect(suiteTimedOut({ killed: true })).toBe(true)
    expect(suiteTimedOut({ signal: 'SIGTERM' })).toBe(true)
    expect(suiteTimedOut({ code: 'ETIMEDOUT' })).toBe(true)
    expect(suiteTimedOut({ code: 'ENOENT' })).toBe(false)
    expect(suiteTimedOut({})).toBe(false)
  })

  // DEFESA A MUTAR: o `notice` no ramo do timeout.
  it('timeout permite com aviso de que o commit nao foi validado', () => {
    const suite = { run: () => { throw Object.assign(new Error('spawnSync cmd.exe ETIMEDOUT'), { timedOut: true }) } }
    const r = decide({ command: 'git commit -m "feat: x"', phase: 'green', runSuite: suite.run })
    expect(r.action).toBe('allow')
    expect(r.notice).toMatch(/nao foi validado/i)
    expect(r.notice).toContain('60s')
    expect(r.notice).toContain('ANTI_VIBE_PRECOMMIT=off')
  })

  // Script ausente e projeto sem suite, nao suite lenta: avisar em todo commit seria ruido.
  it('suite ausente nao gera o aviso de timeout', () => {
    const suite = { run: () => { throw new Error('Script not found "test"') } }
    const r = decide({ command: 'git commit -m "feat: x"', phase: 'green', runSuite: suite.run })
    expect(r.action).toBe('allow')
    expect(r.notice).toBeUndefined()
  })
})
