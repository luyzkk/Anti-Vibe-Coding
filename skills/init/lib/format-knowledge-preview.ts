// 2026-05-17 (Luiz/dev): RF10 — parser do INDEX.md + formato do preview (PRD §Could Haves, Plano 06 fase-05)
// M1.1 (2026-05-17): parseTopKeywords migrado para async (fs.promises) — elimina sync I/O no pipeline async.
import { promises as fs } from 'node:fs'
import { parseRailsAnchor } from './rails-anchor'

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
// 2026-08-18 (Luiz/dev): TODO.md #4 e #5 — a regex saiu daqui para `rails-anchor.ts`
// (era a segunda cópia; a outra vivia em detect-stack.ts) e o piso 7.1 virou constante.
// O piso é sobre a COBERTURA DO KNOWLEDGE, não sobre parsing de Gemfile — por isso mora
// aqui e não no util. A mensagem deriva das constantes: mexer no piso não deixa o texto mentindo.
export const MIN_SUPPORTED_RAILS_MAJOR = 7
export const MIN_SUPPORTED_RAILS_MINOR = 1

export function extractRailsVersionWarning(gemfileContent: string): string | null {
  const { major, minor } = parseRailsAnchor(gemfileContent)
  // Gemfile sem constraint de versão (`gem 'rails'`, git source) não permite julgar o piso.
  if (major === null || minor === null) return null
  const belowFloor =
    major < MIN_SUPPORTED_RAILS_MAJOR ||
    (major === MIN_SUPPORTED_RAILS_MAJOR && minor < MIN_SUPPORTED_RAILS_MINOR)
  if (belowFloor) {
    return `⚠️ Knowledge Rails cobre ${MIN_SUPPORTED_RAILS_MAJOR}.${MIN_SUPPORTED_RAILS_MINOR}+. Alguns padrões podem não se aplicar.`
  }
  return null
}
