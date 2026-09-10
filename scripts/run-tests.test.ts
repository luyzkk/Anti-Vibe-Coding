// 2026-08-11 (Luiz/dev): RED — bun.exe no Windows tem limite de ~8191 chars de linha de comando
// (o do cmd.exe). Com 263 arquivos de teste a linha vai a 11.699 chars e `bun run test` morre com
// "Linha de comando muito longa". Medido: bun --version aceita 8.098 e falha em 8.131; `node` com
// a MESMA linha passa, entao o limite e do bun.exe, nao do CreateProcess.

import { describe, test, expect } from 'bun:test'

import {
  chunkByCommandLength,
  aggregateExitCode,
  SPAWN_BUDGET,
  collectCjsTests,
  usesBunTest,
  partitionCjs,
  runStandalone,
} from './run-tests'

const PREFIXO = ['bun', 'test']

function comprimentoDaLinha(chunk: string[]): number {
  return [...PREFIXO, ...chunk].join(' ').length
}

describe('chunkByCommandLength', () => {
  test('mantem cada lote abaixo do orcamento', () => {
    const files = Array.from({ length: 400 }, (_, i) => `skills/algum-nome-de-skill/lib/arquivo-${i}.test.ts`)

    for (const chunk of chunkByCommandLength(files, PREFIXO, SPAWN_BUDGET)) {
      expect(comprimentoDaLinha(chunk)).toBeLessThanOrEqual(SPAWN_BUDGET)
    }
  })

  test('preserva todos os arquivos exatamente uma vez e na ordem', () => {
    const files = Array.from({ length: 400 }, (_, i) => `tests/arquivo-${i}.test.ts`)

    const achatado = chunkByCommandLength(files, PREFIXO, SPAWN_BUDGET).flat()

    expect(achatado).toEqual(files)
  })

  test('nunca emite lote vazio', () => {
    const files = Array.from({ length: 400 }, (_, i) => `tests/arquivo-${i}.test.ts`)

    for (const chunk of chunkByCommandLength(files, PREFIXO, SPAWN_BUDGET)) {
      expect(chunk.length).toBeGreaterThan(0)
    }
  })

  test('mantem arquivo unico maior que o orcamento em vez de descarta-lo', () => {
    const gigante = `tests/${'x'.repeat(300)}.test.ts`

    const chunks = chunkByCommandLength([gigante], PREFIXO, 50)

    expect(chunks).toEqual([[gigante]])
  })

  test('devolve zero lotes para lista vazia', () => {
    expect(chunkByCommandLength([], PREFIXO, SPAWN_BUDGET)).toEqual([])
  })

  test('cabe em um unico lote quando a lista e pequena', () => {
    const files = ['tests/a.test.ts', 'tests/b.test.ts']

    expect(chunkByCommandLength(files, PREFIXO, SPAWN_BUDGET)).toEqual([files])
  })

  test('divide os 263 arquivos reais do repo em lotes que o bun aceita', () => {
    // reproduz o caso que quebrou: paths reais, ~11.699 chars numa linha so
    const files = Array.from({ length: 263 }, (_, i) => `skills/init/lib/steps/__tests__/step-${i}.test.ts`)

    const chunks = chunkByCommandLength(files, PREFIXO, SPAWN_BUDGET)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.flat()).toHaveLength(263)
  })
})

describe('aggregateExitCode', () => {
  test('devolve zero quando todo lote passa', () => {
    expect(aggregateExitCode([0, 0, 0])).toBe(0)
  })

  test('propaga falha de qualquer lote', () => {
    expect(aggregateExitCode([0, 1, 0])).toBe(1)
  })

  test('preserva o primeiro codigo de falha em vez de normalizar para 1', () => {
    expect(aggregateExitCode([0, 3, 1])).toBe(3)
  })

  test('devolve zero para lista vazia', () => {
    expect(aggregateExitCode([])).toBe(0)
  })
})

// 2026-09-10 (Luiz/dev): RED — os arquivos `*.test.cjs` NAO rodavam na suite. Os PATTERNS do runner
// so casam `.ts`/`.tsx`, entao quatro arquivos de teste do plugin eram invisiveis para
// `bun run test`: o do guard destrutivo e os tres de `hooks/`.
//
// Rodar `bun test tests/hooks/` dava a impressao contraria — imprimia "30/30 passed" e saia 0 — mas
// so aquele arquivo rodava, e pelo pior motivo: ele e um script standalone com `process.exit(0)` no
// topo do escopo, entao MATA o processo do bun antes dos outros seis arquivos do diretorio. Falsa
// confianca nas duas pontas: quem roda a suite nao executa o arquivo, e quem roda o diretorio
// executa so ele.
describe('collectCjsTests — os .test.cjs que a suite ignorava', () => {
  test('encontra o teste do guard destrutivo', async () => {
    expect(await collectCjsTests()).toContain('tests/hooks/pre-tool-use-destructive-guard.test.cjs')
  })

  test('encontra os testes de hooks/', async () => {
    const files = await collectCjsTests()
    for (const esperado of [
      'hooks/state-md-hook.test.cjs',
      'hooks/stop-reflector.test.cjs',
      'hooks/user-prompt-gate.test.cjs',
    ]) {
      expect(files).toContain(esperado)
    }
  })

  // `claude-code/` e material arquivado, com 130+ `.test.cjs` que nao sao deste plugin. Os padroes
  // de `.ts` ja o excluem pelo prefixo; os de `.cjs` precisam excluir do mesmo jeito.
  test('nao arrasta o arquivo claude-code/ junto', async () => {
    expect((await collectCjsTests()).filter((f) => f.includes('claude-code/'))).toEqual([])
  })
})

