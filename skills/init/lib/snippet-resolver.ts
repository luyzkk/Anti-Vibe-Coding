// 2026-05-18 (Luiz/dev): resolve {{include: ./path.md}} markers em conteudo markdown.
// Step 10 (apply-merge-destructive) foi removido no Plano 01 fase-03; este helper ficou orfao.
// DI-1: marcadores usam caminhos relativos com ./; baseDir eh a pasta do skeleton.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const INCLUDE_REGEX = /\{\{include:\s*([^}]+?)\s*\}\}/g

/**
 * Resolve todos os marcadores {{include: ./path.md}} no conteudo,
 * substituindo cada um pelo conteudo do arquivo referenciado.
 * Caminhos sao resolvidos relativos a baseDir.
 */
export async function resolveSnippetIncludes(content: string, baseDir: string): Promise<string> {
  const matches = [...content.matchAll(INCLUDE_REGEX)]
  if (matches.length === 0) return content

  let result = content
  for (const match of matches) {
    const relPath = match[1]
    if (relPath === undefined) continue
    const absPath = path.resolve(baseDir, relPath)
    const snippetContent = await fs.readFile(absPath, 'utf8')
    result = result.replace(match[0], snippetContent)
  }

  return result
}
