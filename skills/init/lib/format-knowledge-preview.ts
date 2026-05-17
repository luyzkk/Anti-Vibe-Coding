// 2026-05-17 (Luiz/dev): RF10 — parser do INDEX.md + formato do preview (PRD §Could Haves, Plano 06 fase-05)
// M1.1 (2026-05-17): parseTopKeywords migrado para async (fs.promises) — elimina sync I/O no pipeline async.
import { promises as fs } from 'node:fs'

// G3 deste plano: top-N = 8 mantém output scanable; lista completa polui (~14 átomos × 5 keywords = 70).
// 2026-05-17 (Luiz/dev): Wave 5 CS3 — exportar constante elimina magic number em SKILL.md Step 3 e callers.
export const TOP_N_KEYWORDS = 8 as const

/**
 * Parses the top-N keywords from the INDEX.md "Por keyword" table.
 *
 * @param indexPath - Absolute path to INDEX.md.
 * @param topN - How many keywords to return. `topN <= 0` returns `[]` immediately.
 *   Values above 50 are clamped to 50 to avoid unbounded output (sane upper limit).
 *   Default: `TOP_N_KEYWORDS` (8).
 */
export async function parseTopKeywords(indexPath: string, topN: number = TOP_N_KEYWORDS): Promise<string[]> {
  if (topN <= 0) return []
  const clampedTopN = Math.min(topN, 50)

  let content: string
  try {
    content = await fs.readFile(indexPath, 'utf-8')
  } catch {
    return []
  }

  // Localizar seção "## Por keyword" e parsear tabela markdown subsequente
  const sectionMatch = content.match(/##\s+Por\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i)
  if (!sectionMatch || sectionMatch[1] === undefined) return []

  const sectionBody: string = sectionMatch[1]
  const keywords: string[] = []

  // Cada linha da tabela: | keyword1, keyword2, ... | [atom](path) |
  // Filtramos header (| Keyword | Átomos |) e separador (|---|---|)
  const tableRows = sectionBody.split('\n').filter((line) => {
    const trimmed = line.trim()
    return trimmed.startsWith('|') && !trimmed.startsWith('|---') && !trimmed.toLowerCase().includes('keyword |')
  })

  for (const row of tableRows) {
    const cells = row
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean)
    if (cells.length < 2) continue
    const firstCell = cells[0]
    if (firstCell === undefined) continue
    const cellKeywords = firstCell
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    keywords.push(...cellKeywords)
  }

  // Dedup preservando ordem; primeiros N (clamped)
  const seen = new Set<string>()
  const result: string[] = []
  for (const kw of keywords) {
    if (!seen.has(kw)) {
      seen.add(kw)
      result.push(kw)
      if (result.length >= clampedTopN) break
    }
  }

  return result
}

export function formatKnowledgePreview(keywords: string[]): string {
  if (keywords.length === 0) return ''
  return `Knowledge cobre: ${keywords.join(', ')}.`
}
