// 2026-05-11 (Luiz/dev): inferencia de {date, slug, kind} a partir de paths .planning/.
// Sem isso, regex inline no migrator vira pesadelo de testar.

import path from 'node:path'

export type PlanningEntryKind =
  | 'context-file'        // .planning/CONTEXT-foo.md
  | 'plan-folder-prd'     // .planning/2026-04-21-foo/PRD.md
  | 'plan-folder-plan'    // .planning/2026-04-21-foo/PLAN.md
  | 'plan-folder-context' // .planning/2026-04-21-foo/CONTEXT.md
  | 'plan-folder-state'   // .planning/2026-04-21-foo/STATE.md
  | 'plan-folder-summary' // .planning/2026-04-21-foo/SUMMARY*.md
  | 'subplan-readme'      // .planning/2026-04-21-foo/plano01/README.md
  | 'subplan-fase'        // .planning/2026-04-21-foo/plano01/fase-01-x.md
  | 'subplan-memory'      // .planning/2026-04-21-foo/plano01/MEMORY.md
  | 'unknown'

export type PlanningEntry = {
  kind: PlanningEntryKind
  /** YYYY-MM-DD inferido (do folder name) — null se context-file solto sem data. */
  date: string | null
  /** slug do plano (sem date prefix). */
  slug: string
  /** Path relativo a .planning/ (ex: 'plano01/fase-02.md'). */
  relPath: string
  /** Subplan identifier ('plano01', 'plano02', ...) — null se nao for subplan. */
  subplan: string | null
  /** Filename base sem extensao (util para destino). */
  basename: string
}

const RE_DATE_SLUG_FOLDER = /^(\d{4}-\d{2}-\d{2})-(.+)$/
const RE_CONTEXT_FILE = /^CONTEXT-(.+)\.md$/i
const RE_SUBPLAN_FOLDER = /^plano(\d+)$/i
const RE_FASE_FILE = /^fase-\d+/i

/**
 * Classifica um path relativo a `.planning/` em uma PlanningEntry.
 * `relPath` deve ser relativo a `.planning/` (ex: "2026-04-21-foo/plano01/fase-01.md").
 * G3: normaliza separadores Windows/POSIX antes de processar.
 */
export function parsePlanningEntry(relPath: string): PlanningEntry {
  // G3: normaliza para separador do OS — path.relative pode usar '\' no Windows,
  // mas fixtures em testes passam '/'. Normalizar garante split correto.
  const normalized = relPath.split(/[\\/]/).filter(Boolean)
  const basename = path.basename(relPath, path.extname(relPath))

  // Top-level: CONTEXT-foo.md
  if (normalized.length === 1) {
    const m = RE_CONTEXT_FILE.exec(normalized[0]!)
    if (m) {
      return {
        kind: 'context-file',
        date: null,
        slug: m[1]!,
        relPath,
        subplan: null,
        basename,
      }
    }
    return { kind: 'unknown', date: null, slug: basename, relPath, subplan: null, basename }
  }

  // Pasta com prefixo de data: 2026-04-21-foo/...
  const folderMatch = RE_DATE_SLUG_FOLDER.exec(normalized[0]!)
  if (!folderMatch) {
    return { kind: 'unknown', date: null, slug: normalized[0]!, relPath, subplan: null, basename }
  }
  const date = folderMatch[1]!
  const slug = folderMatch[2]!

  // Top-level dentro do plano: PRD/PLAN/CONTEXT/STATE/SUMMARY
  if (normalized.length === 2) {
    const file = normalized[1]!
    if (/^PRD\.md$/i.test(file))      return mkEntry('plan-folder-prd', date, slug, relPath, null, basename)
    if (/^PLAN\.md$/i.test(file))     return mkEntry('plan-folder-plan', date, slug, relPath, null, basename)
    if (/^CONTEXT\.md$/i.test(file))  return mkEntry('plan-folder-context', date, slug, relPath, null, basename)
    if (/^STATE\.md$/i.test(file))    return mkEntry('plan-folder-state', date, slug, relPath, null, basename)
    if (/^SUMMARY.*\.md$/i.test(file)) return mkEntry('plan-folder-summary', date, slug, relPath, null, basename)
    return mkEntry('unknown', date, slug, relPath, null, basename)
  }

  // Subplan: plano01/...
  const subplanMatch = RE_SUBPLAN_FOLDER.exec(normalized[1]!)
  if (subplanMatch) {
    const subplan = normalized[1]!
    const file = normalized[2]!
    if (/^README\.md$/i.test(file))  return mkEntry('subplan-readme', date, slug, relPath, subplan, basename)
    if (/^MEMORY\.md$/i.test(file))  return mkEntry('subplan-memory', date, slug, relPath, subplan, basename)
    if (RE_FASE_FILE.test(file))     return mkEntry('subplan-fase', date, slug, relPath, subplan, basename)
    return mkEntry('unknown', date, slug, relPath, subplan, basename)
  }

  return mkEntry('unknown', date, slug, relPath, null, basename)
}

function mkEntry(
  kind: PlanningEntryKind,
  date: string | null,
  slug: string,
  relPath: string,
  subplan: string | null,
  basename: string,
): PlanningEntry {
  return { kind, date, slug, relPath, subplan, basename }
}
