// 2026-05-17 (Luiz/dev): RF10 — parser do INDEX.md + formato do preview (PRD §Could Haves, Plano 06 fase-05)
// M1.1 (2026-05-17): parseTopKeywords migrado para async (fs.promises) — elimina sync I/O no pipeline async.
import { promises as fs } from 'node:fs'

// G3 deste plano: top-N = 8 mantém output scanable; lista completa polui (~14 átomos × 5 keywords = 70).
// 2026-05-17 (Luiz/dev): Wave 5 CS3 — exportar constante elimina magic number em SKILL.md Step 3 e callers.
export const TOP_N_KEYWORDS = 8 as const

/**
 * Parses the top-N keywords from the INDEX.md keyword table.
 *
 * Supports both PT-BR ("## Por keyword") and EN ("## By keyword") section headers.
 * PT-BR is used by Rails and Node-TS matrices; EN is used by the Next.js matrix per D15.
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

  // 2026-05-25 (Luiz/dev): aceitar 'By keyword' (EN) alem de 'Por keyword' (PT-BR) — RF-11 do PRD next-stack + G9 do README Plano 03.
  // Backward compat: regex (?:Por|By) preserva matching para Rails/Node-TS INDEX PT-BR existentes.
  const sectionMatch = content.match(/##\s+(?:Por|By)\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i)
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

// 2026-05-18 (Luiz/dev): RF11 — warning quando Gemfile declara Rails <7.1
// Razão: PRD CA-04 + D23 (risk resolution pre-exec) — knowledge cobre 7.1+
const RAILS_VERSION_RX = /^\s*gem\s+['"]rails['"]\s*,\s*['"][~^>=<]*\s*(\d+)\.(\d+)/m

export function extractRailsVersionWarning(gemfileContent: string): string | null {
  const m = RAILS_VERSION_RX.exec(gemfileContent)
  if (!m) return null
  const major = Number(m[1])
  const minor = Number(m[2])
  if (major < 7 || (major === 7 && minor < 1)) {
    return '⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar.'
  }
  return null
}
