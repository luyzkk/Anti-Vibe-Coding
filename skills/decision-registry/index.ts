// 2026-05-12 (Luiz/dev): D10 — aceita string posicional (v5.x) ou objeto rico ADRInput (v6)
// DI-02-01: imports relativos em skills/lib/ (um nivel acima), nao de anti-vibe-coding/lib/ (inexistente)
import { resolvePaths } from '../lib/path-resolver-v6'
import { writeADR, type ADRInput } from '../lib/adr-writer'
import { revoke as revokeAdr, type RevokeResult } from '../lib/decision-registry-revoke'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { renderCompletionSignal } from '../lib/completion-signal'

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
    // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal para orquestradores
    console.log('\n\n' + renderCompletionSignal({
      skill: 'decision-registry',
      status: 'complete',
      outputs: [result.filePath],
      next_suggested: null,
      blocks_for_user: [],
    }))
    return { ...result, layout: 'v6' }
  }

  // 2026-05-12 (Luiz/dev): legado — appenda em decisions.md raiz (mesmo padrao de fase-01 lessons-learned)
  // 2026-05-12 (Luiz/dev): sanitiza \n em title — security audit fase-02 (LOW):
  // title com newline quebra estrutura H2 do markdown legado e cria sub-headings espurias
  const safeTitle = opts.title.replace(/\r?\n/g, ' ')
  const legacyFile = path.join(paths.projectRoot, 'decisions.md')
  const line = `## ${new Date().toISOString().slice(0, 10)}: ${safeTitle}\n\n${opts.decision ?? '(detalhe aqui)'}\n`
  const existing = await readSafe(legacyFile)
  await fs.writeFile(
    legacyFile,
    existing ? existing + '\n' + line : `# Decisions\n\n${line}`,
    'utf-8',
  )
  // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal (layout legado)
  console.log('\n\n' + renderCompletionSignal({
    skill: 'decision-registry',
    status: 'complete',
    outputs: [legacyFile],
    next_suggested: null,
    blocks_for_user: [],
  }))
  return { filePath: legacyFile, id: null, layout: paths.layout }
}

/**
 * Revoga um ADR existente criando nova ADR superseded com link bidirecional.
 * ADR original NAO e deletada (CA-43, R14). Operacao nao-idempotente — segunda chamada cria ADR-NNNN+1.
 *
 * @param id - aceita: 1, '3', 'ADR-3', 'ADR-0003'
 * @param reason - Motivo da revogacao (obrigatorio)
 * @param projectRoot - Raiz do projeto (default: process.cwd())
 * @param opts - Opcoes opcionais: newSlug, newBody
 *
 * @example
 * const result = revoke(3, 'Replaced by simpler approach', '/my/project')
 * // result.superseded.id === 'ADR-0004'
 */
export function revoke(
  id: string | number,
  reason: string,
  projectRoot: string = process.cwd(),
  opts?: { newSlug?: string; newBody?: string },
): RevokeResult {
  // 2026-05-12 (Luiz/dev): D31 — roteamento --revoke para helper decision-registry-revoke (CA-43)
  return revokeAdr(projectRoot, id, { reason, ...opts })
}

async function readSafe(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf-8') } catch { return null }
}
