// 2026-09-09 (Luiz/dev): issue #82 — de que diretorio o comando Bash escreve.
//
// O gate resolvia o alvo contra o cwd da SESSAO. Um `cd outro/projeto && echo x > src/a.ts` fazia
// ele procurar o teste-irmao no projeto errado e bloquear escrita legitima. Estes testes fixam as
// duas metades do conserto: ler o `cd` que abre o comando, e traduzir caminho de estilo Git Bash
// no Windows.
//
// A plataforma e PARAMETRO, nao `process.platform`: sem isso o comportamento Windows so seria
// testavel no Windows, e o CI (Linux) passaria sem exercitar metade do fix.
import { describe, it, expect } from 'bun:test'
import path from 'node:path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { commandCwd, toNativePath } = require('../../hooks/lib/bash-cwd.cjs')

describe('toNativePath — caminho de estilo Git Bash no Windows', () => {
  it('traduz /f/tmp/x para F:\\tmp\\x no win32', () => {
    expect(toNativePath('/f/tmp/x', 'win32')).toBe('F:\\tmp\\x')
  })

  it('maiusculiza a letra do drive', () => {
    expect(toNativePath('/c/Users/luiz', 'win32')).toBe('C:\\Users\\luiz')
  })

  it('deixa intacto fora do win32 — em POSIX /f/tmp/x ja e um caminho valido', () => {
    expect(toNativePath('/f/tmp/x', 'linux')).toBe('/f/tmp/x')
  })

  it('nao toca em primeiro segmento com mais de uma letra: /foo/bar nao e drive', () => {
    expect(toNativePath('/foo/bar', 'win32')).toBe('/foo/bar')
  })

  it('nao toca em caminho que ja e nativo do Windows', () => {
    expect(toNativePath('F:/tmp/x', 'win32')).toBe('F:/tmp/x')
  })

  it('nao toca em caminho relativo', () => {
    expect(toNativePath('src/a.ts', 'win32')).toBe('src/a.ts')
  })
})

describe('commandCwd — o cd que abre o comando', () => {
  const SESSION = path.resolve('/sessao/projeto')

  it('devolve null quando o comando nao abre com cd — o chamador fica com o cwd da sessao', () => {
    expect(commandCwd('echo x > src/a.ts', SESSION, 'linux')).toBeNull()
  })

  it('le o cd de abertura', () => {
    expect(commandCwd('cd /tmp/outro && echo x > src/a.ts', SESSION, 'linux'))
      .toBe(path.resolve('/tmp/outro'))
  })

  it('resolve cd relativo contra o cwd da sessao', () => {
    expect(commandCwd('cd pacotes/api && echo x > src/a.ts', SESSION, 'linux'))
      .toBe(path.resolve(SESSION, 'pacotes/api'))
  })

  it('segue uma cadeia de cd, cada um relativo ao anterior', () => {
    expect(commandCwd('cd /tmp/a && cd b && echo x > src/c.ts', SESSION, 'linux'))
      .toBe(path.resolve('/tmp/a/b'))
  })

  it('aceita o caminho entre aspas', () => {
    expect(commandCwd('cd "/tmp/com espaco" && echo x > a.ts', SESSION, 'linux'))
      .toBe(path.resolve('/tmp/com espaco'))
  })

  it('aceita ; como separador, nao so &&', () => {
    expect(commandCwd('cd /tmp/outro ; echo x > a.ts', SESSION, 'linux'))
      .toBe(path.resolve('/tmp/outro'))
  })

  it('IGNORA cd no meio do comando — adivinhar qual etapa escreve seria chute (limite honesto)', () => {
    expect(commandCwd('echo x > a.ts && cd /tmp/outro && echo y > b.ts', SESSION, 'linux')).toBeNull()
  })

  it('traduz o caminho do cd no win32, senao o fix nao serve ao caso da issue', () => {
    expect(commandCwd('cd /f/tmp/projeto && echo x > src/a.ts', 'F:\\sessao', 'win32'))
      .toBe('F:\\tmp\\projeto')
  })
})
