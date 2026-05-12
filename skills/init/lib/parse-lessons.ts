// 2026-05-11 (Luiz/dev): parser do lessons-learned.md heterogeneo (formato A + B).
// Retorna LessonEntry[] estruturado para migrator gerar compound notes.
// Plano 03 fase-04 — Migration v5 → v6.

export type LessonEntry = {
  /** Titulo limpo, sem data ou [tag]. */
  title: string
  /** YYYY-MM-DD inferido (header H2) ou fallback do mtime. */
  date: string
  /** Categoria — H2 'CORRIGIDO' / tag [Armadilha] / H1 do bloco. */
  category: string
  /** Conteudo raw do bloco (para corpo do compound note). */
  body: string
  /** Tags inferidas (palavras-chave do title + categoria). */
  tags: string[]
  /** Linha do header (debug). */
  sourceLine: number
}

const RE_H2_DATE = /^## (\d{4}-\d{2}-\d{2}):\s*(.+?)(?:\s*\(.*\))?$/   // ## 2026-03-23: titulo
const RE_H2_SECTION = /^## (.+)$/                                       // ## Licoes — Anti-Vibe v5.2
const RE_H3_CATEGORY = /^### \[([^\]]+)\]\s*(.+)$/                      // ### [Armadilha] titulo
const RE_H3_PLAIN = /^### (.+)$/                                        // ### titulo plano

/**
 * Detecta entries em um lessons-learned.md heterogeneo.
 * - Bloco inicia em ## ou ### com pattern reconhecido.
 * - Corpo vai ate proximo H2/H3 do mesmo nivel.
 *
 * @example
 * const entries = parseLessons(fileContent, '2026-05-11')
 * // entries[0].title === 'hooks.json overwrite bug'
 */
export function parseLessons(body: string, fallbackDate: string): LessonEntry[] {
  const lines = body.split(/\r?\n/)
  const entries: LessonEntry[] = []

  let current: LessonEntry | null = null
  let buffer: string[] = []

  const flush = (): void => {
    if (current) {
      current.body = buffer.join('\n').trim()
      entries.push(current)
    }
    current = null
    buffer = []
  }

  let inSectionLooseFormat = false  // dentro de "## Licoes — Anti-Vibe X" sem dates por entry

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // H2 com data → formato A
    let m = RE_H2_DATE.exec(line)
    if (m) {
      flush()
      const date = m[1]!
      const title = stripCorrigido(m[2]!.trim())
      const category = inferCategoryFromContent(title) ?? 'Plugin Development'
      current = mkEntry(title, date, category, [], i)
      inSectionLooseFormat = false
      continue
    }

    // H2 sem data → secao de agregacao (ex: "## Licoes — Anti-Vibe Coding v5.2")
    m = RE_H2_SECTION.exec(line)
    if (m && !RE_H2_DATE.test(line)) {
      flush()
      inSectionLooseFormat = true
      continue
    }

    // H3 com [Categoria] → formato B
    m = RE_H3_CATEGORY.exec(line)
    if (m) {
      flush()
      const category = m[1]!.trim()
      const title = m[2]!.trim()
      // Em formato B, date herda fallback (mtime ou today).
      current = mkEntry(title, fallbackDate, category, [], i)
      continue
    }

    // H3 plano dentro de secao loose
    m = RE_H3_PLAIN.exec(line)
    if (m && inSectionLooseFormat) {
      flush()
      const title = m[1]!.trim()
      current = mkEntry(title, fallbackDate, 'Plugin Development', [], i)
      continue
    }

    // Linha de corpo
    if (current) {
      buffer.push(line)
    }
  }
  flush()

  // Auto-tag a partir de title + category.
  for (const e of entries) {
    e.tags = inferTags(e)
  }

  return entries
}

function mkEntry(title: string, date: string, category: string, tags: string[], sourceLine: number): LessonEntry {
  return { title, date, category, tags, body: '', sourceLine }
}

function stripCorrigido(s: string): string {
  return s.replace(/\s*\((CORRIGIDO|FIXADO|RESOLVED)\)\s*$/i, '').trim()
}

function inferCategoryFromContent(title: string): string | null {
  // Heuristica: 'bug' no titulo → Bug; 'hook' → Plugin Development; etc.
  if (/bug|crash|falha/i.test(title)) return 'Bug'
  if (/hook|skill|plugin/i.test(title)) return 'Plugin Development'
  return null
}

function inferTags(entry: LessonEntry): string[] {
  const tokens = new Set<string>()
  // Categoria como tag.
  tokens.add(entry.category.toLowerCase().replace(/\s+/g, '-'))
  // Palavras de 4+ chars do titulo.
  for (const word of entry.title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 4 && !STOP.has(word)) tokens.add(word)
  }
  return Array.from(tokens).slice(0, 6)
}

const STOP = new Set([
  'para', 'quando', 'esta', 'sera', 'essa', 'esse', 'mais', 'sobre', 'pelos',
  'with', 'when', 'this', 'that', 'from', 'into', 'over',
])
