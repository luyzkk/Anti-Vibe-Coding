// 2026-08-11 (Luiz/dev): RED — bun.exe no Windows tem limite de ~8191 chars de linha de comando
// (o do cmd.exe). Com 263 arquivos de teste a linha vai a 11.699 chars e `bun run test` morre com
// "Linha de comando muito longa". Medido: bun --version aceita 8.098 e falha em 8.131; `node` com
// a MESMA linha passa, entao o limite e do bun.exe, nao do CreateProcess.

import { describe, test, expect } from 'bun:test'

import { chunkByCommandLength, aggregateExitCode, SPAWN_BUDGET } from './run-tests'

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
