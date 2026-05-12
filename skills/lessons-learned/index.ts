// 2026-05-12 (Luiz/dev): D10 — backward-compat com chamada posicional v5.x
// Assinatura union string | LessonOpts (Ambiguity 05-A1 resolvida)
// Em v6: escreve compound note em docs/compound/
// Em v5/cru: appenda em lessons-learned.md + injeta tip de migracao uma vez (Ambiguity 05-A2)
import { resolvePaths } from '../lib/path-resolver-v6'
import { writeCompoundNote, type CompoundNoteInput } from '../lib/compound-note-writer'
import { promises as fs } from 'node:fs'
import { renderCompletionSignal } from '../lib/completion-signal'

export type LessonAddInput = CompoundNoteInput

/**
 * Adiciona uma licao aprendida ao projeto.
 * Detecta automaticamente o layout (v6/v5/cru) e escreve no local adequado.
 *
 * @param arg - Titulo da licao (string posicional v5.x) ou objeto com opcoes v6
 * @param projectRoot - Raiz do projeto (default: process.cwd())
 *
 * @example
 * // Forma posicional v5.x (D10 backward compat)
 * await add('Race condition em session refresh')
 * // Forma rica v6
 * await add({ title: 'Bug X', category: 'bug', tags: ['producao'] })
 */
export async function add(
  arg: string | LessonAddInput,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string; layout: 'v6' | 'v5' | 'cru' }> {
  // 2026-05-12 (Luiz/dev): normaliza string posicional v5 → opts v6 (Ambiguity 05-A1)
  const opts: LessonAddInput = typeof arg === 'string' ? { title: arg } : arg

  const paths = await resolvePaths(projectRoot)

  if (paths.layout === 'v6') {
    const { filePath } = await writeCompoundNote(paths.compoundDir, opts)
    // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal para orquestradores
    console.log('\n\n' + renderCompletionSignal({
      skill: 'lessons-learned',
      status: 'complete',
      outputs: [filePath],
      next_suggested: null,
      blocks_for_user: [],
    }))
    return { filePath, layout: 'v6' }
  }

  // 2026-05-12 (Luiz/dev): G2 — projeto v5 ou cru → appenda em lessons-learned.md + tip de migracao (Ambiguity 05-A2)
  // Tip injetado UMA vez (idempotencia via checagem existing.includes('<!-- Tip:'))
  const tip = '\n<!-- Tip: rode /anti-vibe-coding:init para migrar para layout v6 (docs/compound/) -->\n'
  const line = formatLegacyLessonLine(opts)
  const existing = await readSafe(paths.legacyLessonsFile)
  const body = existing
    ? existing + '\n' + line + (existing.includes('<!-- Tip:') ? '' : tip)
    : `# Lessons Learned\n\n${line}${tip}`
  await fs.writeFile(paths.legacyLessonsFile, body, 'utf-8')
  // 2026-05-12 (Luiz/dev): D33/CA-47 — emite completion signal (layout legado)
  console.log('\n\n' + renderCompletionSignal({
    skill: 'lessons-learned',
    status: 'complete',
    outputs: [paths.legacyLessonsFile],
    next_suggested: null,
    blocks_for_user: [],
  }))
  return { filePath: paths.legacyLessonsFile, layout: paths.layout }
}

async function readSafe(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf-8') } catch { return null }
}

function formatLegacyLessonLine(opts: LessonAddInput): string {
  const date = opts.createdISO ?? new Date().toISOString().slice(0, 10)
  return `## ${date}: ${opts.title}\n\n${opts.body ?? '(detalhe aqui)'}\n`
}
