// 2026-05-17 (Luiz/dev): RF10 — parser do INDEX.md + formato do preview (PRD §Could Haves, Plano 06 fase-05)
import { existsSync, readFileSync } from 'node:fs'

// G3 deste plano: top-N = 8 mantém output scanable; lista completa polui (~14 átomos × 5 keywords = 70).
// 2026-05-17 (Luiz/dev): Wave 5 CS3 — exportar constante elimina magic number em SKILL.md Step 3 e callers.
export const TOP_N_KEYWORDS = 8 as const

export function parseTopKeywords(indexPath: string, topN: number = TOP_N_KEYWORDS): string[] {
  if (!existsSync(indexPath)) return []

  const content = readFileSync(indexPath, 'utf-8')

  // Localizar seção "## Por keyword" e parsear tabela markdown subsequente
  const sectionMatch = content.match(/##\s+Por\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i)
  if (!sectionMatch) return []

  const sectionBody = sectionMatch[1]
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
    const cellKeywords = cells[0]
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    keywords.push(...cellKeywords)
  }

  // Dedup preservando ordem; primeiros N
  const seen = new Set<string>()
  const result: string[] = []
  for (const kw of keywords) {
    if (!seen.has(kw)) {
      seen.add(kw)
      result.push(kw)
      if (result.length >= topN) break
    }
  }

  return result
}

export function formatKnowledgePreview(keywords: string[]): string {
  if (keywords.length === 0) return ''
  return `Knowledge cobre: ${keywords.join(', ')}.`
}
