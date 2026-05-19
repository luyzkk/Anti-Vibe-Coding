// 2026-05-19 (Luiz/dev): helper leve para alimentar LLM no /execute-plan —
// lista *.md recursivamente com amostra de 100 linhas. Sem classificacao, sem regex Akita.
// Plano 03 fase-01.

import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Entrada minima do manifest leve. Sem classificacao — apenas amostra do conteudo
 * para a LLM no momento do /execute-plan decidir associacao com docs canonicos.
 *
 * `first100Lines` e uma string com no maximo 100 linhas separadas por `\n`.
 * Trunca o conteudo do arquivo apos a 100a quebra de linha (mid-line se necessario).
 */
export type DiscoveryManifestEntry = {
  /** Path relativo ao cwd, sempre forward-slash (posix), nunca backslash. */
  readonly path: string
  /** Tamanho em bytes (UTF-8). */
  readonly size: number
  /** Primeiras 100 linhas do arquivo, ou conteudo inteiro se menor. */
  readonly first100Lines: string
}

export type DiscoveryManifestLightResult = {
  readonly cwd: string
  readonly scannedAt: string
  readonly entries: ReadonlyArray<DiscoveryManifestEntry>
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  'out',
  '_legacy', // 2026-05-19 (Luiz/dev): backup pre-mutacao do Step 10 (Plano 02 fase-03)
])

function takeFirst100Lines(content: string): string {
  let count = 0
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      count++
      if (count === 100) return content.slice(0, i + 1)
    }
  }
  return content
}

async function walkMarkdownFiles(cwd: string): Promise<string[]> {
  const found: string[] = []

  async function walk(dir: string): Promise<void> {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return // permission denied / inexistente — ignora silenciosamente
    }
    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(abs)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        found.push(abs)
      }
    }
  }

  await walk(cwd)
  return found
}

/**
 * Lista todos os `*.md` em `cwd` (recursivo) com amostra das 100 primeiras linhas.
 * NAO classifica nada. NAO aplica regex Akita. Apenas materia bruta para a LLM consumir.
 *
 * Performance: greenfield (0 docs) < 50ms; 100 docs < 500ms. Sequencial em v1.
 * Exclusoes fixas: node_modules, .git, dist, build, .next, coverage, .turbo, out, _legacy.
 */
export async function discoveryManifestLight(cwd: string): Promise<DiscoveryManifestLightResult> {
  const absPaths = await walkMarkdownFiles(cwd)
  const entries: DiscoveryManifestEntry[] = []

  for (const abs of absPaths) {
    let content: string
    try {
      content = await fs.readFile(abs, 'utf-8')
    } catch {
      continue // arquivo desaparece entre readdir e readFile — ignora
    }
    const rel = path.relative(cwd, abs).replace(/\\/g, '/')
    entries.push({
      path: rel,
      size: Buffer.byteLength(content, 'utf-8'),
      first100Lines: takeFirst100Lines(content),
    })
  }

  // Ordenacao deterministica — importante para testes e diff de PR review
  entries.sort((a, b) => a.path.localeCompare(b.path))

  return {
    cwd,
    scannedAt: new Date().toISOString(),
    entries,
  }
}
