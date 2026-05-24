// 2026-05-11 (Luiz/dev): coleta arquivos compound "vivos" — exclui _archived/ (G9 do Plano 04)
// e README.md (sentinel de pasta). Reusado por compound-check.ts e por skills CRUD em Plano 06.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const COMPOUND_DIR_REL = path.join('docs', 'compound')
const ARCHIVED_SEGMENT = '_archived'
const SKIP_NAMES = new Set(['README.md', 'index.md'])

/**
 * Lista todos os arquivos `.md` em `docs/compound/` (recursivo) que sao compound notes ativas.
 *
 * Exclui:
 * - `_archived/` (e qualquer subpasta abaixo dele) — convencao de soft-delete (D31, Plano 06)
 * - `README.md` e `index.md` em qualquer nivel — sentinels
 *
 * @returns Array de paths absolutos. Vazio se `docs/compound/` nao existe ou nao tem arquivos validos.
 *          NUNCA lanca — se diretorio nao existe, retorna `[]` (defensivo).
 *
 * @example
 * const files = await listCompoundFiles('/path/to/project')
 * // => ['/path/to/project/docs/compound/2026-05-12-foo.md']
 */
export async function listCompoundFiles(root: string): Promise<string[]> {
  const baseDir = path.join(root, COMPOUND_DIR_REL)
  return collectMarkdown(baseDir)
}

async function collectMarkdown(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => null)
  // Diretorio nao existe. Defensivo: nao lanca.
  if (entries === null) return []

  const results = await Promise.all(
    entries.map(async (entry) => {
      const name = String(entry.name)
      if (entry.isDirectory()) {
        if (name === ARCHIVED_SEGMENT) return [] as string[]
        return collectMarkdown(path.join(dir, name))
      }
      if (!entry.isFile()) return [] as string[]
      if (!name.endsWith('.md')) return [] as string[]
      if (SKIP_NAMES.has(name)) return [] as string[]
      return [path.join(dir, name)]
    }),
  )

  return results.flat()
}
