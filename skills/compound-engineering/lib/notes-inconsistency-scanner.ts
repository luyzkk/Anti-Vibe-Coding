// 2026-05-24 (Luiz/dev): scan notas brownfield — CA-14 + RNF-04 (NAO reescreve)
// DI-fase04-api-real: parseFrontmatter retorna { ok: false, errors: ReadonlyArray<string> }
// (plural, array) — nao { ok: false, error: string }. Ajustado vs spec original.
// DI-fase04-api-real: campos extras (date/author/decision) nao aparecem em fm.data tipado
// (CompoundFrontmatter e fixo). Legacy fields detectados via raw frontmatter regex.
import { listCompoundFiles } from './compound-files-collector'
import { parseFrontmatter, FRONTMATTER_RE } from './compound-frontmatter'
import { promises as fs } from 'node:fs'

export type NoteIssueType =
  | 'missing-title'
  | 'missing-category'
  | 'missing-tags'
  | 'missing-created'
  | 'legacy-field-date'
  | 'legacy-field-author'
  | 'legacy-field-decision'
  | 'invalid-frontmatter'

export type NoteIssue = {
  path: string // path absoluto retornado por listCompoundFiles
  type: NoteIssueType
  detail?: string
}

/**
 * Escaneia notas em `docs/compound/` e retorna lista de inconsistencias detectadas.
 *
 * NAO modifica nenhum arquivo — RNF-04. Apenas leitura.
 *
 * @param targetRoot - Diretório raiz do projeto consumidor
 * @returns Array de NoteIssue (pode conter multiplos issues por nota)
 */
export async function scanNotesInconsistencies(targetRoot: string): Promise<NoteIssue[]> {
  const issues: NoteIssue[] = []
  const files = await listCompoundFiles(targetRoot)

  for (const file of files) {
    const body = await fs.readFile(file, 'utf-8')
    const fm = parseFrontmatter(body)

    if (!fm.ok) {
      // 2026-05-24 (Luiz/dev): API real usa fm.errors (array), nao fm.error (string)
      issues.push({ path: file, type: 'invalid-frontmatter', detail: fm.errors.join('; ') })
      continue
    }

    // Verificar campos canonicos ausentes
    if (!fm.data.title) issues.push({ path: file, type: 'missing-title' })
    if (!fm.data.category) issues.push({ path: file, type: 'missing-category' })
    if (!fm.data.tags || fm.data.tags.length === 0) issues.push({ path: file, type: 'missing-tags' })
    if (!fm.data.created) issues.push({ path: file, type: 'missing-created' })

    // 2026-05-24 (Luiz/dev): campos legacy nao aparecem em fm.data — verificar via raw frontmatter
    // parseFrontmatter so retorna ok:true quando todos os 4 canonicos estao validos;
    // campos extras sao aceitos mas descartados do tipo. Usamos raw para detectar legacy.
    const rawMatch = body.match(FRONTMATTER_RE)
    if (rawMatch) {
      const raw = rawMatch[1] ?? ''
      if (/^date\s*:/m.test(raw)) issues.push({ path: file, type: 'legacy-field-date' })
      if (/^author\s*:/m.test(raw)) issues.push({ path: file, type: 'legacy-field-author' })
      if (/^decision\s*:/m.test(raw)) issues.push({ path: file, type: 'legacy-field-decision' })
    }
  }

  return issues
}
