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

import { Glob } from 'bun'

/**
 * Teto de chars por linha de comando spawnada. O limite observado fica entre 8.098 e 8.131;
 * a folga cobre o binario resolvido por PATH (`bun` vira caminho absoluto) e o quoting do Windows.
 */
export const SPAWN_BUDGET = 7500

const PATTERNS = ['tests/**/*.test.{ts,tsx}', 'skills/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}']

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
