#!/usr/bin/env bun
// Wrapper that scans test files outside the claude-code/ archive and feeds them to bun test.
// bun test's positional args are substring filters (not directory scopes), so "tests/" matches
// claude-code/get-shit-done/tests/ too. This script enumerates the real test files explicitly.
//
// 2026-08-11 (Luiz/dev): passa os arquivos em lotes porque o bun.exe no Windows tem limite de
// ~8191 chars de linha de comando (o do cmd.exe). Com 263 arquivos a linha vai a 11.699 chars e o
// processo morre com "Linha de comando muito longa" antes de rodar teste nenhum.
// O limite e do bun.exe, nao do CreateProcess: medido nesta maquina (bun 1.3.9), `bun --version`
// aceita 8.098 chars e falha em 8.131, enquanto `node --version` com a MESMA linha passa.

import { readFileSync } from 'node:fs'

import { Glob } from 'bun'

/**
 * Teto de chars por linha de comando spawnada. O limite observado fica entre 8.098 e 8.131;
 * a folga cobre o binario resolvido por PATH (`bun` vira caminho absoluto) e o quoting do Windows.
 */
export const SPAWN_BUDGET = 7500

const PATTERNS = ['tests/**/*.test.{ts,tsx}', 'skills/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}']

/**
 * 2026-09-10 (Luiz/dev): os `*.test.cjs` do plugin nao rodavam na suite. Os PATTERNS acima so casam
 * `.ts`/`.tsx`, entao quatro arquivos de teste eram invisiveis para `bun run test` — o do guard
 * destrutivo e os tres de `hooks/`.
 *
 * `bun test tests/hooks/` dava a impressao contraria: imprimia "30/30 passed" e saia 0. Mas so
 * aquele arquivo rodava, e pelo pior motivo — ele e um script standalone com `process.exit(0)` no
 * topo do escopo, entao MATA o processo do bun antes dos outros seis arquivos do diretorio.
 *
 * A extensao `.cjs` nao diz qual runner o arquivo quer — `usesBunTest` abaixo classifica por
 * conteudo. Quem nao usa `bun:test` roda no PROPRIO processo, que e o que torna `process.exit`
 * correto ali em vez de destrutivo.
 *
 * O prefixo dos padroes exclui `claude-code/` por construcao, igual aos de `.ts`: aquele diretorio e
 * material arquivado, com 130+ `.test.cjs` que nao sao deste plugin.
 */
export const CJS_PATTERNS = ['tests/**/*.test.cjs', 'hooks/**/*.test.cjs']

/** Caminhos normalizados com `/` — no Windows o glob devolve `\`, e o resto do script compara texto. */
export async function collectCjsTests(): Promise<string[]> {
  const files: string[] = []
  for (const pattern of CJS_PATTERNS) {
    const glob = new Glob(pattern)
    for await (const file of glob.scan({ cwd: '.', absolute: false })) {
      files.push(file.replace(/\\/g, '/'))
    }
  }
  return files
}

/**
 * `.cjs` de teste neste repo vem em tres formas, e a extensao nao distingue nenhuma delas:
 *
 *   - `bun:test`  — precisa rodar sob `bun test`; sob `node` morre em "Cannot find module 'bun:test'"
 *   - `node:test` — runner embutido do node, roda sob `node`
 *   - script puro — asserta, imprime e chama `process.exit`; roda sob `node`
 *
 * Descoberto rodando: a primeira versao deste conserto mandava os quatro para o `node` e o
 * `hooks/state-md-hook.test.cjs` passou a falhar na suite. O teste novo pegou o erro do desenho.
 */