// A extensao nao diz qual runner o arquivo quer. Descoberto RODANDO: a primeira versao deste
// conserto mandava os quatro para o `node`, e `hooks/state-md-hook.test.cjs` passou a falhar na
// suite com "Cannot find module 'bun:test'". O desenho estava errado, e so a execucao mostrou.
describe('usesBunTest — classifica por conteudo, nao por extensao', () => {
  test('reconhece import e require de bun:test', () => {
    expect(usesBunTest("import { describe } from 'bun:test'")).toBe(true)
    expect(usesBunTest('const { test } = require("bun:test")')).toBe(true)
    expect(usesBunTest("const { test } = require( 'bun:test' )")).toBe(true)
  })

  test('nao confunde node:test com bun:test', () => {
    expect(usesBunTest("const { test } = require('node:test')")).toBe(false)
  })

  test('script puro, sem runner nenhum, nao e bun:test', () => {
    expect(usesBunTest("const { spawnSync } = require('child_process')\nprocess.exit(0)")).toBe(false)
  })
})

describe('partitionCjs — cada arquivo para o runner que sabe roda-lo', () => {
  const fonte: Record<string, string> = {
    'a.test.cjs': "import { test } from 'bun:test'",
    'b.test.cjs': "require('node:test')",
    'c.test.cjs': 'process.exit(0)',
  }

  test('separa os que precisam de bun dos que rodam sozinhos', () => {
    const { bunTest, standalone } = partitionCjs(Object.keys(fonte), (f) => fonte[f] ?? '')
    expect(bunTest).toEqual(['a.test.cjs'])
    expect(standalone).toEqual(['b.test.cjs', 'c.test.cjs'])
  })

  test('nao perde nem duplica arquivo', () => {
    const { bunTest, standalone } = partitionCjs(Object.keys(fonte), (f) => fonte[f] ?? '')
    expect([...bunTest, ...standalone].sort()).toEqual(Object.keys(fonte).sort())
  })
})

describe('runStandalone — um processo por arquivo', () => {
  test('roda cada arquivo no proprio processo, com node', async () => {
    const chamadas: string[][] = []
    const spawn = async (cmd: string[]) => {
      chamadas.push(cmd)
      return 0
    }

    await runStandalone(['a.test.cjs', 'b.test.cjs'], spawn)

    // DEFESA A MUTAR: um spawn por arquivo. Junta-los num processo so devolveria o bug original,
    // porque o `process.exit` do primeiro mataria os seguintes.
    expect(chamadas).toEqual([
      ['node', 'a.test.cjs'],
      ['node', 'b.test.cjs'],
    ])
  })

  test('devolve o codigo de saida de cada processo, na ordem', async () => {
    const codigos = [0, 2, 0]
    let i = 0
    const spawn = async () => codigos[i++] ?? 0

    expect(await runStandalone(['a.test.cjs', 'b.test.cjs', 'c.test.cjs'], spawn)).toEqual([0, 2, 0])
  })

  test('o codigo de falha sobrevive a agregacao', async () => {
    const spawn = async (cmd: string[]) => (cmd[1] === 'b.test.cjs' ? 2 : 0)
    expect(aggregateExitCode(await runStandalone(['a.test.cjs', 'b.test.cjs'], spawn))).toBe(2)
  })
})

// O script `test:e2e` do package.json ainda usa a forma por diretorio (`bun test tests/e2e/`), que
// e segura HOJE so porque nao ha `.cjs` ali. No dia em que houver, ele passa a truncar em silencio
// exatamente como `bun test tests/hooks/` fazia. Guard falsificavel em vez de nota que ninguem le.
describe('tests/e2e — a forma por diretorio so continua segura enquanto nao houver .cjs', () => {
  test('nenhum .test.cjs em tests/e2e', async () => {
    const cjs = (await collectCjsTests()).filter((f) => f.startsWith('tests/e2e/'))
    expect(
      cjs,
      `O script \`test:e2e\` roda \`bun test tests/e2e/\`. Com um .cjs ali, um \`process.exit\` no topo ` +
        `do escopo mata o processo e os demais arquivos somem da rodada com saida 0. Se este arquivo ` +
        `precisa existir, troque \`test:e2e\` por enumeracao explicita antes de adiciona-lo.`,
    ).toEqual([])
  })
})
