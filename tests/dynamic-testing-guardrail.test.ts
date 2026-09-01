// 2026-09-01 (Luiz/dev): Plano 03 fase-01 — CA-06 e dealbreaker do PRD.
//
// Este e o unico gate do Plano 03, e existe por um motivo especifico: o guardrail de autorizacao
// e o unico conteudo desta feature cuja REMOCAO NAO PRODUZ SINTOMA. Some a secao, o procedimento
// continua rodando — so que sem validar o alvo. O sintoma aparece no dia em que um request sai
// para um host que nao era para ser alvo.
//
// Assere apenas **contrato** — o que nao pode mudar em silencio. Prosa muda; contrato nao.
//
// ─────────────────────────────────────────────────────────────────────────────
// O que este arquivo deliberadamente NAO testa (silenciar le como cobertura completa):
//
//   - que o agente OBEDECE o guardrail em runtime — comportamento de LLM, nao verificavel aqui
//   - que os comandos curl do passe passivo funcionam — exigiria dev server; ver Plano 03 fase-02
//   - a qualidade dos canarios ou a completude dos checks — prosa, muda a cada revisao
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const DOC = path.join(
  import.meta.dir, '..', 'skills', 'security', 'references', 'dynamic-testing.md',
)

/**
 * Leitura defensiva de proposito (G13): arquivo ausente vira string vazia, para que o RED
 * falhe por ASSERTION com a mensagem do parity gate — nao por ENOENT no carregamento do modulo.
 * CRLF normalizado: repo Windows, compound 2026-05-19-crlf-breaks-frontmatter-regex.md (G15).
 */
const doc = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf-8').replace(/\r/g, '') : ''

/** Corpo de uma secao `## Titulo` ate o proximo `## ` de topo, ignorando headings dentro de fences. */
function section(matcher: RegExp): string {
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => l.startsWith('## ') && matcher.test(l))
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

const GATE = '[parity gate "nunca diminuir" — CA-06]'

describe('dynamic-testing — o documento existe', () => {
  test('a referencia de teste dinamico esta no lugar', () => {
    expect(
      doc.length > 0,
      `${GATE} skills/security/references/dynamic-testing.md ausente ou vazio. ` +
        'Sem ele, o passe dinamico do verify-work aponta para o vazio. Restaure o arquivo.',
    ).toBe(true)
  })
})

describe('dynamic-testing — o guardrail de autorizacao (CA-06)', () => {
  // Ancorado no CONTEUDO, nao no token do heading (G14): `## Autorizacao REMOVIDA` casaria
  // com um includes ingenuo e passaria vacuamente.
  const auth = section(/Autoriza/i)

  test('a secao de autorizacao e a PRIMEIRA secao do documento', () => {
    const firstH2 = doc.indexOf('\n## ')
    const authH2 = doc.search(/\n## [^\n]*Autoriza/i)
    expect(
      authH2 !== -1 && authH2 === firstH2,
      `${GATE} A autorizacao deixou de ser a primeira secao. O guardrail vem ANTES de qualquer ` +
        'procedimento — quem le de cima para baixo tem que bater no limite antes do comando. ' +
        'Mova a secao de volta para o topo, nao remova esta assercao.',
    ).toBe(true)
  })

  test('a autorizacao precede o primeiro comando curl do documento', () => {
    const firstCurl = doc.indexOf('curl')
    const authH2 = doc.search(/\n## [^\n]*Autoriza/i)
    expect(
      authH2 !== -1 && (firstCurl === -1 || authH2 < firstCurl),
      `${GATE} Ha comando curl antes da secao de autorizacao. Nenhum request e descrito antes ` +
        'de o alvo permitido estar definido. Reordene, nao remova esta assercao.',
    ).toBe(true)
  })

  test('o vocabulario de host permitido continua explicito', () => {
    for (const host of ['localhost', '127.0.0.1']) {
      expect(
        auth.includes(host),
        `${GATE} Host permitido ausente da secao de autorizacao: ${host}. A allowlist e o que ` +
          'distingue auditar o proprio app de apontar a ferramenta para outro lugar. Restaure o item.',
      ).toBe(true)
    }
  })

  test('a recusa a host nao autorizado continua escrita', () => {
    expect(
      /n[aã]o executa/i.test(auth),
      `${GATE} A recusa explicita ("nao executa") sumiu da secao de autorizacao. Sem ela a secao ` +
        'vira recomendacao, e recomendacao nao e guardrail. Restaure a regra.',
    ).toBe(true)
  })
})

describe('dynamic-testing — criterio de sucesso invertido e regra de parada', () => {
  test('sucesso continua sendo "a defesa rejeitou" e a parada continua obrigatoria', () => {
    expect(
      /rejeit/i.test(doc) && /\bPARE\b/.test(doc),
      `${GATE} Sumiu o criterio de sucesso invertido ("a defesa REJEITOU") ou a regra de parada ` +
        '("PARE e reporte"). Sao as duas frases que separam verificacao de exploracao. Restaure-as.',
    ).toBe(true)
  })
})

describe('dynamic-testing — limites explicitos', () => {
  // Cinco classes proibidas. Se uma sumir, o passe cresce de escopo em silencio.
  const LIMITS: Array<[string, RegExp]> = [
    ['fuzzing em escala', /fuzzing/i],
    ['enumeracao de usuarios', /enumera/i],
    ['teste de carga / DoS', /(carga|DoS)/],
    ['bypass de autenticacao', /bypass/i],
    ['persistir payload em banco compartilhado', /banco compartilhado/i],
  ]

  test.each(LIMITS)('limite "%s" continua declarado', (nome, re) => {
    expect(
      re.test(doc),
      `${GATE} Limite ausente do documento: ${nome}. Cada limite removido e escopo que o passe ` +
        'ganha sem ninguem decidir. Restaure a linha, nao remova esta assercao.',
    ).toBe(true)
  })
})