export function usesBunTest(source: string): boolean {
  return /from\s+['"]bun:test['"]|require\(\s*['"]bun:test['"]\s*\)/.test(source)
}

/**
 * Separa os `.cjs` por quem sabe roda-los. `readSource` e injetado para o teste nao depender do
 * disco.
 */
export function partitionCjs(
  files: string[],
  readSource: (file: string) => string,
): { bunTest: string[]; standalone: string[] } {
  const bunTest: string[] = []
  const standalone: string[] = []
  for (const file of files) {
    if (usesBunTest(readSource(file))) bunTest.push(file)
    else standalone.push(file)
  }
  return { bunTest, standalone }
}

/**
 * Um processo por arquivo, em sequencia. Juntar dois num processo so devolveria o bug original:
 * o `process.exit` do primeiro mataria os seguintes, em silencio e com codigo 0.
 */
export async function runStandalone(
  files: string[],
  spawn: (cmd: string[]) => Promise<number>,
): Promise<number[]> {
  const codes: number[] = []
  for (const file of files) {
    codes.push(await spawn(['node', file]))
  }
  return codes
}

/**
 * Divide os arquivos em lotes cuja linha de comando cabe no orcamento, preservando a ordem.
 * Arquivo isolado maior que o orcamento sai no proprio lote em vez de ser descartado — falhar ao
 * rodar e melhor que sumir em silencio da suite.
 *
 * @example chunkByCommandLength(['a.test.ts', 'b.test.ts'], ['bun', 'test'], 7500)
 */
export function chunkByCommandLength(files: string[], prefix: string[], budget: number): string[][] {
  const base = prefix.join(' ').length
  const chunks: string[][] = []
  let current: string[] = []
  let length = base

  for (const file of files) {
    const projected = length + 1 + file.length
    if (current.length > 0 && projected > budget) {
      chunks.push(current)
      current = [file]
      length = base + 1 + file.length
      continue
    }
    current.push(file)
    length = projected
  }

  if (current.length > 0) chunks.push(current)
  return chunks
}

/**
 * Primeiro codigo de falha, ou 0 se todo lote passou. Preserva o codigo original em vez de
 * normalizar para 1 — um lote que morreu por sinal nao e o mesmo que um lote com teste vermelho.
 *
 * @example aggregateExitCode([0, 3, 1]) // 3
 */
export function aggregateExitCode(codes: number[]): number {
  return codes.find((code) => code !== 0) ?? 0
}

/** Ordem do glob preservada de proposito: mudar a ordem muda quais arquivos compartilham processo. */
async function collectTestFiles(): Promise<string[]> {
  const files: string[] = []
  for (const pattern of PATTERNS) {
    const glob = new Glob(pattern)
    for await (const file of glob.scan({ cwd: '.', absolute: false })) {
      files.push(file)
    }
  }
  return files
}

if (import.meta.main) {
  const files = await collectTestFiles()

  // Os `.cjs` que usam bun:test entram nos MESMOS lotes; os demais rodam um processo cada, abaixo.
  const { bunTest: cjsBunTest, standalone } = partitionCjs(
    await collectCjsTests(),
    (f) => readFileSync(f, 'utf8'),
  )
  files.push(...cjsBunTest)

  if (files.length === 0) {
    console.error('No test files found.')
    process.exit(1)
  }

  const chunks = chunkByCommandLength(files, ['bun', 'test'], SPAWN_BUDGET)
  const codes: number[] = []

  for (const [index, chunk] of chunks.entries()) {
    if (chunks.length > 1) {
      console.log(`\n[run-tests] lote ${index + 1}/${chunks.length} — ${chunk.length} arquivos`)
    }
    const proc = Bun.spawn(['bun', 'test', ...chunk], { stdio: ['inherit', 'inherit', 'inherit'] })
    codes.push(await proc.exited)
  }

  if (standalone.length > 0) {
    console.log(`\n[run-tests] ${standalone.length} teste(s) standalone (.cjs) — um processo cada`)
    const standaloneCodes = await runStandalone(standalone, async (cmd) => {
      const proc = Bun.spawn(cmd, { stdio: ['inherit', 'inherit', 'inherit'] })
      return await proc.exited
    })
    standalone.forEach((file, i) => {
      if (standaloneCodes[i] !== 0) console.error(`[run-tests] FALHOU (exit ${standaloneCodes[i]}): ${file}`)
    })
    codes.push(...standaloneCodes)
  }

  const exitCode = aggregateExitCode(codes)

  if (chunks.length > 1) {
    const falharam = codes.filter((code) => code !== 0).length
    console.log(
      `\n[run-tests] ${files.length} arquivos em ${chunks.length} lotes — ` +
        (falharam === 0 ? 'todos verdes' : `${falharam} lote(s) com falha`),
    )
  }

  process.exit(exitCode)
}
