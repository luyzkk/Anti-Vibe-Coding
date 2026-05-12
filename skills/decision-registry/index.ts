// 2026-05-12 (Luiz/dev): D10 — aceita string posicional (v5.x) ou objeto rico ADRInput (v6)
// DI-02-01: imports relativos em skills/lib/ (um nivel acima), nao de anti-vibe-coding/lib/ (inexistente)
import { resolvePaths } from '../lib/path-resolver-v6'
import { writeADR, type ADRInput } from '../lib/adr-writer'
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Adiciona uma decisao ao registro do projeto.
 * Detecta automaticamente o layout (v6/v5/cru) e escreve no local adequado.
 *
 * Em v6: cria ADR-NNNN-{slug}.md em docs/design-docs/ (CA-15).
 * Em v5/cru: appenda em decisions.md raiz (formato legado, D10).
 *
 * @param arg - Titulo da decisao (string posicional v5.x) ou objeto ADRInput (v6)
 * @param projectRoot - Raiz do projeto (default: process.cwd())
 *
 * @example
 * // Forma posicional v5.x (D10 backward compat)
 * await add('Decidi usar TanStack Query em vez de useEffect')
 * // Forma rica v6
 * await add({ title: 'Adotar monorepo', context: '...', decision: '...', alternatives: ['Nx'] })
 */
export async function add(
  arg: string | ADRInput,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string; id: number | null; layout: 'v6' | 'v5' | 'cru' }> {
  // 2026-05-12 (Luiz/dev): normaliza string posicional v5 → ADRInput (D10 backward-compat)
  const opts: ADRInput = typeof arg === 'string' ? { title: arg } : arg

  const paths = await resolvePaths(projectRoot)

  if (paths.layout === 'v6') {
    // 2026-05-12 (Luiz/dev): v6 — usa designDocsDir de resolvePaths (DI-01-01, nao construir path manual)
    const result = await writeADR(paths.designDocsDir, opts)
    return { ...result, layout: 'v6' }
  }

  // 2026-05-12 (Luiz/dev): legado — appenda em decisions.md raiz (mesmo padrao de fase-01 lessons-learned)
  const legacyFile = path.join(paths.projectRoot, 'decisions.md')
  const line = `## ${new Date().toISOString().slice(0, 10)}: ${opts.title}\n\n${opts.decision ?? '(detalhe aqui)'}\n`
  const existing = await readSafe(legacyFile)
  await fs.writeFile(
    legacyFile,
    existing ? existing + '\n' + line : `# Decisions\n\n${line}`,
    'utf-8',
  )
  return { filePath: legacyFile, id: null, layout: paths.layout }
}

async function readSafe(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf-8') } catch { return null }
}
